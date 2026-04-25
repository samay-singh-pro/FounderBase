"""Message router endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.messages.models import Conversation
from sqlalchemy import or_, and_
from app.features.messages.schemas import (
    MessageCreate,
    MessageResponse,
    ConversationCreate,
    ConversationStart,
    ConversationResponse,
    ReactionCreate,
    ReactionResponse,
    BlockUserResponse,
    MuteConversationResponse,
)
from app.features.messages.service import MessageService
from app.features.messages.websocket import manager

router = APIRouter(prefix="/messages", tags=["messages"])



# ============================================================================
# Conversation Endpoints
# ============================================================================

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all accepted conversations for current user."""
    conversations = MessageService.get_conversations(
        db=db,
        current_user_id=current_user.id,
        include_pending=True  # Changed to True to show all conversations including pending
    )
    return conversations


@router.get("/conversations/check/{user_id}")
def check_conversation_exists(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if a conversation exists with a specific user.
    Returns conversation details if exists, null if not.
    """
    
    # Find conversation between current user and the specified user
    conversation = db.query(Conversation).filter(
        or_(
            and_(Conversation.user1_id == current_user.id, Conversation.user2_id == user_id),
            and_(Conversation.user1_id == user_id, Conversation.user2_id == current_user.id)
        ),
        Conversation.status != "declined"  # Exclude declined conversations
    ).first()
    
    if conversation:
        return {
            "exists": True,
            "conversation_id": conversation.id,
            "status": conversation.status
        }
    else:
        return {
            "exists": False,
            "conversation_id": None,
            "status": None
        }


@router.get("/online-status")
def get_online_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get online status for users in conversations.
    Returns a dict of user_id -> is_online.
    Excludes blocked users.
    """
    from app.features.messages.models import Conversation, BlockedUser
    from sqlalchemy import or_, and_
    
    # Get all conversations for current user
    conversations = db.query(Conversation).filter(
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id
        ),
        Conversation.status != "declined"
    ).all()
    
    # Get other user IDs from conversations
    user_ids = set()
    for conv in conversations:
        other_user_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
        user_ids.add(other_user_id)
    
    # Get blocked user IDs (both directions)
    blocked_ids = (
        db.query(BlockedUser.blocked_id)
        .filter(BlockedUser.blocker_id == current_user.id)
        .all()
    )
    blocker_ids = (
        db.query(BlockedUser.blocker_id)
        .filter(BlockedUser.blocked_id == current_user.id)
        .all()
    )
    blocked_user_ids = {str(user_id[0]) for user_id in blocked_ids} | {str(user_id[0]) for user_id in blocker_ids}
    
    # Filter out blocked users
    user_ids = user_ids - blocked_user_ids
    
    # Check online status and last_seen for each user
    from app.features.auth.models import User
    
    online_status = {}
    for user_id in user_ids:
        is_online = manager.is_user_online(user_id)
        user = db.query(User).filter(User.id == user_id).first()
        
        status_info = {
            "is_online": is_online
        }
        
        # Always include last_seen if available (regardless of online status)
        if user and user.last_seen:
            last_seen_str = user.last_seen.isoformat() + 'Z' if not user.last_seen.isoformat().endswith('Z') else user.last_seen.isoformat()
            status_info["last_seen"] = last_seen_str
        
        online_status[user_id] = status_info
    
    return online_status


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_or_get_conversation(
    conversation_data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation or get existing one."""
    conversation = MessageService.get_or_create_conversation(
        db=db,
        current_user_id=current_user.id,
        recipient_id=conversation_data.recipient_id
    )
    
    # Get conversation with metadata (efficient - single conversation only)
    conv_dict = MessageService.get_conversation_with_metadata(
        db=db,
        conversation_id=conversation.id,
        current_user_id=current_user.id
    )
    
    return conv_dict


@router.post("/conversations/start", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def start_conversation(
    data: ConversationStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a conversation and optionally send the first message in one call."""
    conversation = MessageService.get_or_create_conversation(
        db=db,
        current_user_id=current_user.id,
        recipient_id=data.recipient_id
    )

    if data.message:
        message_data = MessageCreate(
            conversation_id=conversation.id,
            content=data.message
        )
        MessageService.send_message(
            db=db,
            message_data=message_data,
            current_user_id=current_user.id
        )

    # Return conversation with metadata (efficient - single conversation only)
    conv_dict = MessageService.get_conversation_with_metadata(
        db=db,
        conversation_id=conversation.id,
        current_user_id=current_user.id
    )

    return conv_dict


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific conversation by ID."""
    conversations = MessageService.get_conversations(
        db=db,
        current_user_id=current_user.id,
        include_pending=True
    )
    
    conv = next((c for c in conversations if c["id"] == conversation_id), None)
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conv


# ============================================================================
# Message Request Endpoints
# ============================================================================

@router.get("/requests", response_model=List[ConversationResponse])
def get_message_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get pending message requests (where current user is recipient)."""
    requests = MessageService.get_pending_requests(
        db=db,
        current_user_id=current_user.id
    )
    return requests


@router.post("/requests/{conversation_id}/accept", response_model=ConversationResponse)
def accept_message_request(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a pending message request."""
    conversation = MessageService.accept_conversation(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id
    )
    
    # Get conversation with metadata (efficient - single conversation only)
    conv_dict = MessageService.get_conversation_with_metadata(
        db=db,
        conversation_id=conversation.id,
        current_user_id=current_user.id
    )
    
    return conv_dict


@router.post("/requests/{conversation_id}/decline", response_model=ConversationResponse)
def decline_message_request(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decline a pending message request."""
    conversation = MessageService.decline_conversation(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id
    )
    
    # Get conversation with metadata (efficient - single conversation only)
    conv_dict = MessageService.get_conversation_with_metadata(
        db=db,
        conversation_id=conversation.id,
        current_user_id=current_user.id
    )
    
    return conv_dict


# ============================================================================
# Message Endpoints
# ============================================================================

@router.get("/{conversation_id}", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages in a conversation."""
    messages = MessageService.get_messages(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    return messages


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message in a conversation."""
    print(f"\n=== SEND MESSAGE REQUEST ===")
    print(f"Current User ID: {current_user.id}")
    print(f"Conversation ID: {message_data.conversation_id}")
    print(f"Message Content: {message_data.content[:50]}...")
    
    message = MessageService.send_message(
        db=db,
        message_data=message_data,
        current_user_id=current_user.id
    )
    
    print(f"Message sent successfully - ID: {message.id}")
    return message


@router.patch("/{message_id}/read", response_model=MessageResponse)
def mark_message_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a message as read."""
    message = MessageService.mark_message_as_read(
        db=db,
        message_id=message_id,
        current_user_id=current_user.id
    )
    return message


@router.post("/conversations/{conversation_id}/mark-read")
def mark_conversation_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all messages in a conversation as read."""
    updated_count = MessageService.mark_conversation_as_read(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id
    )
    return {"message": f"Marked {updated_count} messages as read"}


# ============================================================================
# Message Actions
# ============================================================================

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation (soft delete for current user)."""
    from app.features.messages.models import Conversation
    
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id
        )
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # For now, hard delete. In production, you might want soft delete
    db.delete(conversation)
    db.commit()
    
    return {"message": "Conversation deleted successfully"}


@router.patch("/{message_id}/pin")
def toggle_pin_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pin or unpin a message."""
    from app.features.messages.models import Message
    
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Toggle pin status
    message.is_pinned = not message.is_pinned
    db.commit()
    db.refresh(message)
    
    return {
        "message_id": message.id,
        "is_pinned": message.is_pinned,
        "message": f"Message {'pinned' if message.is_pinned else 'unpinned'} successfully"
    }


@router.delete("/{message_id}")
def delete_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a message (soft delete)."""
    from app.features.messages.models import Message
    
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or you don't have permission to delete it"
        )
    
    # Soft delete
    message.is_deleted = True
    message.content = "This message was deleted"
    db.commit()
    
    return {"message": "Message deleted successfully"}


@router.post("/{message_id}/reactions")
def add_reaction(
    message_id: str,
    reaction_data: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an emoji reaction to a message."""
    from app.features.messages.models import Message, MessageReaction
    import uuid
    
    # Verify message exists
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if user already reacted with this emoji
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == reaction_data.emoji
    ).first()
    
    if existing:
        # Remove reaction if it already exists (toggle)
        db.delete(existing)
        db.commit()
        return {"message": "Reaction removed", "added": False}
    
    # Add new reaction
    reaction = MessageReaction(
        id=str(uuid.uuid4()),
        message_id=message_id,
        user_id=current_user.id,
        emoji=reaction_data.emoji
    )
    db.add(reaction)
    db.commit()
    
    return {"message": "Reaction added", "added": True}


@router.get("/{message_id}/reactions", response_model=list[ReactionResponse])
def get_reactions(
    message_id: str,
    db: Session = Depends(get_db)
):
    """Get all reactions for a message."""
    from app.features.messages.models import MessageReaction
    from sqlalchemy import func
    
    # Group reactions by emoji and count
    reactions = db.query(
        MessageReaction.emoji,
        func.count(MessageReaction.id).label('count')
    ).filter(
        MessageReaction.message_id == message_id
    ).group_by(MessageReaction.emoji).all()
    
    return [{"emoji": r.emoji, "count": r.count} for r in reactions]


# ============================================================================
# Block and Mute Endpoints
# ============================================================================

@router.post("/users/{user_id}/block", response_model=BlockUserResponse)
def block_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Block a user to prevent receiving messages from them."""
    result = MessageService.block_user(
        db=db,
        blocker_id=current_user.id,
        blocked_id=user_id
    )
    return result


@router.delete("/users/{user_id}/block", response_model=BlockUserResponse)
def unblock_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unblock a user to allow receiving messages from them again."""
    result = MessageService.unblock_user(
        db=db,
        blocker_id=current_user.id,
        blocked_id=user_id
    )
    return result


@router.post("/conversations/{conversation_id}/mute", response_model=MuteConversationResponse)
def mute_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mute a conversation to stop receiving notifications."""
    result = MessageService.mute_conversation(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id
    )
    return result


@router.delete("/conversations/{conversation_id}/mute", response_model=MuteConversationResponse)
def unmute_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unmute a conversation to resume receiving notifications."""
    result = MessageService.unmute_conversation(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id
    )
    return result


@router.get("/users/{user_id}/block-status")
def check_block_status(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if there's a block relationship between current user and specified user."""
    from app.features.messages.models import BlockedUser
    from sqlalchemy import or_, and_
    
    block_record = db.query(BlockedUser).filter(
        or_(
            and_(BlockedUser.blocker_id == current_user.id, BlockedUser.blocked_id == user_id),
            and_(BlockedUser.blocker_id == user_id, BlockedUser.blocked_id == current_user.id)
        )
    ).first()
    
    if block_record:
        return {
            "is_blocked": True,
            "blocked_by_me": block_record.blocker_id == current_user.id,
            "blocked_by_them": block_record.blocked_id == current_user.id
        }
    
    return {
        "is_blocked": False,
        "blocked_by_me": False,
        "blocked_by_them": False
    }


@router.get("/blocked-users")
def get_blocked_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of all blocked user IDs (users I blocked + users who blocked me)."""
    from app.features.messages.models import BlockedUser
    from sqlalchemy import or_
    
    # Get all block records involving current user
    block_records = db.query(BlockedUser).filter(
        or_(
            BlockedUser.blocker_id == current_user.id,
            BlockedUser.blocked_id == current_user.id
        )
    ).all()
    
    # Collect all blocked user IDs
    blocked_user_ids = set()
    for record in block_records:
        if record.blocker_id == current_user.id:
            blocked_user_ids.add(record.blocked_id)
        else:
            blocked_user_ids.add(record.blocker_id)
    
    return {
        "blocked_user_ids": list(blocked_user_ids)
    }
