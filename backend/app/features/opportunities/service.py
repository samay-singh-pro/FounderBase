"""Opportunity business logic"""

from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.features.comments.models import Comment
from app.features.opportunities.models import Opportunity
from app.features.opportunities.schemas import OpportunityCreate


def create_opportunity(db: Session, user_id: str, data: OpportunityCreate) -> Opportunity:
    """
    Create a new opportunity.
    
    Args:
        db: Database session
        user_id: ID of user creating the opportunity
        data: Validated opportunity data
        
    Returns:
        Created Opportunity object
    """
    opportunity = Opportunity(
        title=data.title,
        description=data.description,
        type=data.type,
        category=data.category,
        user_id=user_id,
        status="created",
    )
    
    db.add(opportunity)
    db.commit()
    db.refresh(opportunity)

    return opportunity


def get_opportunity_by_id(db: Session, opportunity_id: str) -> Opportunity | None:
    """
    Get a single opportunity by ID.
    
    Args:
        db: Database session
        opportunity_id: UUID of the opportunity
        
    Returns:
        Opportunity if found, None otherwise
    """
    return db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()


def get_opportunities(
    db: Session,
    skip: int = 0,
    limit: int = 10,
    user_id: str | None = None,
    category: str | None = None,
    type_filter: str | None = None,
    status: str | None = None,
    search: str | None = None,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Opportunity], int]:
    """
    Get list of opportunities with filters, search, sorting, and pagination.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum records to return
        user_id: Filter by user (optional)
        category: Filter by category (optional)
        type_filter: Filter by type (optional)
        status: Filter by status (optional)
        search: Search in title and description (optional)
        created_after: Filter opportunities created after this date (optional)
        created_before: Filter opportunities created before this date (optional)
        sort_by: Field to sort by (default: created_at)
        sort_order: Sort direction - asc or desc (default: desc)
        
    Returns:
        Tuple of (opportunities list, total count)
    """
    query = db.query(Opportunity)
    
    # Apply filters
    if user_id:
        query = query.filter(Opportunity.user_id == user_id)
    if category:
        query = query.filter(Opportunity.category == category)
    if type_filter:
        query = query.filter(Opportunity.type == type_filter)
    if status:
        query = query.filter(Opportunity.status == status)
    
    # Search in title and description
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Opportunity.title.ilike(search_term),
                Opportunity.description.ilike(search_term)
            )
        )
    
    # Date range filters
    if created_after:
        query = query.filter(Opportunity.created_at >= created_after)
    if created_before:
        query = query.filter(Opportunity.created_at <= created_before)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(Opportunity, sort_by, Opportunity.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    # Apply pagination
    opportunities = query.offset(skip).limit(limit).all()
    
    return opportunities, total


def update_opportunity_status(
    db: Session,
    opportunity_id: str,
    new_status: str
) -> Opportunity | None:
    """
    Update opportunity status.
    
    Future: Add validation for allowed status transitions
    created -> reviewed -> approved -> rejected
    """
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        return None
    
    opportunity.status = new_status
    db.commit()
    db.refresh(opportunity)
    
    return opportunity


def delete_opportunity(db: Session, opportunity_id: str) -> bool:
    """
    Delete an opportunity and all associated comments.
    
    Args:
        db: Database session
        opportunity_id: UUID of opportunity to delete
        
    Returns:
        True if deleted, False if not found
    """
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        return False
    
    from app.features.comments.models import Comment
    db.query(Comment).filter(Comment.opportunity_id == opportunity_id).delete()
    
    # Delete the opportunity
    db.delete(opportunity)
    db.commit()
    
    return True
