"""User privacy and settings models"""

from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column
import uuid
import enum

from app.db.connection import Base


class FollowRequestPrivacy(str, enum.Enum):
    """Enum for who can send follow requests"""
    ANYONE = "anyone"
    FOLLOWING_ONLY = "following_only"
    NONE = "none"


class MessageRequestPrivacy(str, enum.Enum):
    """Enum for who can send message requests"""
    ANYONE = "anyone"
    FOLLOWING_ONLY = "following_only"
    NONE = "none"


class NotificationPreference(str, enum.Enum):
    """Enum for notification preferences"""
    ALL = "all"
    FOLLOWING_ONLY = "following_only"
    NONE = "none"


class UserPrivacySettings(Base):
    """
    User privacy and settings model.
    
    Controls privacy preferences like:
    - Who can follow you
    - Who can message you
    - Online status visibility
    - Notification preferences
    """
    
    __tablename__ = "user_privacy_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    
    # Privacy settings
    follow_request_privacy: Mapped[FollowRequestPrivacy] = mapped_column(
        Enum(FollowRequestPrivacy),
        default=FollowRequestPrivacy.ANYONE,
        nullable=False
    )
    message_request_privacy: Mapped[MessageRequestPrivacy] = mapped_column(
        Enum(MessageRequestPrivacy),
        default=MessageRequestPrivacy.ANYONE,
        nullable=False
    )
    hide_online_status: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Notification settings
    notification_preference: Mapped[NotificationPreference] = mapped_column(
        Enum(NotificationPreference),
        default=NotificationPreference.ALL,
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<UserPrivacySettings(user_id={self.user_id}, hide_online={self.hide_online_status})>"
