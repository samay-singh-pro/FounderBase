"""Settings API routes"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.auth.schemas import UserPublic
from app.features.settings import service
from app.features.settings.schemas import (
    PrivacySettingsResponse,
    PrivacySettingsUpdate,
    ChangePasswordRequest,
    ChangeEmailRequest,
    ChangeUsernameRequest
)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "/privacy",
    response_model=PrivacySettingsResponse,
    summary="Get privacy settings",
    description="Get the authenticated user's privacy settings"
)
def get_privacy_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PrivacySettingsResponse:
    """
    Get current user's privacy settings.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns privacy settings including:
    - follow_request_privacy: Who can send follow requests
    - message_request_privacy: Who can send message requests
    - hide_online_status: Whether online status is hidden
    - notification_preference: Notification preferences
    """
    settings = service.get_or_create_privacy_settings(db, str(current_user.id))
    return PrivacySettingsResponse.model_validate(settings)


@router.put(
    "/privacy",
    response_model=PrivacySettingsResponse,
    summary="Update privacy settings",
    description="Update the authenticated user's privacy settings"
)
def update_privacy_settings(
    settings_update: PrivacySettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PrivacySettingsResponse:
    """
    Update current user's privacy settings.
    
    **Authentication required**: Bearer token in Authorization header
    
    Can update:
    - follow_request_privacy: Who can send you follow requests (anyone, following_only, none)
    - message_request_privacy: Who can send you message requests (anyone, following_only, none)
    - hide_online_status: Hide your online status and last seen (reciprocal - you won't see others' either)
    - notification_preference: Notification preferences (all, following_only, none)
    """
    settings = service.update_privacy_settings(db, str(current_user.id), settings_update)
    return PrivacySettingsResponse.model_validate(settings)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change password",
    description="Change the authenticated user's password"
)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Change current user's password.
    
    **Authentication required**: Bearer token in Authorization header
    
    Requires:
    - current_password: For verification
    - new_password: Must be at least 8 characters
    """
    service.change_password(db, current_user, request.current_password, request.new_password)
    return {"message": "Password changed successfully"}


@router.post(
    "/change-email",
    response_model=UserPublic,
    summary="Change email",
    description="Change the authenticated user's email address"
)
def change_email(
    request: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserPublic:
    """
    Change current user's email address.
    
    **Authentication required**: Bearer token in Authorization header
    
    Requires:
    - new_email: New email address (must be unique)
    - password: Current password for verification
    """
    updated_user = service.change_email(db, current_user, request.new_email, request.password)
    return UserPublic.model_validate(updated_user)


@router.post(
    "/change-username",
    response_model=UserPublic,
    summary="Change username",
    description="Change the authenticated user's username"
)
def change_username(
    request: ChangeUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserPublic:
    """
    Change current user's username.
    
    **Authentication required**: Bearer token in Authorization header
    
    Requires:
    - new_username: New username (3-50 characters, must be unique)
    - password: Current password for verification
    """
    updated_user = service.change_username(db, current_user, request.new_username, request.password)
    return UserPublic.model_validate(updated_user)
