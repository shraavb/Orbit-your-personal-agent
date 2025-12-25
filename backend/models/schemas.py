"""Pydantic schemas for API requests and responses."""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


class RequestStatus(str, Enum):
    """Status of a voice request."""
    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    EXECUTED = "executed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MessageType(str, Enum):
    """Type of message to send."""
    SMS = "sms"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    SLACK = "slack"


# Voice Request Schemas
class VoiceRequest(BaseModel):
    """Voice request from frontend."""
    audio_data: str  # Base64 encoded audio
    audio_format: str = "webm"  # webm, mp3, wav


class CharacterAlignment(BaseModel):
    """Character-level timing alignment for lip-sync."""
    characters: list[str]
    character_start_times_seconds: list[float]
    character_end_times_seconds: list[float]


class AgentAction(BaseModel):
    """Proposed action from the agent."""
    action_type: str  # "send_message", "schedule_event", etc.
    parameters: Dict[str, Any]
    confirmation_message: str


class VoiceResponse(BaseModel):
    """Response to voice request."""
    request_id: int
    transcript: str
    agent_response: str
    tts_audio_url: Optional[str] = None
    tts_alignment: Optional[CharacterAlignment] = None
    proposed_action: Optional[AgentAction] = None
    status: RequestStatus


# Confirmation Schemas
class ConfirmActionRequest(BaseModel):
    """User confirmation of proposed action."""
    request_id: int
    confirmed: bool
    modification: Optional[str] = None  # "Actually change it to..."


class ConfirmActionResponse(BaseModel):
    """Response after confirmation."""
    request_id: int
    status: RequestStatus
    message: str
    tts_audio_url: Optional[str] = None
    tts_alignment: Optional[CharacterAlignment] = None


# Message Schemas
class MessageCreate(BaseModel):
    """Create a new message."""
    message_type: MessageType
    recipient: str
    recipient_name: Optional[str] = None
    subject: Optional[str] = None
    body: str


class MessageResponse(BaseModel):
    """Message response."""
    id: int
    message_type: MessageType
    recipient: str
    recipient_name: Optional[str] = None
    subject: Optional[str] = None
    body: str
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# User Schemas
class UserResponse(BaseModel):
    """User response."""
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


# Request History Schemas
class RequestHistoryItem(BaseModel):
    """Single item in request history."""
    id: int
    transcript: str
    agent_response: str
    status: RequestStatus
    created_at: datetime
    messages: list[MessageResponse] = []

    class Config:
        from_attributes = True


# Contact Management Schemas
class ContactBase(BaseModel):
    """Base contact schema."""
    full_name: str = Field(..., min_length=1, max_length=100)
    sms: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")  # E.164 format
    whatsapp: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[EmailStr] = None
    slack_user_id: Optional[str] = Field(None, max_length=50)
    slack_channel: Optional[str] = Field(None, max_length=100)


class ContactCreate(ContactBase):
    """Schema for creating a contact."""
    name: str = Field(..., min_length=1, max_length=50,
                      description="Short name/alias for voice commands (e.g., 'Mom', 'John')")


class ContactUpdate(BaseModel):
    """Schema for updating a contact (all fields optional)."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    sms: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    whatsapp: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[EmailStr] = None
    slack_user_id: Optional[str] = Field(None, max_length=50)
    slack_channel: Optional[str] = Field(None, max_length=100)


class ContactResponse(ContactBase):
    """Schema for contact response."""
    name: str


class ContactListResponse(BaseModel):
    """Schema for listing contacts."""
    contacts: list[ContactResponse]
    total: int
