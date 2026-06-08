from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import MessageCreate, MessageResponse
from app.services.conversation_service import conversation_service

router = APIRouter()

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_in: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> ConversationResponse:
    """
    Create a new conversation for the current user.
    """
    return await conversation_service.create_conversation(
        db=db, user_id=current_user.id, conversation_data=conversation_in
    )

@router.get("/", response_model=List[ConversationResponse])
async def get_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> List[ConversationResponse]:
    """
    Retrieve all conversations for the current user.
    """
    return await conversation_service.get_conversations(db=db, user_id=current_user.id)

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> ConversationResponse:
    """
    Retrieve a specific conversation along with its messages.
    """
    return await conversation_service.get_conversation_by_id(
        db=db, conversation_id=conversation_id, user_id=current_user.id
    )

@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_message_to_conversation(
    conversation_id: UUID,
    message_in: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> MessageResponse:
    """
    Add a new message to a specific conversation.
    """
    # Verify the conversation exists and belongs to the current user
    await conversation_service.get_conversation_by_id(
        db=db, conversation_id=conversation_id, user_id=current_user.id
    )
    
    # Add the message
    return await conversation_service.add_message(
        db=db, conversation_id=conversation_id, message_data=message_in
    )
