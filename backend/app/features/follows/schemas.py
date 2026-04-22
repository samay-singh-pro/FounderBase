"""Pydantic schemas for follow feature"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FollowStatusResponse(BaseModel):
    """Response schema for follow status check"""
    is_following: bool


class FollowerPublic(BaseModel):
    """Public schema for a follower with user details"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    username: str
    email: str
    followed_at: datetime


class FollowingPublic(BaseModel):
    """Public schema for a following user with user details"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    username: str
    email: str
    followed_at: datetime


class FollowersListResponse(BaseModel):
    """Response schema for followers list with pagination"""
    followers: list[FollowerPublic]
    total: int
    page: int
    limit: int


class FollowingListResponse(BaseModel):
    """Response schema for following list with pagination"""
    following: list[FollowingPublic]
    total: int
    page: int
    limit: int
