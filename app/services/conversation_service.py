from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate
from app.schemas.message import MessageCreate

class ConversationService:
    """
    Service for handling operations related to Conversations and Messages.
    """
    
    @staticmethod
    async def create_conversation(
        db: AsyncSession, user_id: int, conversation_data: ConversationCreate
    ) -> Conversation:
        """
        Create a new conversation for a specific user.
        
        Args:
            db (AsyncSession): The database session.
            user_id (int): The ID of the user creating the conversation.
            conversation_data (ConversationCreate): The data for the new conversation.
            
        Returns:
            Conversation: The newly created Conversation model.
        """
        db_obj = Conversation(
            user_id=user_id,
            title=conversation_data.title
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_conversations(
        db: AsyncSession, user_id: int
    ) -> List[Conversation]:
        """
        Retrieve all conversations for a specific user, ordered by most recently updated.
        
        Args:
            db (AsyncSession): The database session.
            user_id (int): The ID of the user.
            
        Returns:
            List[Conversation]: A list of Conversation models belonging to the user.
        """
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_conversation_by_id(
        db: AsyncSession, conversation_id: UUID, user_id: int
    ) -> Optional[Conversation]:
        """
        Retrieve a specific conversation by ID, ensuring it belongs to the requesting user.
        Eagerly loads the associated messages.
        
        Args:
            db (AsyncSession): The database session.
            conversation_id (UUID): The ID of the conversation.
            user_id (int): The ID of the user requesting the conversation.
            
        Returns:
            Conversation: The requested Conversation model.
            
        Raises:
            HTTPException: If the conversation is not found or doesn't belong to the user.
        """
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        conversation = result.scalars().first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        return conversation

    @staticmethod
    async def add_message(
        db: AsyncSession, conversation_id: UUID, message_data: MessageCreate
    ) -> Message:
        """
        Add a new message to an existing conversation.
        
        Args:
            db (AsyncSession): The database session.
            conversation_id (UUID): The ID of the conversation.
            message_data (MessageCreate): The data for the new message.
            
        Returns:
            Message: The newly created Message model.
        """
        # First verify the conversation exists
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalars().first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Create message
        db_msg = Message(
            conversation_id=conversation_id,
            sender=message_data.sender,
            content=message_data.content
        )
        db.add(db_msg)
        
        # Touch conversation updated_at (Optional but good practice)
        from datetime import datetime, timezone
        conversation.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(db_msg)
        return db_msg

conversation_service = ConversationService()
