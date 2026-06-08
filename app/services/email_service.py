from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.models.email import Email
from app.schemas.email import EmailCreate

class EmailService:
    """
    Service for handling operations related to Emails.
    """
    
    @staticmethod
    async def create_email(
        db: AsyncSession, user_id: int, email_data: EmailCreate
    ) -> Email:
        """
        Create a new email record for a specific user.
        
        Args:
            db (AsyncSession): The database session.
            user_id (int): The ID of the user creating the email.
            email_data (EmailCreate): The data for the new email.
            
        Returns:
            Email: The newly created Email model.
        """
        db_obj = Email(
            user_id=user_id,
            recipient=email_data.recipient,
            subject=email_data.subject,
            body=email_data.body
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_user_emails(
        db: AsyncSession, user_id: int
    ) -> List[Email]:
        """
        Retrieve all emails for a specific user, ordered by creation time descending.
        
        Args:
            db (AsyncSession): The database session.
            user_id (int): The ID of the user.
            
        Returns:
            List[Email]: A list of Email models belonging to the user.
        """
        result = await db.execute(
            select(Email)
            .where(Email.user_id == user_id)
            .order_by(Email.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_email_by_id(
        db: AsyncSession, email_id: UUID, user_id: int
    ) -> Optional[Email]:
        """
        Retrieve a specific email by ID, ensuring it belongs to the requesting user.
        
        Args:
            db (AsyncSession): The database session.
            email_id (UUID): The ID of the email.
            user_id (int): The ID of the user requesting the email.
            
        Returns:
            Email: The requested Email model.
            
        Raises:
            HTTPException: If the email is not found or doesn't belong to the user.
        """
        result = await db.execute(
            select(Email).where(Email.id == email_id, Email.user_id == user_id)
        )
        email = result.scalars().first()
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
            
        return email

    @staticmethod
    async def update_email_status(
        db: AsyncSession, email_id: UUID, status_value: str
    ) -> Email:
        """
        Update the status of an existing email.
        
        Args:
            db (AsyncSession): The database session.
            email_id (UUID): The ID of the email to update.
            status_value (str): The new status string (e.g., 'sent', 'failed').
            
        Returns:
            Email: The updated Email model.
            
        Raises:
            HTTPException: If the email is not found.
        """
        result = await db.execute(select(Email).where(Email.id == email_id))
        email = result.scalars().first()
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
            
        email.status = status_value
        await db.commit()
        await db.refresh(email)
        return email

    @staticmethod
    async def send_email_draft(
        db: AsyncSession,
        email_id: UUID,
        user_id: int,
    ) -> Email:
        """
        Load a draft email, verify ownership, mark it as 'sent', and return it.

        Ownership verification and status transition are handled here so the
        endpoint only needs to call MailService and this method.

        Args:
            db:       AsyncSession database session.
            email_id: UUID of the email to send.
            user_id:  ID of the requesting user (ownership check).

        Returns:
            The updated Email model with status='sent'.

        Raises:
            HTTPException 404: Email not found or doesn't belong to the user.
            HTTPException 409: Email has already been sent (status != 'draft').
        """
        from fastapi import HTTPException, status as http_status

        result = await db.execute(
            select(Email).where(Email.id == email_id, Email.user_id == user_id)
        )
        email = result.scalars().first()

        if not email:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Email not found or you do not have permission to send it.",
            )

        if email.status == "sent":
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="This email has already been sent.",
            )

        email.status = "sent"
        await db.commit()
        await db.refresh(email)
        return email

email_service = EmailService()
