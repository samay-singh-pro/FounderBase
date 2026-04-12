"""Follow database model"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, UniqueConstraint, CheckConstraint, Integer, DateTime, ForeignKeyConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


class Follow(Base):
    """
    User follow relationships.
    
    follower_id: The user who is following
    followee_id: The user being followed
    
    Enforces unique constraint: one user can only follow another user once.
    """
    
    __tablename__ = "follows"
    
    __table_args__ = (
        # Data integrity
        UniqueConstraint('follower_id', 'followee_id', name='unique_follower_followee'),
        CheckConstraint('follower_id!=followee_id', name='check_no_self_follow'),
        
        # Cascade delete: remove follows when user is deleted
        ForeignKeyConstraint(
            ['follower_id'], 
            ['users.id'], 
            ondelete='CASCADE',
            name='fk_follows_follower'
        ),
        ForeignKeyConstraint(
            ['followee_id'], 
            ['users.id'], 
            ondelete='CASCADE',
            name='fk_follows_followee'
        ),
        
        # Performance indexes for common queries
        Index('idx_follower_created', 'follower_id', 'created_at'),  # "Who is User X following?"
        Index('idx_followee_created', 'followee_id', 'created_at'),  # "Who follows User X?"
    )

    # UUID primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Foreign keys to users table
    follower_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    followee_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<Follow(follower={self.follower_id}, followee={self.followee_id})>"
