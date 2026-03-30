"""Pydantic schemas for bookmark responses"""

from datetime import datetime

from pydantic import BaseModel


class BookmarkResponse(BaseModel):
    """Response after bookmarking/unbookmarking"""
    
    message: str
    bookmarked: bool


class BookmarkDetail(BaseModel):
    """Detailed bookmark information"""
    
    model_config = {"from_attributes": True}
    
    id: str
    opportunity_id: str
    user_id: str
    created_at: datetime
