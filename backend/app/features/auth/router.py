"""Auth API routes - Signup, Login"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.security import create_access_token
from app.db.connection import get_db
from app.features.auth import service
from app.features.auth.schemas import Token, UserCreate, UserLogin, UserPublic, UserStats, UserUpdate
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.opportunities.models import Opportunity
from app.features.follows.models import Follow
from app.features.bookmarks.models import OpportunityBookmark
from app.features.likes.models import OpportunityLike

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
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserPublic.model_validate(user)
    )


@router.get(
    "/me/stats",
    response_model=UserStats,
    summary="Get current user statistics",
    description="Get statistics for the authenticated user (authentication required)"
)
def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserStats:
    """
    Get statistics for the current authenticated user.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns:
    - posts_count: Total number of posts created
    - followers_count: Number of followers
    - following_count: Number of users following
    - total_likes: Total likes received on all posts
    - bookmarks_count: Number of bookmarked posts
    """
    user_id = str(current_user.id)
    
    # Count posts
    posts_count = db.query(func.count(Opportunity.id)).filter(
        Opportunity.user_id == user_id
    ).scalar() or 0
    
    # Count followers (people who follow this user)
    followers_count = db.query(func.count(Follow.follower_id)).filter(
        Follow.followee_id == user_id
    ).scalar() or 0
    
    # Count following (people this user follows)
    following_count = db.query(func.count(Follow.followee_id)).filter(
        Follow.follower_id == user_id
    ).scalar() or 0
    
    # Count total likes on user's posts
    total_likes = db.query(func.count(OpportunityLike.id)).join(
        Opportunity, OpportunityLike.opportunity_id == Opportunity.id
    ).filter(
        Opportunity.user_id == user_id
    ).scalar() or 0
    
    # Count bookmarks
    bookmarks_count = db.query(func.count(OpportunityBookmark.id)).filter(
        OpportunityBookmark.user_id == user_id
    ).scalar() or 0
    
    return UserStats(
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        total_likes=total_likes,
        bookmarks_count=bookmarks_count
    )


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Get current user profile",
    description="Get the authenticated user's profile information"
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
) -> UserPublic:
    """
    Get the current authenticated user's profile.
    
    **Authentication required**: Bearer token in Authorization header
    """
    return UserPublic.model_validate(current_user)


@router.get(
    "/users/{user_id}",
    response_model=UserPublic,
    summary="Get user profile by ID",
    description="Get public profile information for any user"
)
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db)
) -> UserPublic:
    """
    Get a user's public profile by ID.
    
    Returns public information about the user (no authentication required).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserPublic.model_validate(user)


@router.get(
    "/users/{user_id}/stats",
    response_model=UserStats,
    summary="Get user statistics by ID",
    description="Get statistics for any user by their ID"
)
def get_user_stats(
    user_id: str,
    db: Session = Depends(get_db)
) -> UserStats:
    """
    Get statistics for a specific user.
    
    Returns:
    - posts_count: Total number of posts created
    - followers_count: Number of followers
    - following_count: Number of users following
    - total_likes: Total likes received on all posts
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Count posts
    posts_count = db.query(func.count(Opportunity.id)).filter(
        Opportunity.user_id == user_id
    ).scalar() or 0
    
    # Count followers (people who follow this user)
    followers_count = db.query(func.count(Follow.follower_id)).filter(
        Follow.followee_id == user_id
    ).scalar() or 0
    
    # Count following (people this user follows)
    following_count = db.query(func.count(Follow.followee_id)).filter(
        Follow.follower_id == user_id
    ).scalar() or 0
    
    # Count total likes on user's posts
    total_likes = db.query(func.count(OpportunityLike.id)).join(
        Opportunity, OpportunityLike.opportunity_id == Opportunity.id
    ).filter(
        Opportunity.user_id == user_id
    ).scalar() or 0
    
    return UserStats(
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        total_likes=total_likes,
        bookmarks_count=0  # Not relevant for other users' profiles
    )


@router.put(
    "/me",
    response_model=UserPublic,
    summary="Update current user profile",
    description="Update the authenticated user's profile information"
)
def update_my_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserPublic:
    """
    Update the current authenticated user's profile.
    
    **Authentication required**: Bearer token in Authorization header
    
    Can update:
    - full_name: Full name (max 100 characters)
    - bio: Bio/About me (max 500 characters)
    - location: Location (max 100 characters)
    - website: Website URL (max 255 characters)
    """
    # Update only provided fields
    update_data = profile_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return UserPublic.model_validate(current_user)
