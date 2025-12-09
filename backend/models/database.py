"""SQLAlchemy database models."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum


Base = declarative_base()


class RequestStatus(str, enum.Enum):
    """Status of a voice request."""
    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    EXECUTED = "executed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MessageType(str, enum.Enum):
    """Type of message to send."""
    SMS = "sms"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    SLACK = "slack"


class User(Base):
    """User model (single user for MVP)."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    requests = relationship("Request", back_populates="user")


class Request(Base):
    """Voice request/conversation turn."""

    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Audio & Transcription
    audio_url = Column(String(500), nullable=True)  # S3 or local path
    transcript = Column(Text, nullable=False)

    # Agent Response
    agent_response = Column(Text, nullable=False)
    agent_action = Column(JSON, nullable=True)  # Proposed action details

    # TTS
    tts_audio_url = Column(String(500), nullable=True)

    # Status
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Metadata
    metadata = Column(JSON, nullable=True)  # LangSmith trace ID, etc.

    # Relationships
    user = relationship("User", back_populates="requests")
    messages = relationship("Message", back_populates="request")


class Message(Base):
    """Messages sent via the agent."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)

    # Message details
    message_type = Column(Enum(MessageType), nullable=False)
    recipient = Column(String(255), nullable=False)  # Phone, email, Slack user/channel
    recipient_name = Column(String(100), nullable=True)  # Resolved from contacts
    subject = Column(String(500), nullable=True)  # For emails
    body = Column(Text, nullable=False)

    # External IDs
    external_id = Column(String(255), nullable=True)  # Twilio SID, Gmail message ID, etc.

    # Status
    status = Column(String(50), default="pending")  # pending, sent, failed
    error = Column(Text, nullable=True)

    # Timestamps
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Metadata
    metadata = Column(JSON, nullable=True)

    # Relationships
    request = relationship("Request", back_populates="messages")
