"""Message and Conversation Pydantic schemas."""
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from typing import Optional, Any


# ============================================================================
# Message Schemas
# ============================================================================

class MessageBase(BaseModel):
    """Base message schema."""
    content: str = Field(..., min_length=1, max_length=5000)


class MessageCreate(MessageBase):
    """Schema for creating a message."""
    conversation_id: str


class MessageResponse(MessageBase):
    """Schema for message response."""
    id: str
    conversation_id: str
    sender_id: str
    is_read: bool
    is_pinned: bool = False
    is_deleted: bool = False
    created_at: datetime
    reactions: list['ReactionResponse'] = []

    @model_validator(mode='before')
    @classmethod
    def extract_reactions(cls, data: Any) -> Any:
        """Extract reactions from transient attribute if present."""
        if hasattr(data, '_reaction_counts'):
            # Convert SQLAlchemy model to dict
            result = {
                'id': data.id,
                'content': data.content,
                'conversation_id': data.conversation_id,
                'sender_id': data.sender_id,
                'is_read': data.is_read,
                'is_pinned': data.is_pinned,
                'is_deleted': data.is_deleted,
                'created_at': data.created_at,
                'reactions': data._reaction_counts
            }
            return result
        return data

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if not v.isoformat().endswith('Z') else v.isoformat()
        }


class MessageMarkRead(BaseModel):
    """Schema for marking message as read."""
    is_read: bool = True


class ReactionCreate(BaseModel):
    """Schema for creating a reaction."""
    emoji: str = Field(..., min_length=1, max_length=10)


class ReactionResponse(BaseModel):
    """Schema for reaction count response."""
    emoji: str
    count: int


# ============================================================================
# Conversation Schemas
# ============================================================================

class ConversationBase(BaseModel):
    """Base conversation schema."""
    pass


class ConversationCreate(BaseModel):
    """Schema for creating a conversation."""
    recipient_id: str


class ConversationStart(BaseModel):
    """Schema for creating a conversation and optionally sending the first message."""
    recipient_id: str
    message: Optional[str] = Field(None, min_length=1, max_length=5000)


class ConversationResponse(BaseModel):
    """Schema for conversation response."""
    id: str
    user1_id: str
    user2_id: str
    status: str
    created_by_id: str
    created_at: datetime
    updated_at: datetime
    
    # Additional fields for UI
    other_user_id: Optional[str] = None
    other_user_username: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: Optional[int] = 0
    is_muted: Optional[bool] = False
    is_blocked: Optional[bool] = False
    is_blocked_by_me: Optional[bool] = False
    is_blocked_by_them: Optional[bool] = False

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v and not v.isoformat().endswith('Z') else (v.isoformat() if v else None)
        }


class ConversationWithMessages(ConversationResponse):
    """Schema for conversation with messages."""
    messages: list[MessageResponse] = []

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v and not v.isoformat().endswith('Z') else (v.isoformat() if v else None)
        }


class ConversationAccept(BaseModel):
    """Schema for accepting a conversation."""
    accept: bool = True


class ConversationDecline(BaseModel):
    """Schema for declining a conversation."""
    decline: bool = True


# ============================================================================
# Block and Mute Schemas
# ============================================================================

class BlockUserResponse(BaseModel):
    """Schema for block user response."""
    blocked: bool
    blocked_user_id: str
    message: str


class MuteConversationResponse(BaseModel):
    """Schema for mute conversation response."""
    muted: bool
    conversation_id: str
    message: str
