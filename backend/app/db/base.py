"""Database base classes and utilities"""

from app.db.connection import Base

# Import all models here to ensure they're registered with Base
# This is important for Base.metadata.create_all() to work
from app.features.auth.models import User
from app.features.bookmarks.models import OpportunityBookmark
from app.features.comments.models import Comment
from app.features.follows.models import Follow
from app.features.likes.models import OpportunityLike
from app.features.opportunities.models import Opportunity
from app.features.messages.models import Conversation, Message

__all__ = ["Base", "User", "Opportunity", "Comment", "OpportunityLike", "OpportunityBookmark", "Follow", "Conversation", "Message"]
