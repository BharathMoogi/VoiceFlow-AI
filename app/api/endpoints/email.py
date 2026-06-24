import logging
from typing import Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.schemas.email import EmailCreate, EmailResponse, EmailGenerateRequest, EmailSendResponse
from app.services.ai_service import ai_service
from app.services.email_service import email_service
from app.services.mail_service import mail_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=EmailResponse, status_code=status.HTTP_201_CREATED)
async def create_email(
    email_in: EmailCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> EmailResponse:
    """
    Create a new email for the current user.
    """
    return await email_service.create_email(
        db=db, user_id=current_user.id, email_data=email_in
    )

@router.get("/", response_model=List[EmailResponse])
async def get_emails(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> List[EmailResponse]:
    """
    Retrieve all emails for the current user.
    """
    return await email_service.get_user_emails(db=db, user_id=current_user.id)

@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> EmailResponse:
    """
    Retrieve a specific email by ID.
    """
    return await email_service.get_email_by_id(
        db=db, email_id=email_id, user_id=current_user.id
    )

@router.post("/generate", response_model=Dict[str, str])
async def generate_email(
    request: EmailGenerateRequest,
    current_user: User = Depends(deps.get_current_active_user)
) -> Dict[str, str]:
    """
    Generate an email subject and body using AI based on a prompt.
    """
    return await ai_service.generate_email(
        prompt=request.prompt,
        user_name=current_user.full_name,
        user_email=current_user.email
    )


@router.post(
    "/{email_id}/send",
    response_model=EmailSendResponse,
    summary="Send a draft email via SMTP",
    description=(
        "Load a draft email by ID, verify ownership, send it via SMTP, "
        "and mark its status as 'sent'. Returns a confirmation response."
    ),
)
async def send_email(
    email_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> EmailSendResponse:
    """
    Send a saved draft email.

    **Flow:**
    1. Load the email from the database and verify it belongs to the current user.
    2. Guard against resending (409 if already sent).
    3. Validate that the draft has a recipient address.
    4. Dispatch via SMTP using `MailService`.
    5. Persist status change to `'sent'` in the database.
    6. Return a structured confirmation response.
    """
    # Step 1 & 2 — Load draft + ownership check + status guard (404 / 409)
    email_draft = await email_service.send_email_draft(
        db=db,
        email_id=email_id,
        user_id=current_user.id,
    )

    # Step 3 — Validate recipient is present
    if not email_draft.recipient or not email_draft.recipient.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "This draft has no recipient address. "
                "Please update the draft with a valid recipient before sending."
            ),
        )

    # Step 4 — Send via SMTP (raises 400 / 502 / 503 / 500 on failure)
    logger.info(
        "User %s: sending email %s to '%s'",
        current_user.id,
        email_id,
        email_draft.recipient,
    )

    try:
        await mail_service.send_email(
            recipient=email_draft.recipient,
            subject=email_draft.subject,
            body=email_draft.body,
            attachments=email_draft.attachments,
        )
    except HTTPException:
        # SMTP failed — roll back status to 'draft' so the user can retry
        await email_service.update_email_status(
            db=db, email_id=email_id, status_value="draft"
        )
        raise

    # Step 5 & 6 — Status already persisted as 'sent' by send_email_draft;
    # build and return the confirmation response.
    logger.info("User %s: email %s sent successfully.", current_user.id, email_id)

    return EmailSendResponse(
        email_id=email_draft.id,
        recipient=email_draft.recipient,
        subject=email_draft.subject,
        status=email_draft.status,
        message="Email sent successfully.",
    )
