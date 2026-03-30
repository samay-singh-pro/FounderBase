"""Opportunities API routes"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.opportunities import service
from app.features.opportunities.schemas import (
    OpportunityCreate,
    OpportunityList,
    OpportunityPublic,
    SortField,
    SortOrder,
)

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


@router.post(
    "",
    response_model=OpportunityPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new opportunity",
    description="Submit a problem, idea, or improvement (authentication required)"
)
def create_opportunity(
    opportunity_data: OpportunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OpportunityPublic:
    """
    Create a new opportunity.
    
    **Authentication required**: Include Bearer token in Authorization header
    
    The opportunity will be associated with your user account.
    
    - **title**: 5-255 characters, clear and concise
    - **description**: Minimum 20 characters with context and impact
    - **type**: problem, idea, or improvement
    - **category**: e.g., food, farming, tech, government, education
    """
    user_id = str(current_user.id)
    opportunity = service.create_opportunity(db, user_id, opportunity_data)
    
    return OpportunityPublic.model_validate(opportunity)


@router.get(
    "/{opportunity_id}",
    response_model=OpportunityPublic,
    summary="Get a single opportunity",
    description="Retrieve opportunity details by ID (public access)"
)
def get_opportunity(
    opportunity_id: str,
    db: Session = Depends(get_db),
) -> OpportunityPublic:
    """Get a single opportunity by ID. No authentication required."""
    opportunity = service.get_opportunity_by_id(db, opportunity_id)
    
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    return OpportunityPublic.model_validate(opportunity)


@router.get(
    "",
    response_model=OpportunityList,
    summary="List opportunities",
    description="Get paginated list of opportunities with filters, search, and sorting (public access)"
)
def list_opportunities(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max records to return (max: 100)"),
    category: str | None = Query(None, description="Filter by category"),
    type: str | None = Query(None, description="Filter by type: problem, idea, or improvement"),
    status: str | None = Query(None, description="Filter by status"),
    search: str | None = Query(None, min_length=2, description="Search in title and description"),
    created_after: datetime | None = Query(None, description="Filter opportunities created after this date (ISO 8601)"),
    created_before: datetime | None = Query(None, description="Filter opportunities created before this date (ISO 8601)"),
    sort_by: SortField = Query(SortField.created_at, description="Field to sort by"),
    sort_order: SortOrder = Query(SortOrder.desc, description="Sort order: asc or desc"),
    db: Session = Depends(get_db),
) -> OpportunityList:
    """
    List opportunities with advanced filtering, search, and sorting.
    
    **Pagination:**
    - **skip**: Records to skip (default: 0)
    - **limit**: Max records to return (default: 10, max: 100)
    
    **Filters:**
    - **category**: Filter by category (e.g., food, farming, tech)
    - **type**: Filter by type (problem, idea, improvement)
    - **status**: Filter by status
    - **created_after**: Only opportunities created after this date
    - **created_before**: Only opportunities created before this date
    
    **Search:**
    - **search**: Search text in title and description (minimum 2 characters)
    
    **Sorting:**
    - **sort_by**: Field to sort by (created_at, title, category, type, status)
    - **sort_order**: Sort direction (asc, desc)
    
    No authentication required.
    """
    opportunities, total = service.get_opportunities(
        db=db,
        skip=skip,
        limit=limit,
        category=category,
        type_filter=type,
        status=status,
        search=search,
        created_after=created_after,
        created_before=created_before,
        sort_by=sort_by.value,
        sort_order=sort_order.value,
    )
    
    return OpportunityList(
        opportunities=[OpportunityPublic.model_validate(opp) for opp in opportunities],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/me/opportunities",
    response_model=OpportunityList,
    summary="Get my opportunities",
    description="Get opportunities created by you with sorting and filtering (authentication required)"
)
def get_my_opportunities(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max records to return (max: 100)"),
    sort_by: SortField = Query(SortField.created_at, description="Field to sort by"),
    sort_order: SortOrder = Query(SortOrder.desc, description="Sort order: asc or desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OpportunityList:
    """
    Get your submitted opportunities with sorting.
    
    **Authentication required**: Bearer token in Authorization header
    
    - **skip**: Records to skip for pagination (default: 0)
    - **limit**: Max records to return (default: 10, max: 100)
    - **sort_by**: Field to sort by (created_at, title, category, type, status)
    - **sort_order**: Sort direction (asc, desc)
    """
    user_id = str(current_user.id)
    opportunities, total = service.get_opportunities(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        sort_by=sort_by.value,
        sort_order=sort_order.value,
    )
    
    return OpportunityList(
        opportunities=[OpportunityPublic.model_validate(opp) for opp in opportunities],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.delete(
    "/{opportunity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an opportunity",
    description="Delete your own opportunity (authentication required)"
)
def delete_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete an opportunity.
    
    You can only delete your own opportunities.
    
    **Authentication required**: Bearer token
    """
    opportunity = service.get_opportunity_by_id(db, opportunity_id)
    
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    # Check ownership
    if opportunity.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own opportunities"
        )
    
    service.delete_opportunity(db, opportunity_id)
