"""Pydantic schemas for user settings"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class FollowRequestPrivacyEnum(str, Enum):
    """Who can send follow requests"""
    ANYONE = "anyone"
    FOLLOWING_ONLY = "following_only"
    NONE = "none"


class MessageRequestPrivacyEnum(str, Enum):
    """Who can send message requests"""
    ANYONE = "anyone"
    FOLLOWING_ONLY = "following_only"
    NONE = "none"


class NotificationPreferenceEnum(str, Enum):
    """Notification preferences"""
    ALL = "all"
    FOLLOWING_ONLY = "following_only"
    NONE = "none"


class PrivacySettingsResponse(BaseModel):
    """Privacy settings response"""
    
    model_config = {"from_attributes": True}
    
    id: str
    user_id: str
    follow_request_privacy: FollowRequestPrivacyEnum
    message_request_privacy: MessageRequestPrivacyEnum
    hide_online_status: bool
    notification_preference: NotificationPreferenceEnum


class PrivacySettingsUpdate(BaseModel):
    """Update privacy settings"""
    
    follow_request_privacy: Optional[FollowRequestPrivacyEnum] = Field(None, description="Who can send you follow requests")
    message_request_privacy: Optional[MessageRequestPrivacyEnum] = Field(None, description="Who can send you message requests")
    hide_online_status: Optional[bool] = Field(None, description="Hide your online status and last seen")
    notification_preference: Optional[NotificationPreferenceEnum] = Field(None, description="Notification preferences")


class ChangePasswordRequest(BaseModel):
    """Change password request"""
    
    current_password: str = Field(description="Current password for verification")
    new_password: str = Field(min_length=8, description="New password (minimum 8 characters)")


class ChangeEmailRequest(BaseModel):
    """Change email request"""
    
    new_email: str = Field(description="New email address")
    password: str = Field(description="Current password for verification")


class ChangeUsernameRequest(BaseModel):
    """Change username request"""
    
    new_username: str = Field(min_length=3, max_length=50, description="New username (3-50 characters)")
    password: str = Field(description="Current password for verification")
