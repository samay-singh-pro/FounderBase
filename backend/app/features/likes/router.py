"""Likes API routes"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.likes import service
from app.features.likes.schemas import LikeResponse, LikeStatus, LikedOpportunitiesResponse
from app.features.opportunities.service import get_opportunity_by_id
from app.features.opportunities.schemas import OpportunityPublic
from app.features.likes.models import OpportunityLike
from app.features.opportunities.models import Opportunity
from app.features.follows import service as follows_service

router = APIRouter(prefix="/likes", tags=["Likes"])


@router.post(
    "/opportunities/{opportunity_id}/like",
    response_model=LikeResponse,
    summary="Like an opportunity",
    description="Add a like to an opportunity (authentication required)"
)
def like_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeResponse:
    """
    Like an opportunity.
    
    **Authentication required**: Bearer token in Authorization header
    
    - If already liked, returns message indicating already liked
    - If not liked, adds like and returns success message
    - Cannot like the same opportunity twice
    
    Returns total like count for the opportunity.
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    user_id = str(current_user.id)
    
    # Try to like
    liked = service.like_opportunity(db, user_id, opportunity_id)
    
    # Get total likes
    total_likes = service.get_like_count(db, opportunity_id)
    
    if liked:
        return LikeResponse(
            message="Opportunity liked successfully",
            liked=True,
            total_likes=total_likes
        )
    else:
        return LikeResponse(
            message="You have already liked this opportunity",
            liked=False,
            total_likes=total_likes
        )


@router.delete(
    "/opportunities/{opportunity_id}/like",
    response_model=LikeResponse,
    summary="Unlike an opportunity",
    description="Remove your like from an opportunity (authentication required)"
)
def unlike_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeResponse:
    """
    Unlike an opportunity (remove your like).
    
    **Authentication required**: Bearer token in Authorization header
    
    - If liked, removes like and returns success message
    - If not liked, returns message indicating not liked
    
    Returns total like count for the opportunity.
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    user_id = str(current_user.id)
    
    # Try to unlike
    unliked = service.unlike_opportunity(db, user_id, opportunity_id)
    
    # Get total likes
    total_likes = service.get_like_count(db, opportunity_id)
    
    if unliked:
        return LikeResponse(
            message="Like removed successfully",
            liked=False,
            total_likes=total_likes
        )
    else:
        return LikeResponse(
            message="You haven't liked this opportunity",
            liked=False,
            total_likes=total_likes
        )


@router.get(
    "/opportunities/{opportunity_id}/like/status",
    response_model=LikeStatus,
    summary="Check like status",
    description="Check if you have liked an opportunity (authentication required)"
)
def get_like_status(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeStatus:
    """
    Check if you have liked an opportunity.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns:
    - is_liked: True if you've liked it, False otherwise
    - total_likes: Total number of likes on the opportunity
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    user_id = str(current_user.id)
    
    # Check if liked
    is_liked = service.is_liked_by_user(db, user_id, opportunity_id)
    
    # Get total likes
    total_likes = service.get_like_count(db, opportunity_id)
    
    return LikeStatus(
        opportunity_id=opportunity_id,
        is_liked=is_liked,
        total_likes=total_likes
    )


@router.get(
    "/opportunities/{opportunity_id}/likes/count",
    summary="Get like count",
    description="Get total number of likes for an opportunity (public access)"
)
def get_likes_count(
    opportunity_id: str,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """
    Get total number of likes for an opportunity.
    
    No authentication required - anyone can view like counts.
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    total_likes = service.get_like_count(db, opportunity_id)
    
    return {"total_likes": total_likes}


@router.get(
    "/me/liked-opportunities",
    response_model=LikedOpportunitiesResponse,
    summary="Get my liked opportunities",
    description="Get all opportunities liked by the current user (authentication required)"
)
def get_my_liked_opportunities(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikedOpportunitiesResponse:
    """
    Get all opportunities liked by the current user.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns a list of opportunities in reverse chronological order (most recently liked first).
    """
    user_id = str(current_user.id)
    
    # Get likes with opportunity and user data
    results = (
        db.query(OpportunityLike, Opportunity, User.username)
        .join(Opportunity, OpportunityLike.opportunity_id == Opportunity.id)
        .join(User, Opportunity.user_id == User.id)
        .filter(OpportunityLike.user_id == user_id)
        .order_by(OpportunityLike.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Convert to opportunity public schemas
    opportunities = []
    for like, opp, username in results:
        # Check if current user is following the post author
        is_following = follows_service.is_following(db, user_id, opp.user_id)
        
        opp_dict = {
            "id": opp.id,
            "title": opp.title,
            "description": opp.description,
            "type": opp.type,
            "category": opp.category,
            "link": opp.link,
            "user_id": opp.user_id,
            "username": username,
            "created_at": opp.created_at,
            "status": opp.status,
            "likes_count": 0,
            "comments_count": 0,
            "is_liked": True,  # Since these are all liked
            "is_bookmarked": False,
            "is_following": is_following,
        }
        opportunities.append(OpportunityPublic.model_validate(opp_dict))
    
    # Get total count
    total = db.query(OpportunityLike).filter(
        OpportunityLike.user_id == user_id
    ).count()
    
    return LikedOpportunitiesResponse(
        opportunities=opportunities,
        total=total
    )
