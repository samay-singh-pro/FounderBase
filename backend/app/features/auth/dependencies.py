"""Auth-specific dependencies for route injection"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.connection import get_db
from app.features.auth.models import User
from app.features.auth.service import get_user_by_email

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the currently authenticated user from JWT token.
    
    This dependency:
    1. Extracts Bearer token from Authorization header
    2. Decodes and verifies JWT token
    3. Retrieves user from database
    4. Returns User object or raises 401
    
    Usage:
        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": current_user.id}
    
    Raises:
        HTTPException: 401 if token invalid or user not found
    """
    token = credentials.credentials
    
    # Decode JWT
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract email from token payload
    email: str | None = payload.get("email")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Get the currently authenticated user from JWT token (optional).
    
    This dependency:
    1. Extracts Bearer token from Authorization header (if present)
    2. Returns None if no token provided
    3. Returns None if token is invalid
    4. Returns User object if token is valid
    
    Usage:
        @router.get("/public")
        def public_route(current_user: User | None = Depends(get_current_user_optional)):
            if current_user:
                return {"user_id": current_user.id, "personalized": True}
            return {"personalized": False}
    
    Returns:
        User object if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    
    # Decode JWT
    payload = decode_access_token(token)
    if payload is None:
        return None
    
    # Extract email from token payload
    email: str | None = payload.get("email")
    if email is None:
        return None
    
    # Get user from database
    user = get_user_by_email(db, email)
    return user
