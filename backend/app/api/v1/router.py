"""API v1 Router - Aggregates all feature routers

This module brings together all feature routers for API version 1.
Adding a new feature is as simple as importing and including its router.
"""

from fastapi import APIRouter

from app.features.auth.router import router as auth_router
from app.features.bookmarks.router import router as bookmarks_router
from app.features.comments.router import router as comments_router
from app.features.likes.router import router as likes_router
from app.features.opportunities.router import router as opportunities_router

# Create API v1 router
api_router = APIRouter(prefix="/api/v1")

# Include all feature routers
api_router.include_router(auth_router)
api_router.include_router(opportunities_router)
api_router.include_router(comments_router)
api_router.include_router(likes_router)
api_router.include_router(bookmarks_router)

