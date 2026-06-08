from datetime import datetime, timedelta
from typing import Any, Optional
import jwt
from passlib.context import CryptContext
from app.core.config import settings
from app.models.refresh_token import RefreshToken
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # default 7 days
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def store_refresh_token(db: AsyncSession, user_id: int, token: str, expires_at: datetime) -> RefreshToken:
    rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at, revoked=False)
    db.add(rt)
    await db.commit()
    await db.refresh(rt)
    return rt

async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    stmt = update(RefreshToken).where(RefreshToken.token == token).values(revoked=True)
    await db.execute(stmt)
    await db.commit()

async def get_valid_refresh_token(db: AsyncSession, token: str) -> Optional[RefreshToken]:
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == token, RefreshToken.revoked == False))
    return result.scalars().first()
