"""Likes feature module - User likes on opportunities"""

from app.features.likes.models import OpportunityLike
from app.features.likes.schemas import LikeResponse, LikeStatus

__all__ = ["OpportunityLike", "LikeResponse", "LikeStatus"]
