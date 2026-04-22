"""User database model"""

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
import uuid

from app.db.connection import Base


class User(Base):
    """
    User model for authentication and authorization.
    
    Future enhancements:
    - Add profile fields (name, avatar, bio)
    - Add email verification status
    - Add OAuth provider info
    - Add role/permissions
    """
    
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"
