"""Auth business logic - Registration, login, password management"""

import bcrypt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.features.auth.models import User
from app.features.auth.schemas import UserCreate


def _hash_password(password: str) -> str:
    """Hash a password using bcrypt with salt"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against a hashed password"""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_user_by_email(db: Session, email: str) -> User | None:
    """
    Retrieve a user by email address.
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        User object if found, None otherwise
    """
    return db.scalars(select(User).where(User.email == email)).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """
    Retrieve a user by ID.
    
    Args:
        db: Database session
        user_id: User's ID
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    """
    Retrieve a user by username.
    
    Args:
        db: Database session
        username: User's username
        
    Returns:
        User object if found, None otherwise
    """
    return db.scalars(select(User).where(User.username == username)).first()


def register_user(db: Session, user_in: UserCreate) -> User:
    """
    Register a new user.
    
    Args:
        db: Database session
        user_in: User registration data
        
    Returns:
        Created User object
        
    Raises:
        HTTPException: If email or username already registered
    """
    # Check if email already exists
    if get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Check if username already exists
    if get_user_by_username(db, user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    
    # Create user
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=_hash_password(user_in.password),
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Future: Send verification email, trigger welcome notifications
    
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """
    Authenticate a user with email and password.
    
    Args:
        db: Database session
        email: User's email
        password: Plain text password
        
    Returns:
        User object if credentials valid, None otherwise
    """
    user = get_user_by_email(db, email)
    
    if user is None:
        return None
    
    if not _verify_password(password, user.hashed_password):
        return None
    
    return user
