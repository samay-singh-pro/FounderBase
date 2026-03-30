"""Bookmarks feature module - User bookmarks on opportunities"""

from app.features.bookmarks.models import OpportunityBookmark
from app.features.bookmarks.schemas import BookmarkResponse

__all__ = ["OpportunityBookmark", "BookmarkResponse"]
