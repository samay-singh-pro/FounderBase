"""User database model"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

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

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
