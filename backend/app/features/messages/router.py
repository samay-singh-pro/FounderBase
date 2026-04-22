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
    """
    from app.features.messages.models import Conversation
    from sqlalchemy import or_
    
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
