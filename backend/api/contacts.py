"""Contact management endpoints."""

from fastapi import APIRouter, HTTPException, status
from typing import List

from backend.models.schemas import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
)
from backend.services.contacts import get_contact_service

router = APIRouter()


@router.get("/contacts", response_model=ContactListResponse)
async def list_contacts():
    """Get all contacts."""
    contact_service = get_contact_service()
    all_contacts = contact_service.list_all_contacts()

    return ContactListResponse(
        contacts=[ContactResponse(name=c["name"], **{k: v for k, v in c.items() if k != "name"}) for c in all_contacts],
        total=len(all_contacts)
    )


@router.get("/contacts/{name}", response_model=ContactResponse)
async def get_contact(name: str):
    """Get a specific contact by name."""
    contact_service = get_contact_service()
    contact = contact_service.get_contact(name)

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact '{name}' not found"
        )

    return ContactResponse(**contact)


@router.post("/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(contact: ContactCreate):
    """Create a new contact."""
    contact_service = get_contact_service()

    # Check if contact already exists
    if contact_service.get_contact(contact.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Contact '{contact.name}' already exists"
        )

    # Validate at least one contact method
    if not any([contact.sms, contact.whatsapp, contact.email,
                contact.slack_user_id, contact.slack_channel]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one contact method (phone/email/Slack) is required"
        )

    # Add contact
    contact_data = contact.model_dump(exclude={"name"}, exclude_none=True)
    success = contact_service.add_contact(contact.name, contact_data)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create contact"
        )

    return ContactResponse(name=contact.name, **contact_data)


@router.put("/contacts/{name}", response_model=ContactResponse)
async def update_contact(name: str, contact: ContactUpdate):
    """Update an existing contact."""
    contact_service = get_contact_service()

    # Check if contact exists
    existing = contact_service.get_contact(name)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact '{name}' not found"
        )

    # Update contact
    update_data = contact.model_dump(exclude_none=True)
    success = contact_service.update_contact(name, update_data)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update contact"
        )

    # Return updated contact
    updated = contact_service.get_contact(name)
    return ContactResponse(**updated)


@router.delete("/contacts/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(name: str):
    """Delete a contact."""
    contact_service = get_contact_service()

    success = contact_service.delete_contact(name)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact '{name}' not found"
        )

    return None


@router.get("/contacts/search/{query}", response_model=List[ContactResponse])
async def search_contacts(query: str):
    """Search contacts by name or full_name."""
    contact_service = get_contact_service()
    results = contact_service.search_contacts(query)

    return [ContactResponse(name=c["name"], **{k: v for k, v in c.items() if k != "name"}) for c in results]
