"""Pydantic schemas for comment requests and responses"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_serializer
from typing import Any


class CommentCreate(BaseModel):
    """Schema for creating a new comment"""
    
    content: str = Field(
        min_length=2,
        max_length=500,
        description="Comment content"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "content": "This is a great idea! I'd love to collaborate on this project."
                }
            ]
        }
    }


class CommentUpdate(BaseModel):
    """Schema for updating a comment"""
    
    content: str = Field(
        min_length=2,
        max_length=500,
        description="Updated comment content"
    )


class CommentPublic(BaseModel):
    """Public comment data (response schema)"""
    
    model_config = {"from_attributes": True}
    
    id: str
    content: str
    opportunity_id: str
    user_id: str
    username: str = Field(default="", description="Username of the commenter")
    created_at: datetime
    is_owner: bool = Field(default=False, description="Whether the current user owns this comment")
    
    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime, _info: Any) -> str:
        """Serialize datetime to ISO format with UTC timezone"""
        if dt.tzinfo is None:
            # If timezone-naive, assume it's UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class CommentList(BaseModel):
    """List of comments"""
    
    comments: list[CommentPublic]
    total: int
