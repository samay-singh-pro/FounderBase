"""Auth API routes - Signup, Login"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.connection import get_db
from app.features.auth import service
from app.features.auth.schemas import Token, UserCreate, UserLogin, UserPublic

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email and password"
)
def signup(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> UserPublic:
    """
    Register a new user.
    
    - **email**: Valid email address (must be unique)
    - **password**: Minimum 8 characters
    
    Returns the created user (without password).
    """
    user = service.register_user(db, user_in)
    return UserPublic.model_validate(user)


@router.post(
    "/login",
    response_model=Token,
    summary="Login to get access token",
    description="Authenticate with email and password to receive JWT token"
)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
) -> Token:
    """
    Authenticate and get JWT access token.
    
    - **email**: Your registered email
    - **password**: Your password
    
    Returns a JWT token valid for 30 minutes (configurable in settings).
    Use this token in subsequent requests with Authorization: Bearer <token>
    """
    user = service.authenticate_user(db, credentials.email, credentials.password)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return Token(access_token=access_token)
