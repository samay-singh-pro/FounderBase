"""Pydantic schemas for auth requests and responses"""

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration"""
    
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, description="Username (3-50 characters, alphanumeric and underscores)")
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "user@example.com",
                    "username": "john_doe",
                    "password": "securePassword123"
                }
            ]
        }
    }


class UserLogin(BaseModel):
    """Schema for user login"""
    
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    """Public user information (safe to expose)"""
    
    model_config = {"from_attributes": True}
    
    id: str
    email: EmailStr
    username: str


class Token(BaseModel):
    """JWT token response"""
    
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UserStats(BaseModel):
    """User statistics"""
    
    posts_count: int = Field(description="Total number of posts created")
    followers_count: int = Field(description="Number of followers")
    following_count: int = Field(description="Number of users following")
    total_likes: int = Field(description="Total likes received on all posts")
    bookmarks_count: int = Field(description="Number of bookmarked posts")
