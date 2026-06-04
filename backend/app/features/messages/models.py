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
    """Conversation between users — either a DM (is_group=False with user1/user2)
    or a group chat (is_group=True with rows in conversation_members)."""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    # Nullable for groups — for DMs they're still required.
    user1_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    user2_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    status = Column(
        Enum(ConversationStatus),
        default=ConversationStatus.PENDING,
        nullable=False
    )
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Group-only fields. ``is_group`` distinguishes from DMs; ``name`` and
    # ``avatar_url`` are how a group identifies itself in the UI.
    is_group = Column(Boolean, default=False, nullable=False)
    name = Column(String(120), nullable=True)
    avatar_url = Column(String(1000), nullable=True)

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    members = relationship(
        "ConversationMember",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class ConversationMember(Base):
    """Group-chat membership. DMs do not have rows here — their participants
    are encoded directly on the Conversation's user1_id/user2_id."""
    __tablename__ = "conversation_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False, default="member")  # "admin" | "member"
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User")


class Message(Base):
    """Message model for storing individual messages in conversations."""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    media_id = Column(String(36), ForeignKey("media.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    media = relationship("Media", foreign_keys=[media_id])


class MessageReaction(Base):
    """Message reaction model for storing emoji reactions to messages."""
    __tablename__ = "message_reactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String(10), nullable=False)  # Emoji character
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")


class BlockedUser(Base):
    """Model for tracking blocked users."""
    __tablename__ = "blocked_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    blocker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    blocker = relationship("User", foreign_keys=[blocker_id])
    blocked = relationship("User", foreign_keys=[blocked_id])


class MutedConversation(Base):
    """Model for tracking muted conversations."""
    __tablename__ = "muted_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    conversation = relationship("Conversation")
