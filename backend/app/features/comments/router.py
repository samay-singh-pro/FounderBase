"""Comments API routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.comments import service
from app.features.comments.schemas import CommentCreate, CommentList, CommentPublic, CommentUpdate
from app.features.opportunities.service import get_opportunity_by_id
from app.features.opportunities.router import get_current_user_optional

router = APIRouter(tags=["Comments"])


@router.post(
    "/opportunities/{opportunity_id}/comments",
    response_model=CommentPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a comment on an opportunity",
    description="Add a comment to an opportunity (authentication required)"
)
def create_comment(
    opportunity_id: str,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentPublic:
    """
    Create a new comment on an opportunity.
    
    **Authentication required**: Bearer token in Authorization header
    
    - **opportunity_id**: UUID of the opportunity to comment on
    - **content**: Comment text (2-500 characters)
    
    Returns the created comment with ID and timestamp.
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    # Create comment
    user_id = str(current_user.id)
    comment = service.create_comment(db, user_id, opportunity_id, comment_data)
    
    # Return comment with username and ownership
    return CommentPublic(
        id=comment.id,
        content=comment.content,
        opportunity_id=comment.opportunity_id,
        user_id=comment.user_id,
        username=current_user.username,
        created_at=comment.created_at,
        is_owner=True
    )


@router.get(
    "/opportunities/{opportunity_id}/comments",
    response_model=CommentList,
    summary="Get all comments for an opportunity",
    description="Retrieve all comments with usernames and ownership info"
)
def get_comments(
    opportunity_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> CommentList:
    """
    Get all comments for an opportunity with usernames and ownership flags.
    
    **Query parameters:**
    - **skip**: Records to skip for pagination (default: 0)
    - **limit**: Max records to return (default: 50, max: 100)
    
    Authentication is optional. If authenticated, is_owner will be set for your comments.
    """
    # Verify opportunity exists
    opportunity = get_opportunity_by_id(db, opportunity_id)
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found"
        )
    
    # Enforce maximum limit
    if limit > 100:
        limit = 100
    
    current_user_id = str(current_user.id) if current_user else None
    
    comments, total = service.get_comments_by_opportunity(
        db=db,
        opportunity_id=opportunity_id,
        current_user_id=current_user_id,
        skip=skip,
        limit=limit
    )
    
    return CommentList(
        comments=[CommentPublic(**c) for c in comments],
        total=total
    )


@router.put(
    "/comments/{comment_id}",
    response_model=CommentPublic,
    summary="Update a comment",
    description="Edit your own comment (authentication required)"
)
def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentPublic:
    """
    Update a comment's content.
    
    You can only edit your own comments.
    
    **Authentication required**: Bearer token
    
    - **comment_id**: UUID of the comment to update
    - **content**: New comment content (2-500 characters)
    """
    comment = service.get_comment_by_id(db, comment_id)
    
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check ownership
    if comment.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments"
        )
    
    # Update comment
    updated_comment = service.update_comment(db, comment_id, comment_data.content)
    
    return CommentPublic.model_validate(updated_comment)


@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a comment",
    description="Delete your own comment (authentication required)"
)
def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a comment.
    
    You can only delete your own comments.
    
    **Authentication required**: Bearer token
    """
    comment = service.get_comment_by_id(db, comment_id)
    
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check ownership
    if comment.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )
    
    service.delete_comment(db, comment_id)
