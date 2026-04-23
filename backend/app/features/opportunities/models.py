"""Opportunity database model"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.connection import Base

if TYPE_CHECKING:
    from app.features.likes.models import OpportunityLike


class Opportunity(Base):
    """
    User-submitted opportunity (problem, idea, or improvement).
    
    Design for future extensibility:
    - Likes: Create OpportunityLike table (opportunity_id, user_id, unique constraint)
    - Comments: Create Comment table (opportunity_id, user_id, text, parent_id for threading)
    - AI: Add fields like ai_score, ai_tags, ai_summary
    - Tags: Many-to-many via OpportunityTag junction table
    - Status: Expand with workflow (created → reviewed → approved → in_progress → completed)
    - Votes: Add upvote_count, downvote_count fields
    """
    
    __tablename__ = "opportunities"

    # UUID for better scalability and security
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Optional URL link
    
    # User reference
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="created", nullable=False, index=True)
    
    # Relationships
    likes: Mapped[list["OpportunityLike"]] = relationship("OpportunityLike", back_populates="opportunity", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Opportunity(id={self.id}, title={self.title[:30]}, type={self.type})>"
