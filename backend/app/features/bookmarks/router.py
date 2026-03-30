"""Bookmarks API routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.bookmarks import service
from app.features.bookmarks.schemas import BookmarkResponse
from app.features.opportunities.schemas import OpportunityList, OpportunityPublic
from app.features.opportunities.service import get_opportunity_by_id

router = APIRouter(tags=["Bookmarks"])


@router.post(
    "/opportunities/{opportunity_id}/bookmark",
    response_model=BookmarkResponse,
    summary="Bookmark an opportunity",
    description="Add an opportunity to your bookmarks (authentication required)"
)
def bookmark_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookmarkResponse:
    """
    Bookmark an opportunity to save for later.
    
    **Authentication required**: Bearer token in Authorization header
    
    - If already bookmarked, returns message indicating already bookmarked
    - If not bookmarked, adds bookmark and returns success message
    - Cannot bookmark the same opportunity twice
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    user_id = str(current_user.id)
    
    # Try to bookmark
    bookmarked = service.add_bookmark(db, user_id, opportunity_id)
    
    if bookmarked:
        return BookmarkResponse(
            message="Opportunity bookmarked successfully",
            bookmarked=True
        )
    else:
        return BookmarkResponse(
            message="You have already bookmarked this opportunity",
            bookmarked=False
        )


@router.delete(
    "/opportunities/{opportunity_id}/bookmark",
    response_model=BookmarkResponse,
    summary="Remove bookmark",
    description="Remove an opportunity from your bookmarks (authentication required)"
)
def remove_bookmark(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookmarkResponse:
    """
    Remove an opportunity from your bookmarks.
    
    **Authentication required**: Bearer token in Authorization header
    
    - If bookmarked, removes bookmark and returns success message
    - If not bookmarked, returns message indicating not bookmarked
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    user_id = str(current_user.id)
    
    # Try to remove bookmark
    removed = service.remove_bookmark(db, user_id, opportunity_id)
    
    if removed:
        return BookmarkResponse(
            message="Bookmark removed successfully",
            bookmarked=False
        )
    else:
        return BookmarkResponse(
            message="You haven't bookmarked this opportunity",
            bookmarked=False
        )


@router.get(
    "/bookmarks",
    response_model=OpportunityList,
    summary="Get my bookmarks",
    description="Get all opportunities you have bookmarked (authentication required)"
)
def get_my_bookmarks(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return (max: 100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OpportunityList:
    """
    Get all your bookmarked opportunities.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns opportunities ordered by when you bookmarked them (most recent first).
    
    - **skip**: Records to skip for pagination (default: 0)
    - **limit**: Max records to return (default: 50, max: 100)
    """
    user_id = str(current_user.id)
    
    opportunities, total = service.get_user_bookmarks(
        db=db,
        user_id=user_id,
        skip=skip,
        limit=limit
    )
    
    return OpportunityList(
        opportunities=[OpportunityPublic.model_validate(opp) for opp in opportunities],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/opportunities/{opportunity_id}/bookmark/status",
    response_model=dict,
    summary="Check bookmark status",
    description="Check if you have bookmarked an opportunity (authentication required)"
)
def check_bookmark_status(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Check if you have bookmarked an opportunity.
    
    **Authentication required**: Bearer token in Authorization header
    
    Returns:
    - is_bookmarked: True if you've bookmarked it, False otherwise
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    user_id = str(current_user.id)
    
    # Check if bookmarked
    is_bookmarked = service.is_bookmarked_by_user(db, user_id, opportunity_id)
    
    return {
        "opportunity_id": opportunity_id,
        "is_bookmarked": is_bookmarked
    }
