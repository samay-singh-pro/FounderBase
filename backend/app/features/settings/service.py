"""Settings service layer"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.features.settings.models import UserPrivacySettings
from app.features.settings.schemas import PrivacySettingsUpdate
from app.features.auth.models import User
from app.core.security import verify_password, get_password_hash


def get_or_create_privacy_settings(db: Session, user_id: str) -> UserPrivacySettings:
    """
    Get or create privacy settings for a user.
    
    If settings don't exist, create them with default values.
    """
    settings = db.query(UserPrivacySettings).filter(
        UserPrivacySettings.user_id == user_id
    ).first()
    
    if not settings:
        settings = UserPrivacySettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


def update_privacy_settings(
    db: Session,
    user_id: str,
    settings_update: PrivacySettingsUpdate
) -> UserPrivacySettings:
    """Update user's privacy settings"""
    
    settings = get_or_create_privacy_settings(db, user_id)
    
    # Update only provided fields
    update_data = settings_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    
    return settings


def change_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str
) -> bool:
    """
    Change user's password.
    
    Returns True if successful, raises HTTPException otherwise.
    """
    # Verify current password
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return True


def change_email(
    db: Session,
    user: User,
    new_email: str,
    password: str
) -> User:
    """
    Change user's email.
    
    Returns updated user if successful, raises HTTPException otherwise.
    """
    # Verify password
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )
    
    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == new_email).first()
    if existing_user and existing_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Update email
    user.email = new_email
    db.commit()
    db.refresh(user)
    
    return user


def change_username(
    db: Session,
    user: User,
    new_username: str,
    password: str
) -> User:
    """
    Change user's username.
    
    Returns updated user if successful, raises HTTPException otherwise.
    """
    # Verify password
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )
    
    # Check if username is already taken
    existing_user = db.query(User).filter(User.username == new_username).first()
    if existing_user and existing_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken"
        )
    
    # Update username
    user.username = new_username
    db.commit()
    db.refresh(user)
    
    return user
