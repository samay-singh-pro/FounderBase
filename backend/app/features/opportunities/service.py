"""Opportunity business logic"""

from datetime import datetime

from sqlalchemy import or_, func, case, literal
from sqlalchemy.orm import Session

from app.features.comments.models import Comment
from app.features.likes.models import OpportunityLike
from app.features.bookmarks.models import OpportunityBookmark
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
    current_user_id: str | None = None,
) -> tuple[list[dict], int]:
    """
    Get list of opportunities with filters, search, sorting, pagination, and engagement metrics.
    
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
        current_user_id: ID of current authenticated user for personalized data (optional)
        
    Returns:
        Tuple of (opportunities list with engagement data, total count)
    """
    # Subquery for likes count
    likes_count_subq = (
        db.query(
            OpportunityLike.opportunity_id,
            func.count(OpportunityLike.id).label('likes_count')
        )
        .group_by(OpportunityLike.opportunity_id)
        .subquery()
    )
    
    # Subquery for comments count
    comments_count_subq = (
        db.query(
            Comment.opportunity_id,
            func.count(Comment.id).label('comments_count')
        )
        .group_by(Comment.opportunity_id)
        .subquery()
    )
    
    # Subquery for user's like status (if authenticated)
    user_liked_subq = None
    if current_user_id:
        user_liked_subq = (
            db.query(
                OpportunityLike.opportunity_id,
                func.count(OpportunityLike.id).label('is_liked')
            )
            .filter(OpportunityLike.user_id == current_user_id)
            .group_by(OpportunityLike.opportunity_id)
            .subquery()
        )
    
    # Subquery for user's bookmark status (if authenticated)
    user_bookmarked_subq = None
    if current_user_id:
        user_bookmarked_subq = (
            db.query(
                OpportunityBookmark.opportunity_id,
                func.count(OpportunityBookmark.id).label('is_bookmarked')
            )
            .filter(OpportunityBookmark.user_id == current_user_id)
            .group_by(OpportunityBookmark.opportunity_id)
            .subquery()
        )
    
    # Main query with left joins
    query = db.query(
        Opportunity,
        func.coalesce(likes_count_subq.c.likes_count, 0).label('likes_count'),
        func.coalesce(comments_count_subq.c.comments_count, 0).label('comments_count'),
    )
    
    # Add user-specific columns if authenticated
    if current_user_id and user_liked_subq is not None:
        query = query.add_columns(
            case((user_liked_subq.c.is_liked > 0, True), else_=False).label('is_liked')
        )
    else:
        query = query.add_columns(literal(False).label('is_liked'))
    
    if current_user_id and user_bookmarked_subq is not None:
        query = query.add_columns(
            case((user_bookmarked_subq.c.is_bookmarked > 0, True), else_=False).label('is_bookmarked')
        )
    else:
        query = query.add_columns(literal(False).label('is_bookmarked'))
    
    # Apply joins
    query = query.outerjoin(
        likes_count_subq,
        Opportunity.id == likes_count_subq.c.opportunity_id
    ).outerjoin(
        comments_count_subq,
        Opportunity.id == comments_count_subq.c.opportunity_id
    )
    
    if current_user_id and user_liked_subq is not None:
        query = query.outerjoin(
            user_liked_subq,
            Opportunity.id == user_liked_subq.c.opportunity_id
        )
    
    if current_user_id and user_bookmarked_subq is not None:
        query = query.outerjoin(
            user_bookmarked_subq,
            Opportunity.id == user_bookmarked_subq.c.opportunity_id
        )
    
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
    results = query.offset(skip).limit(limit).all()
    
    # Convert results to dictionaries with engagement data
    opportunities = []
    for row in results:
        opp = row[0]  # Opportunity object
        opportunities.append({
            'id': opp.id,
            'title': opp.title,
            'description': opp.description,
            'type': opp.type,
            'category': opp.category,
            'user_id': opp.user_id,
            'created_at': opp.created_at,
            'status': opp.status,
            'likes_count': row[1],  # likes_count
            'comments_count': row[2],  # comments_count
            'is_liked': row[3],  # is_liked
            'is_bookmarked': row[4],  # is_bookmarked
        })
    
    return opportunities, total
    
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
