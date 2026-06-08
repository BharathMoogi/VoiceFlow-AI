from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class MessageBase(BaseModel):
    content: str
    sender: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: UUID
    conversation_id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True
