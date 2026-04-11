"""Draft schemas for validation"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class DraftCreate(BaseModel):
    """Schema for creating a draft"""
    title: str = Field(default="", max_length=255)
    description: str = Field(default="")
    type: str = Field(default="problem", pattern="^(problem|idea|improvement)$")
    category: str = Field(default="", max_length=100)
    link: Optional[str] = None


class DraftUpdate(BaseModel):
    """Schema for updating a draft"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    type: Optional[str] = Field(None, pattern="^(problem|idea|improvement)$")
    category: Optional[str] = Field(None, max_length=100)
    link: Optional[str] = None


class DraftPublic(BaseModel):
    """Schema for draft response"""
    id: str
    title: str
    description: str
    type: str
    category: str
    link: Optional[str] = None
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DraftList(BaseModel):
    """Schema for list of drafts"""
    drafts: list[DraftPublic]
    total: int
