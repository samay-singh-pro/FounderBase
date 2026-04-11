"""Drafts API routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.drafts import service
from app.features.drafts.schemas import DraftCreate, DraftUpdate, DraftPublic, DraftList

router = APIRouter(prefix="/drafts", tags=["Drafts"])


@router.post(
    "",
    response_model=DraftPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a draft",
    description="Save opportunity as draft (authentication required)"
)
def create_draft(
    draft_data: DraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftPublic:
    """
    Create a new draft.
    
    **Authentication required**: Bearer token in Authorization header
    
    Saves the opportunity data as a draft for later editing.
    """
    user_id = str(current_user.id)
    draft = service.create_draft(db, user_id, draft_data)
    
    return DraftPublic.model_validate(draft)


@router.get(
    "",
    response_model=DraftList,
    summary="Get user's drafts",
    description="Retrieve all drafts for the authenticated user"
)
def get_drafts(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftList:
    """
    Get all drafts for the current user.
    
    **Authentication required**: Bearer token in Authorization header
    
    **Query parameters:**
    - **skip**: Records to skip for pagination (default: 0)
    - **limit**: Max records to return (default: 50, max: 100)
    """
    if limit > 100:
        limit = 100
    
    user_id = str(current_user.id)
    drafts, total = service.get_user_drafts(db, user_id, skip, limit)
    
    return DraftList(
        drafts=[DraftPublic.model_validate(draft) for draft in drafts],
        total=total
    )


@router.get(
    "/{draft_id}",
    response_model=DraftPublic,
    summary="Get a single draft",
    description="Retrieve draft details by ID"
)
def get_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftPublic:
    """
    Get a single draft by ID.
    
    **Authentication required**: Bearer token in Authorization header
    **Authorization**: You can only view your own drafts
    """
    user_id = str(current_user.id)
    draft = service.get_draft_by_id(db, draft_id, user_id)
    
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )
    
    return DraftPublic.model_validate(draft)


@router.put(
    "/{draft_id}",
    response_model=DraftPublic,
    summary="Update a draft",
    description="Update an existing draft"
)
def update_draft(
    draft_id: str,
    draft_data: DraftUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DraftPublic:
    """
    Update an existing draft.
    
    **Authentication required**: Bearer token in Authorization header
    **Authorization**: You can only update your own drafts
    """
    user_id = str(current_user.id)
    draft = service.update_draft(db, draft_id, user_id, draft_data)
    
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found or you don't have permission to update it"
        )
    
    return DraftPublic.model_validate(draft)


@router.delete(
    "/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a draft",
    description="Delete an existing draft"
)
def delete_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a draft.
    
    **Authentication required**: Bearer token in Authorization header
    **Authorization**: You can only delete your own drafts
    """
    user_id = str(current_user.id)
    success = service.delete_draft(db, draft_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found or you don't have permission to delete it"
        )
