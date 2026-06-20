from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class ContactBase(BaseModel):
    name: str
    phone: str
    status: Optional[str] = "active"

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

class ContactResponse(ContactBase):
    id: UUID
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
