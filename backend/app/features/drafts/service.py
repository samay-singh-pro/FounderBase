"""Draft business logic"""

from sqlalchemy.orm import Session
from app.features.drafts.models import Draft
from app.features.drafts.schemas import DraftCreate, DraftUpdate


def create_draft(db: Session, user_id: str, data: DraftCreate) -> Draft:
    """
    Create a new draft.
    
    Args:
        db: Database session
        user_id: ID of user creating the draft
        data: Validated draft data
        
    Returns:
        Created Draft object
    """
    draft = Draft(
        title=data.title,
        description=data.description,
        type=data.type,
        category=data.category,
        link=data.link,
        user_id=user_id,
    )
    
    db.add(draft)
    db.commit()
    db.refresh(draft)
    
    return draft


def update_draft(
    db: Session, 
    draft_id: str, 
    user_id: str, 
    data: DraftUpdate
) -> Draft | None:
    """
    Update an existing draft.
    
    Args:
        db: Database session
        draft_id: UUID of the draft to update
        user_id: ID of user requesting the update (must be owner)
        data: Validated draft update data
        
    Returns:
        Updated Draft object if found and authorized, None otherwise
    """
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    
    if draft is None:
        return None
    
    # Check if user is the owner
    if str(draft.user_id) != str(user_id):
        return None
    
    # Update only provided fields
    if data.title is not None:
        draft.title = data.title
    if data.description is not None:
        draft.description = data.description
    if data.type is not None:
        draft.type = data.type
    if data.category is not None:
        draft.category = data.category
    if data.link is not None:
        draft.link = data.link
    
    db.commit()
    db.refresh(draft)
    
    return draft


def get_user_drafts(
    db: Session,
    user_id: str,
    skip: int = 0,
    limit: int = 50
) -> tuple[list[Draft], int]:
    """
    Get all drafts for a user.
    
    Args:
        db: Database session
        user_id: ID of user
        skip: Number of records to skip
        limit: Max number of records to return
        
    Returns:
        Tuple of (list of drafts, total count)
    """
    query = db.query(Draft).filter(Draft.user_id == user_id)
    
    total = query.count()
    drafts = query.order_by(Draft.updated_at.desc()).offset(skip).limit(limit).all()
    
    return drafts, total


def get_draft_by_id(db: Session, draft_id: str, user_id: str) -> Draft | None:
    """
    Get a single draft by ID.
    
    Args:
        db: Database session
        draft_id: UUID of the draft
        user_id: ID of user (must be owner)
        
    Returns:
        Draft if found and authorized, None otherwise
    """
    draft = db.query(Draft).filter(
        Draft.id == draft_id,
        Draft.user_id == user_id
    ).first()
    
    return draft


def delete_draft(db: Session, draft_id: str, user_id: str) -> bool:
    """
    Delete a draft.
    
    Args:
        db: Database session
        draft_id: UUID of the draft to delete
        user_id: ID of user requesting the deletion (must be owner)
        
    Returns:
        True if deleted successfully, False if not found or not authorized
    """
    draft = db.query(Draft).filter(
        Draft.id == draft_id,
        Draft.user_id == user_id
    ).first()
    
    if draft is None:
        return False
    
    db.delete(draft)
    db.commit()
    
    return True
