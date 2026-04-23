"""Stats API routes - Platform analytics and insights"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.connection import get_db
from app.features.opportunities.models import Opportunity
from app.features.auth.models import User
from app.features.stats.schemas import (
    TrendingCategoriesResponse,
    ActiveUsersResponse,
    CategoryStat,
    ActiveUser
)

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get(
    "/trending-categories",
    response_model=TrendingCategoriesResponse,
    summary="Get trending categories",
    description="Get categories ordered by number of opportunities"
)
def get_trending_categories(
    limit: int = 6,
    db: Session = Depends(get_db),
) -> TrendingCategoriesResponse:
    """
    Get trending categories with opportunity counts.
    
    Returns categories ordered by number of opportunities (most popular first).
    """
    # Query to get category counts
    results = (
        db.query(
            Opportunity.category,
            func.count(Opportunity.id).label('count')
        )
        .group_by(Opportunity.category)
        .order_by(func.count(Opportunity.id).desc())
        .limit(limit)
        .all()
    )
    
    categories = [
        CategoryStat(category=row.category, count=row.count)
        for row in results
    ]
    
    return TrendingCategoriesResponse(categories=categories)


@router.get(
    "/active-users",
    response_model=ActiveUsersResponse,
    summary="Get most active users",
    description="Get users with most opportunities posted"
)
def get_active_users(
    limit: int = 5,
    db: Session = Depends(get_db),
) -> ActiveUsersResponse:
    """
    Get most active users based on number of opportunities posted.
    
    Returns users ordered by contribution count (most active first).
    """
    # Query to get users with their opportunity counts
    results = (
        db.query(
            User.id,
            User.username,
            User.email,
            func.count(Opportunity.id).label('posts_count')
        )
        .join(Opportunity, Opportunity.user_id == User.id)
        .group_by(User.id, User.username, User.email)
        .order_by(func.count(Opportunity.id).desc())
        .limit(limit)
        .all()
    )
    
    users = [
        ActiveUser(
            id=row.id,
            username=row.username,
            email=row.email,
            posts_count=row.posts_count
        )
        for row in results
    ]
    
    return ActiveUsersResponse(users=users)


@router.get(
    "/platform-overview",
    summary="Get platform overview statistics",
    description="Get overall platform statistics"
)
def get_platform_overview(
    db: Session = Depends(get_db),
) -> dict:
    """
    Get platform overview statistics.
    
    Returns counts for opportunities, users, and categories.
    """
    total_opportunities = db.query(func.count(Opportunity.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_categories = db.query(func.count(func.distinct(Opportunity.category))).scalar() or 0
    
    # Count by type
    type_counts = (
        db.query(
            Opportunity.type,
            func.count(Opportunity.id).label('count')
        )
        .group_by(Opportunity.type)
        .all()
    )
    
    type_stats = {row.type: row.count for row in type_counts}
    
    return {
        "total_opportunities": total_opportunities,
        "total_users": total_users,
        "total_categories": total_categories,
        "by_type": type_stats
    }
