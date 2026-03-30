"""Pydantic schemas for comment requests and responses"""

from datetime import datetime

from pydantic import BaseModel, Field


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
    created_at: datetime


class CommentList(BaseModel):
    """List of comments"""
    
    comments: list[CommentPublic]
    total: int
