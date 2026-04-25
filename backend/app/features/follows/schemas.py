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
    is_following: bool = False


class FollowingPublic(BaseModel):
    """Public schema for a following user with user details"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    username: str
    email: str
    followed_at: datetime
    is_following: bool = True


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


class SuggestedUserPublic(BaseModel):
    """Public schema for a suggested user to follow"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    username: str
    email: str


class SuggestedUsersResponse(BaseModel):
    """Response schema for suggested users with pagination"""
    users: list[SuggestedUserPublic]
    total: int
    page: int
    limit: int
