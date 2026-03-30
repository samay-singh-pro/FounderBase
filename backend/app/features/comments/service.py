"""Comment business logic"""

from sqlalchemy.orm import Session

from app.features.comments.models import Comment
from app.features.comments.schemas import CommentCreate


def create_comment(
    db: Session,
    user_id: str,
    opportunity_id: str,
    data: CommentCreate
) -> Comment:
    """
    Create a new comment on an opportunity.
    
    Args:
        db: Database session
        user_id: ID of user creating the comment
        opportunity_id: ID of the opportunity being commented on
        data: Comment data
        
    Returns:
        Created Comment object
    """
    comment = Comment(
        content=data.content,
        opportunity_id=opportunity_id,
        user_id=user_id,
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return comment


def get_comments_by_opportunity(
    db: Session,
    opportunity_id: str,
    skip: int = 0,
    limit: int = 50
) -> tuple[list[Comment], int]:
    """
    Get all comments for an opportunity.
    
    Args:
        db: Database session
        opportunity_id: ID of the opportunity
        skip: Number of records to skip
        limit: Maximum records to return
        
    Returns:
        Tuple of (comments list, total count)
    """
    query = db.query(Comment).filter(Comment.opportunity_id == opportunity_id)
    
    # Get total count
    total = query.count()
    
    # Get comments ordered by created_at (latest first)
    comments = (
        query
        .order_by(Comment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return comments, total


def get_comment_by_id(db: Session, comment_id: str) -> Comment | None:
    """
    Get a single comment by ID.
    
    Args:
        db: Database session
        comment_id: UUID of the comment
        
    Returns:
        Comment object if found, None otherwise
    """
    return db.query(Comment).filter(Comment.id == comment_id).first()


def update_comment(
    db: Session,
    comment_id: str,
    new_content: str
) -> Comment | None:
    """
    Update a comment's content.
    
    Args:
        db: Database session
        comment_id: UUID of comment to update
        new_content: New content for the comment
        
    Returns:
        Updated Comment object if found, None otherwise
    """
    comment = get_comment_by_id(db, comment_id)
    if comment is None:
        return None
    
    comment.content = new_content
    db.commit()
    db.refresh(comment)
    
    return comment


def delete_comment(db: Session, comment_id: str) -> bool:
    """
    Delete a comment.
    
    Args:
        db: Database session
        comment_id: UUID of comment to delete
        
    Returns:
        True if deleted, False if not found
    """
    comment = get_comment_by_id(db, comment_id)
    if comment is None:
        return False
    
    db.delete(comment)
    db.commit()
    
    return True
