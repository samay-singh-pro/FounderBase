"""OpportunityLike database model"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


class OpportunityLike(Base):
    """
    User likes on opportunities.
    
    Enforces unique constraint: one user can only like an opportunity once.
    """
    
    __tablename__ = "opportunity_likes"
    
    # Composite unique constraint to prevent duplicate likes
    __table_args__ = (
        UniqueConstraint('opportunity_id', 'user_id', name='unique_opportunity_user_like'),
    )

    # UUID primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # References
    opportunity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<OpportunityLike(id={self.id}, opportunity_id={self.opportunity_id}, user_id={self.user_id})>"
