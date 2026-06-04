"""Comment business logic"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import String

from app.features.comments.models import Comment
from app.features.comments.schemas import CommentCreate
from app.features.auth.models import User
from app.features.media.service import assert_owned as assert_media_owned


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
    if not data.content.strip() and not data.media_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A comment must have text or a media attachment",
        )

    if data.media_id:
        assert_media_owned(db, [data.media_id], user_id)

    comment = Comment(
        content=data.content,
        opportunity_id=opportunity_id,
        user_id=user_id,
        media_id=data.media_id,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


def get_comments_by_opportunity(
    db: Session,
    opportunity_id: str,
    current_user_id: str | None = None,
    skip: int = 0,
    limit: int = 50
) -> tuple[list[dict], int]:
    """
    Get all comments for an opportunity with username and ownership info.
    
    Args:
        db: Database session
        opportunity_id: ID of the opportunity
        current_user_id: ID of current authenticated user (optional)
        skip: Number of records to skip
        limit: Maximum records to return
        
    Returns:
        Tuple of (comments list with username and is_owner, total count)
    """
    # Join Comment with User to pull username + avatar in a single query.
    query = (
        db.query(Comment, User.username, User.avatar_url)
        .join(User, Comment.user_id == User.id.cast(String))
        .filter(Comment.opportunity_id == opportunity_id)
    )

    total = query.count()

    results = (
        query
        .order_by(Comment.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    comments = []
    for comment, username, avatar_url in results:
        comments.append({
            'id': comment.id,
            'content': comment.content,
            'opportunity_id': comment.opportunity_id,
            'user_id': comment.user_id,
            'username': username,
            'avatar_url': avatar_url,
            'created_at': comment.created_at,
            'is_owner': current_user_id == comment.user_id if current_user_id else False,
            'media': comment.media,
        })

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
