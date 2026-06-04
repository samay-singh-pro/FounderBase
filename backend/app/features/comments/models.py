"""Comment database model"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.connection import Base

if TYPE_CHECKING:
    from app.features.media.models import Media


class Comment(Base):
    """
    User comments on opportunities.
    
    Future enhancements:
    - Nested comments/replies (add parent_id field)
    - Edit history (add edited_at, edit_count fields)
    - Reactions/likes on comments
    - Flagging for moderation
    """
    
    __tablename__ = "comments"

    # UUID primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Comment content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # References
    opportunity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    # Optional single media attachment (image or gif)
    media_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("media.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    media: Mapped["Media | None"] = relationship("Media", foreign_keys=[media_id])

    def __repr__(self) -> str:
        return f"<Comment(id={self.id}, opportunity_id={self.opportunity_id}, user_id={self.user_id})>"
