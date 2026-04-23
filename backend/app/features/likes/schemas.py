"""Pydantic schemas for like responses"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class LikeResponse(BaseModel):
    """Response after liking an opportunity"""
    
    message: str
    liked: bool
    total_likes: int


class LikeStatus(BaseModel):
    """Check if user has liked an opportunity"""
    
    opportunity_id: str
    is_liked: bool
    total_likes: int


class LikeDetail(BaseModel):
    """Detailed like information"""
    
    model_config = {"from_attributes": True}
    
    id: str
    opportunity_id: str
    user_id: str
    created_at: datetime


class LikedOpportunitiesResponse(BaseModel):
    """Response for user's liked opportunities"""
    
    opportunities: list[Any]  # List of opportunity objects
    total: int
