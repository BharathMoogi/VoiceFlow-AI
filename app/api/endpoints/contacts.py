import csv
import io
import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.services.contact_service import contact_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> ContactResponse:
    """
    Create a new contact.
    """
    return await contact_service.create_contact(
        db=db, user_id=current_user.id, contact_data=contact_in
    )

@router.get("/", response_model=List[ContactResponse])
async def get_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> List[ContactResponse]:
    """
    Retrieve all contacts for the current user.
    """
    return await contact_service.get_user_contacts(db=db, user_id=current_user.id)

@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> ContactResponse:
    """
    Retrieve a specific contact by ID.
    """
    return await contact_service.get_contact_by_id(
        db=db, contact_id=contact_id, user_id=current_user.id
    )

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> ContactResponse:
    """
    Update a contact's details.
    """
    return await contact_service.update_contact(
        db=db, contact_id=contact_id, user_id=current_user.id, contact_data=contact_in
    )

@router.delete("/{contact_id}", response_model=ContactResponse)
async def delete_contact(
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> ContactResponse:
    """
    Delete a contact by ID.
    """
    return await contact_service.delete_contact(
        db=db, contact_id=contact_id, user_id=current_user.id
    )

@router.post("/upload", response_model=List[ContactResponse])
async def upload_contacts(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> List[ContactResponse]:
    """
    Upload a CSV file of contacts, parse name and phone columns, and save to the database.
    """
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
        
    csv_file = io.StringIO(text)
    reader = csv.DictReader(csv_file)
    
    name_key = None
    phone_key = None
    status_key = None
    
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must have headers."
        )
        
    for field in reader.fieldnames:
        norm = field.strip().lower()
        if norm in ['name', 'fullname', 'full_name']:
            name_key = field
        elif norm in ['phone', 'phonenumber', 'phone_number', 'telephone']:
            phone_key = field
        elif norm in ['status']:
            status_key = field
            
    if not name_key or not phone_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must contain 'name' (or 'fullname'/'full_name') and 'phone' (or 'phonenumber'/'phone_number') columns."
        )
        
    imported_contacts = []
    for row in reader:
        name = row.get(name_key)
        phone = row.get(phone_key)
        status_val = row.get(status_key, "active") if status_key else "active"
        
        if name and phone:
            name = name.strip()
            phone = phone.strip()
            if name and phone:
                contact_in = ContactCreate(name=name, phone=phone, status=status_val)
                contact = await contact_service.create_contact(
                    db=db, user_id=current_user.id, contact_data=contact_in
                )
                imported_contacts.append(contact)
                
    return imported_contacts

