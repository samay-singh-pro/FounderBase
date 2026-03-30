"""Bookmark business logic"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.bookmarks.models import OpportunityBookmark
from app.features.opportunities.models import Opportunity


def add_bookmark(db: Session, user_id: str, opportunity_id: str) -> bool:
    """
    Bookmark an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user bookmarking the opportunity
        opportunity_id: ID of the opportunity to bookmark
        
    Returns:
        True if bookmark was added, False if already bookmarked
    """
    # Check if already bookmarked
    existing_bookmark = (
        db.query(OpportunityBookmark)
        .filter(
            OpportunityBookmark.user_id == user_id,
            OpportunityBookmark.opportunity_id == opportunity_id
        )
        .first()
    )
    
    if existing_bookmark:
        return False  # Already bookmarked
    
    # Create new bookmark
    bookmark = OpportunityBookmark(
        user_id=user_id,
        opportunity_id=opportunity_id
    )
    
    try:
        db.add(bookmark)
        db.commit()
        return True
    except IntegrityError:
        # Race condition: someone else bookmarked at the same time
        db.rollback()
        return False


def remove_bookmark(db: Session, user_id: str, opportunity_id: str) -> bool:
    """
    Remove bookmark from an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user removing the bookmark
        opportunity_id: ID of the opportunity to unbookmark
        
    Returns:
        True if bookmark was removed, False if wasn't bookmarked
    """
    bookmark = (
        db.query(OpportunityBookmark)
        .filter(
            OpportunityBookmark.user_id == user_id,
            OpportunityBookmark.opportunity_id == opportunity_id
        )
        .first()
    )
    
    if bookmark is None:
        return False  # Not bookmarked
    
    db.delete(bookmark)
    db.commit()
    return True


def is_bookmarked_by_user(db: Session, user_id: str, opportunity_id: str) -> bool:
    """
    Check if user has bookmarked an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user to check
        opportunity_id: ID of the opportunity
        
    Returns:
        True if user has bookmarked the opportunity, False otherwise
    """
    bookmark = (
        db.query(OpportunityBookmark)
        .filter(
            OpportunityBookmark.user_id == user_id,
            OpportunityBookmark.opportunity_id == opportunity_id
        )
        .first()
    )
    
    return bookmark is not None


def get_user_bookmarks(
    db: Session,
    user_id: str,
    skip: int = 0,
    limit: int = 50
) -> tuple[list[Opportunity], int]:
    """
    Get all bookmarked opportunities for a user.
    
    Args:
        db: Database session
        user_id: ID of the user
        skip: Number of records to skip
        limit: Maximum records to return
        
    Returns:
        Tuple of (list of Opportunity objects, total count)
    """
    # Query to get bookmarked opportunities with join
    query = (
        db.query(Opportunity)
        .join(
            OpportunityBookmark,
            Opportunity.id == OpportunityBookmark.opportunity_id
        )
        .filter(OpportunityBookmark.user_id == user_id)
    )
    
    # Get total count
    total = query.count()
    
    # Get paginated results, ordered by bookmark creation (most recent first)
    opportunities = (
        query
        .order_by(OpportunityBookmark.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return opportunities, total
