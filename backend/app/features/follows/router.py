"""Follow API routes"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.follows import service
from app.features.follows.schemas import (
    FollowStatusResponse,
    FollowersListResponse,
    FollowingListResponse,
    FollowerPublic,
    FollowingPublic,
    SuggestedUsersResponse,
    SuggestedUserPublic
)

router = APIRouter(tags=["Follows"])


@router.post(
    "/users/{user_id}/follow",
    status_code=status.HTTP_200_OK,
    summary="Follow a user",
    description="Current user follows the specified user (authentication required)"
)
def follow_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Follow a user.
    
    **Authentication required**: Bearer token in Authorization header
    
    - Cannot follow yourself
    - If already following, returns message indicating already following
    - If not following, adds follow relationship and returns success message
    - Cannot follow the same user twice
    """
    # Can't follow yourself
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot follow yourself"
        )
    
    # Verify user exists
    user_to_follow = db.query(User).filter(User.id == user_id).first()
    if user_to_follow is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Try to follow
    followed = service.follow_user(db, current_user.id, user_id)
    
    if followed:
        return {
            "message": f"You are now following {user_to_follow.username}",
            "is_following": True
        }
    else:
        return {
            "message": f"You are already following {user_to_follow.username}",
            "is_following": True
        }


@router.delete(
    "/users/{user_id}/follow",
    status_code=status.HTTP_200_OK,
    summary="Unfollow a user",
    description="Current user unfollows the specified user (authentication required)"
)
def unfollow_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Unfollow a user.
    
    **Authentication required**: Bearer token in Authorization header
    
    - If following, removes follow relationship and returns success message
    - If not following, returns message indicating not following
    """
    # Verify user exists
    user_to_unfollow = db.query(User).filter(User.id == user_id).first()
    if user_to_unfollow is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Try to unfollow
    unfollowed = service.unfollow_user(db, current_user.id, user_id)
    
    if unfollowed:
        return {
            "message": f"You have unfollowed {user_to_unfollow.username}",
            "is_following": False
        }
    else:
        return {
            "message": f"You are not following {user_to_unfollow.username}",
            "is_following": False
        }


@router.get(
    "/users/{user_id}/followers",
    response_model=FollowersListResponse,
    summary="Get user's followers",
    description="Get paginated list of users following the specified user"
)
def get_followers(
    user_id: str,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowersListResponse:
    """
    Get list of followers for a user.
    
    **Pagination parameters**:
    - `page`: Page number (1-based, default: 1)
    - `limit`: Number of followers per page (1-100, default: 20)
    
    Returns list of users who are following the specified user,
    ordered by most recent first.
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get followers
    followers_data, total = service.get_followers(db, user_id, page, limit)
    
    # Convert to Pydantic models and check if current user is following them back
    followers = []
    for follower in followers_data:
        is_following = service.is_following(db, current_user.id, follower['id'])
        follower_with_status = {**follower, 'is_following': is_following}
        followers.append(FollowerPublic(**follower_with_status))
    
    return FollowersListResponse(
        followers=followers,
        total=total,
        page=page,
        limit=limit
    )


@router.get(
    "/following",
    response_model=FollowingListResponse,
    summary="Get users that current user is following",
    description="Get paginated list of users that the current user is following (authentication required)"
)
def get_my_following(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowingListResponse:
    """
    Get list of users that the current user is following.
    
    **Authentication required**: Bearer token in Authorization header
    
    **Pagination parameters**:
    - `page`: Page number (1-based, default: 1)
    - `limit`: Number of following per page (1-100, default: 20)
    
    Returns list of users that the current user is following,
    ordered by most recent first.
    """
    # Get following
    following_data, total = service.get_following(db, current_user.id, page, limit)
    
    # Convert to Pydantic models
    following = [FollowingPublic(**user) for user in following_data]
    
    return FollowingListResponse(
        following=following,
        total=total,
        page=page,
        limit=limit
    )


@router.get(
    "/users/{user_id}/following",
    response_model=FollowingListResponse,
    summary="Get users that user is following",
    description="Get paginated list of users that the specified user is following"
)
def get_following(
    user_id: str,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: Session = Depends(get_db),
) -> FollowingListResponse:
    """
    Get list of users that a user is following.
    
    **Pagination parameters**:
    - `page`: Page number (1-based, default: 1)
    - `limit`: Number of following per page (1-100, default: 20)
    
    Returns list of users that the specified user is following,
    ordered by most recent first.
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get following
    following_data, total = service.get_following(db, user_id, page, limit)
    
    # Convert to Pydantic models
    following = [FollowingPublic(**user) for user in following_data]
    
    return FollowingListResponse(
        following=following,
        total=total,
        page=page,
        limit=limit
    )


@router.get(
    "/users/{user_id}/follow-status",
    response_model=FollowStatusResponse,
    summary="Check if current user is following another user",
    description="Check follow status between current user and specified user (authentication required)"
)
def get_follow_status(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowStatusResponse:
    """
    Check if current user is following another user.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns true if current user is following the specified user,
    false otherwise.
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check follow status
    is_following = service.is_following(db, current_user.id, user_id)
    
    return FollowStatusResponse(is_following=is_following)


@router.get(
    "/users/suggestions",
    response_model=SuggestedUsersResponse,
    summary="Get suggested users to follow",
    description="Get paginated list of users that the current user is not following (authentication required)"
)
def get_suggested_users(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuggestedUsersResponse:
    """
    Get suggested users for the current user to follow.
    
    **Authentication required**: Bearer token in Authorization header
    
    **Pagination parameters**:
    - `page`: Page number (1-based, default: 1)
    - `limit`: Number of suggestions per page (1-100, default: 20)
    
    Returns list of users that the current user is not following,
    ordered by most recent accounts first.
    """
    # Get suggested users
    suggested_data, total = service.get_suggested_users(db, current_user.id, page, limit)
    
    # Convert to Pydantic models
    users = [SuggestedUserPublic(**user) for user in suggested_data]
    
    return SuggestedUsersResponse(
        users=users,
        total=total,
        page=page,
        limit=limit
    )
