"""Message and Conversation models."""
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db.base import Base


class ConversationStatus(str, enum.Enum):
    """Conversation status enum."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Conversation(Base):
    """Conversation model for storing chat conversations between two users."""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user1_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(
        Enum(ConversationStatus),
        default=ConversationStatus.PENDING,
        nullable=False
    )
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Message model for storing individual messages in conversations."""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
