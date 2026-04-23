"""Follow business logic"""

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.features.follows.models import Follow
from app.features.auth.models import User


def follow_user(db: Session, follower_id: str, followee_id: str) -> bool:
    """
    Follow a user.
    
    Args:
        db: Database session
        follower_id: ID of user who is following
        followee_id: ID of user being followed
        
    Returns:
        True if follow was added, False if already following or trying to follow self
    """
    # Can't follow yourself
    if follower_id == followee_id:
        return False
    
    # Check if already following
    existing_follow = (
        db.query(Follow)
        .filter(
            Follow.follower_id == follower_id,
            Follow.followee_id == followee_id
        )
        .first()
    )
    
    if existing_follow:
        return False  # Already following
    
    # Create new follow
    follow = Follow(
        follower_id=follower_id,
        followee_id=followee_id
    )
    
    try:
        db.add(follow)
        db.commit()
        return True
    except IntegrityError:
        # Race condition: someone else followed at the same time
        db.rollback()
        return False


def unfollow_user(db: Session, follower_id: str, followee_id: str) -> bool:
    """
    Unfollow a user.
    
    Args:
        db: Database session
        follower_id: ID of user who is unfollowing
        followee_id: ID of user being unfollowed
        
    Returns:
        True if follow was removed, False if wasn't following
    """
    follow = (
        db.query(Follow)
        .filter(
            Follow.follower_id == follower_id,
            Follow.followee_id == followee_id
        )
        .first()
    )
    
    if follow is None:
        return False  # Not following
    
    db.delete(follow)
    db.commit()
    return True


def is_following(db: Session, follower_id: str, followee_id: str) -> bool:
    """
    Check if a user is following another user.
    
    Args:
        db: Database session
        follower_id: ID of potential follower
        followee_id: ID of potential followee
        
    Returns:
        True if follower is following followee, False otherwise
    """
    follow = (
        db.query(Follow)
        .filter(
            Follow.follower_id == follower_id,
            Follow.followee_id == followee_id
        )
        .first()
    )
    
    return follow is not None


def get_followers(
    db: Session,
    user_id: str,
    page: int = 1,
    limit: int = 20
) -> tuple[list[dict], int]:
    """
    Get list of users following a specific user.
    
    Args:
        db: Database session
        user_id: ID of user whose followers to retrieve
        page: Page number (1-based)
        limit: Number of followers per page
        
    Returns:
        Tuple of (followers_list, total_count)
        Each follower is a dict with: id, username, email, followed_at
    """
    # Calculate offset
    offset = (page - 1) * limit
    
    # Get total count
    total = (
        db.query(func.count(Follow.id))
        .filter(Follow.followee_id == user_id)
        .scalar()
    )
    
    # Get followers with user details
    followers_query = (
        db.query(
            User.id,
            User.username,
            User.email,
            Follow.created_at.label('followed_at')
        )
        .join(Follow, Follow.follower_id == User.id)
        .filter(Follow.followee_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    followers = [
        {
            'id': row.id,
            'username': row.username,
            'email': row.email,
            'followed_at': row.followed_at
        }
        for row in followers_query.all()
    ]
    
    return followers, total


def get_following(
    db: Session,
    user_id: str,
    page: int = 1,
    limit: int = 20
) -> tuple[list[dict], int]:
    """
    Get list of users that a specific user is following.
    
    Args:
        db: Database session
        user_id: ID of user whose following to retrieve
        page: Page number (1-based)
        limit: Number of following per page
        
    Returns:
        Tuple of (following_list, total_count)
        Each following is a dict with: id, username, email, followed_at
    """
    # Calculate offset
    offset = (page - 1) * limit
    
    # Get total count
    total = (
        db.query(func.count(Follow.id))
        .filter(Follow.follower_id == user_id)
        .scalar()
    )
    
    # Get following with user details
    following_query = (
        db.query(
            User.id,
            User.username,
            User.email,
            Follow.created_at.label('followed_at')
        )
        .join(Follow, Follow.followee_id == User.id)
        .filter(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    following = [
        {
            'id': row.id,
            'username': row.username,
            'email': row.email,
            'followed_at': row.followed_at
        }
        for row in following_query.all()
    ]
    
    return following, total


def get_suggested_users(
    db: Session,
    user_id: str,
    page: int = 1,
    limit: int = 20
) -> tuple[list[dict], int]:
    """
    Get list of suggested users for a user to follow.
    Returns users that the current user is NOT following (excluding themselves).
    
    Args:
        db: Database session
        user_id: ID of user requesting suggestions
        page: Page number (1-based)
        limit: Number of suggestions per page
        
    Returns:
        Tuple of (suggested_users_list, total_count)
        Each user is a dict with: id, username, email
    """
    # Calculate offset
    offset = (page - 1) * limit
    
    # Get IDs of users that current user is already following
    following_ids_subquery = (
        db.query(Follow.followee_id)
        .filter(Follow.follower_id == user_id)
        .subquery()
    )
    
    # Get users NOT in following list and NOT the current user
    suggested_users_query = (
        db.query(User.id, User.username, User.email)
        .filter(
            User.id != user_id,  # Exclude self
            ~User.id.in_(following_ids_subquery)  # Exclude already following
        )
        .order_by(User.username.asc())  # Alphabetically by username
    )
    
    # Get total count
    total = suggested_users_query.count()
    
    # Get paginated results
    users = suggested_users_query.offset(offset).limit(limit).all()
    
    suggested_users = [
        {
            'id': row.id,
            'username': row.username,
            'email': row.email
        }
        for row in users
    ]
    
    return suggested_users, total
