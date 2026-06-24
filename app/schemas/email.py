from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class EmailBase(BaseModel):
    recipient: str
    subject: str
    body: str
    attachments: Optional[List[Dict[str, Any]]] = None

class EmailCreate(EmailBase):
    pass

class EmailResponse(EmailBase):
    id: UUID
    user_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class EmailGenerateRequest(BaseModel):
    prompt: str
    recipient: Optional[str] = None


class TranscribeAndGenerateResponse(BaseModel):
    """Full pipeline response: transcript → AI email → saved draft."""
    transcript: str
    email_id: UUID
    subject: str
    body: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EmailSendResponse(BaseModel):
    """Response returned after successfully sending a draft email."""
    email_id: UUID
    recipient: str
    subject: str
    status: str
    message: str = "Email sent successfully."

    model_config = {"from_attributes": True}
