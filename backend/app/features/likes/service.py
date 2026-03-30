"""Like business logic"""

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.likes.models import OpportunityLike


def like_opportunity(db: Session, user_id: str, opportunity_id: str) -> bool:
    """
    Like an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user liking the opportunity
        opportunity_id: ID of the opportunity to like
        
    Returns:
        True if like was added, False if already liked
    """
    # Check if already liked
    existing_like = (
        db.query(OpportunityLike)
        .filter(
            OpportunityLike.user_id == user_id,
            OpportunityLike.opportunity_id == opportunity_id
        )
        .first()
    )
    
    if existing_like:
        return False  # Already liked
    
    # Create new like
    like = OpportunityLike(
        user_id=user_id,
        opportunity_id=opportunity_id
    )
    
    try:
        db.add(like)
        db.commit()
        return True
    except IntegrityError:
        # Race condition: someone else liked at the same time
        db.rollback()
        return False


def unlike_opportunity(db: Session, user_id: str, opportunity_id: str) -> bool:
    """
    Unlike an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user unliking the opportunity
        opportunity_id: ID of the opportunity to unlike
        
    Returns:
        True if like was removed, False if wasn't liked
    """
    like = (
        db.query(OpportunityLike)
        .filter(
            OpportunityLike.user_id == user_id,
            OpportunityLike.opportunity_id == opportunity_id
        )
        .first()
    )
    
    if like is None:
        return False  # Not liked
    
    db.delete(like)
    db.commit()
    return True


def is_liked_by_user(db: Session, user_id: str, opportunity_id: str) -> bool:
    """
    Check if user has liked an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user to check
        opportunity_id: ID of the opportunity
        
    Returns:
        True if user has liked the opportunity, False otherwise
    """
    like = (
        db.query(OpportunityLike)
        .filter(
            OpportunityLike.user_id == user_id,
            OpportunityLike.opportunity_id == opportunity_id
        )
        .first()
    )
    
    return like is not None


def get_like_count(db: Session, opportunity_id: str) -> int:
    """
    Get total number of likes for an opportunity.
    
    Args:
        db: Database session
        opportunity_id: ID of the opportunity
        
    Returns:
        Number of likes
    """
    count = (
        db.query(func.count(OpportunityLike.id))
        .filter(OpportunityLike.opportunity_id == opportunity_id)
        .scalar()
    )
    
    return count or 0


def get_opportunity_likes(
    db: Session,
    opportunity_id: str,
    skip: int = 0,
    limit: int = 50
) -> list[OpportunityLike]:
    """
    Get all likes for an opportunity.
    
    Args:
        db: Database session
        opportunity_id: ID of the opportunity
        skip: Number of records to skip
        limit: Maximum records to return
        
    Returns:
        List of OpportunityLike objects
    """
    likes = (
        db.query(OpportunityLike)
        .filter(OpportunityLike.opportunity_id == opportunity_id)
        .order_by(OpportunityLike.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return likes
