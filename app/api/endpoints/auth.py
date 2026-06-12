from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps

from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken
from app.schemas.token import Token
from app.schemas.user import UserCreate
from app.schemas.auth import (
    RefreshTokenRequest,
    LogoutRequest,
    VerifyEmailRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
)

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Token:
    """Authenticate user and return access & refresh tokens."""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(user.id, expires_delta=access_expires)
    refresh_token = security.create_refresh_token(user.id, expires_delta=refresh_expires)

    await security.store_refresh_token(
        db, user.id, refresh_token, datetime.utcnow() + refresh_expires
    )
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)) -> Token:
    """Compatibility endpoint forwarding to access-token logic."""
    return await login_access_token(db=db, form_data=form_data)

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(deps.get_current_active_user),
) -> dict:
    """Return profile info for the currently authenticated user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name or current_user.email,
        "is_active": current_user.is_active,
    }

@router.post("/register", response_model=Token)
async def register(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
) -> Token:
    """Create a new user, send verification email, and return access token."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    hashed_password = security.get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=user_in.is_active if user_in.is_active is not None else True,
        is_superuser=user_in.is_superuser if user_in.is_superuser is not None else False,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    verification_token = str(uuid.uuid4())
    ev = EmailVerificationToken(
        user_id=db_user.id,
        token=verification_token,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(ev)
    await db.commit()
    print(f"Email verification link: {settings.EMAIL_VERIFICATION_URL}?token={verification_token}")

    access_token = security.create_access_token(
        db_user.id, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(access_token=access_token, token_type="bearer")

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    rt = await security.get_valid_refresh_token(db, refresh_req.refresh_token)
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or revoked refresh token")
    access_token = security.create_access_token(
        rt.user_id, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh = security.create_refresh_token(rt.user_id)
    await security.revoke_refresh_token(db, rt.token)
    await security.store_refresh_token(
        db, rt.user_id, new_refresh, datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        refresh_token=new_refresh,
        token_type="bearer",
    )

@router.post("/logout")
async def logout(
    logout_req: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await security.revoke_refresh_token(db, logout_req.refresh_token)
    return {"msg": "Successfully logged out"}

@router.post("/verify-email")
async def verify_email(
    verify_req: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token == verify_req.token,
            EmailVerificationToken.used == False,
            EmailVerificationToken.expires_at > datetime.utcnow(),
        )
    )
    ev_token = result.scalars().first()
    if not ev_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    ev_token.used = True
    result_user = await db.execute(select(User).where(User.id == ev_token.user_id))
    user = result_user.scalars().first()
    if user:
        user.email_verified = True
    await db.commit()
    return {"msg": "Email verified successfully"}

@router.post("/password-reset/request")
async def password_reset_request(
    req: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token_str = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    prt = PasswordResetToken(user_id=user.id, token=token_str, expires_at=expires_at)
    db.add(prt)
    await db.commit()
    print(f"Password reset link: {settings.EMAIL_VERIFICATION_URL.replace('verify-email', 'reset-password')}?token={token_str}")
    return {"msg": "Password reset email sent (mock)"}

@router.post("/password-reset/confirm")
async def password_reset_confirm(
    req: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == req.token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow(),
        )
    )
    prt = result.scalars().first()
    if not prt:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user_res = await db.execute(select(User).where(User.id == prt.user_id))
    user = user_res.scalars().first()
    if user:
        user.hashed_password = security.get_password_hash(req.new_password)
    prt.used = True
    await db.commit()
    return {"msg": "Password has been reset"}
