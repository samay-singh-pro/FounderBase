"""Pydantic schemas for stats responses"""

from pydantic import BaseModel


class CategoryStat(BaseModel):
    """Category with opportunity count"""
    category: str
    count: int


class TrendingCategoriesResponse(BaseModel):
    """Response for trending categories"""
    categories: list[CategoryStat]


class ActiveUser(BaseModel):
    """Active user with contribution count"""
    id: str
    username: str
    email: str
    avatar_url: str | None = None
    posts_count: int


class ActiveUsersResponse(BaseModel):
    """Response for active users"""
    users: list[ActiveUser]
