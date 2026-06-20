from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate

class ContactService:
    """
    Service for handling CRUD operations related to Contacts.
    """
    
    @staticmethod
    async def create_contact(
        db: AsyncSession, user_id: int, contact_data: ContactCreate
    ) -> Contact:
        db_obj = Contact(
            user_id=user_id,
            name=contact_data.name,
            phone=contact_data.phone,
            status=contact_data.status
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_user_contacts(
        db: AsyncSession, user_id: int
    ) -> List[Contact]:
        result = await db.execute(
            select(Contact)
            .where(Contact.user_id == user_id)
            .order_by(Contact.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_contact_by_id(
        db: AsyncSession, contact_id: UUID, user_id: int
    ) -> Optional[Contact]:
        result = await db.execute(
            select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
        )
        contact = result.scalars().first()
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )
        return contact

    @staticmethod
    async def update_contact(
        db: AsyncSession, contact_id: UUID, user_id: int, contact_data: ContactUpdate
    ) -> Contact:
        contact = await ContactService.get_contact_by_id(db, contact_id, user_id)
        
        update_data = contact_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
            
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def delete_contact(
        db: AsyncSession, contact_id: UUID, user_id: int
    ) -> Contact:
        contact = await ContactService.get_contact_by_id(db, contact_id, user_id)
        await db.delete(contact)
        await db.commit()
        return contact

contact_service = ContactService()
