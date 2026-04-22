"""Message service layer for business logic."""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException, status
from typing import Optional

from app.features.messages.models import Conversation, Message, ConversationStatus
from app.features.messages.schemas import MessageCreate, ConversationCreate
from app.features.auth.models import User


class MessageService:
    """Service class for message-related operations."""

    @staticmethod
    def get_or_create_conversation(
        db: Session, 
        current_user_id: str, 
        recipient_id: str
    ) -> Conversation:
        """
        Get existing conversation between two users or create a new one.
        
        Args:
            db: Database session
            current_user_id: ID of the current user
            recipient_id: ID of the recipient user
            
        Returns:
            Conversation object
        """
        # Check if recipient exists
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient user not found"
            )
        
        # Can't message yourself
        if current_user_id == recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create conversation with yourself"
            )
        
        # Check if conversation already exists (either direction)
        existing_conversation = db.query(Conversation).filter(
            or_(
                and_(Conversation.user1_id == current_user_id, Conversation.user2_id == recipient_id),
                and_(Conversation.user1_id == recipient_id, Conversation.user2_id == current_user_id)
            )
        ).first()
        
        if existing_conversation:
            return existing_conversation
        
        # Create new conversation with pending status
        new_conversation = Conversation(
            user1_id=current_user_id,
            user2_id=recipient_id,
            status=ConversationStatus.PENDING,
            created_by_id=current_user_id
        )
        db.add(new_conversation)
        db.commit()
        db.refresh(new_conversation)
        
        return new_conversation

    @staticmethod
    def get_conversations(
        db: Session,
        current_user_id: str,
        include_pending: bool = False
    ) -> list[dict]:
        """
        Get all conversations for current user.
        
        Args:
            db: Database session
            current_user_id: ID of the current user
            include_pending: Whether to include pending conversations
            
        Returns:
            List of conversation dictionaries with additional metadata
        """
        query = db.query(Conversation).filter(
            or_(
                Conversation.user1_id == current_user_id,
                Conversation.user2_id == current_user_id
            )
        )
        
        if not include_pending:
            # Show ALL conversations - accepted + ALL pending (both sent and received)
            query = query.filter(
                Conversation.status == ConversationStatus.ACCEPTED
            )
        else:
            # When include_pending=True, show everything
            query = query.filter(
                Conversation.status != ConversationStatus.DECLINED
            )
        
        conversations = query.order_by(Conversation.updated_at.desc()).all()
        
        result = []
        for conv in conversations:
            conv_dict = MessageService._build_conversation_dict(db, conv, current_user_id)
            result.append(conv_dict)
        
        return result

    @staticmethod
    def _build_conversation_dict(db: Session, conv: Conversation, current_user_id: str) -> dict:
        """
        Build conversation dictionary with metadata.
        Internal helper method to avoid code duplication.
        
        Args:
            db: Database session
            conv: Conversation object
            current_user_id: ID of the current user
            
        Returns:
            Dictionary with conversation data and metadata
        """
        # Determine the other user
        other_user_id = conv.user2_id if conv.user1_id == current_user_id else conv.user1_id
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Get last message
        last_message = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).first()
        
        # Count unread messages
        unread_count = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user_id,
            Message.is_read == False
        ).count()
        
        return {
            "id": conv.id,
            "user1_id": conv.user1_id,
            "user2_id": conv.user2_id,
            "status": conv.status.value,
            "created_by_id": conv.created_by_id,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "other_user_id": other_user_id,
            "other_user_username": other_user.username if other_user else "Unknown",
            "last_message": last_message.content if last_message else None,
            "last_message_time": last_message.created_at if last_message else None,
            "unread_count": unread_count
        }

    @staticmethod
    def get_conversation_with_metadata(
        db: Session,
        conversation_id: str,
        current_user_id: str
    ) -> dict:
        """
        Get a single conversation with metadata.
        
        Args:
            db: Database session
            conversation_id: ID of the conversation
            current_user_id: ID of the current user
            
        Returns:
            Conversation dictionary with metadata
            
        Raises:
            HTTPException: If conversation not found or user not authorized
        """
        # Get conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            or_(
                Conversation.user1_id == current_user_id,
                Conversation.user2_id == current_user_id
            )
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Build and return conversation dict with metadata
        return MessageService._build_conversation_dict(db, conversation, current_user_id)

    @staticmethod
    def get_pending_requests(db: Session, current_user_id: str) -> list[dict]:
        """
        Get pending conversation requests (where user is recipient).
        
        Args:
            db: Database session
            current_user_id: ID of the current user
            
        Returns:
            List of pending conversation dictionaries
        """
        conversations = db.query(Conversation).filter(
            or_(
                Conversation.user1_id == current_user_id,
                Conversation.user2_id == current_user_id
            ),
            Conversation.status == ConversationStatus.PENDING,
            Conversation.created_by_id != current_user_id  # Only requests from others
        ).order_by(Conversation.created_at.desc()).all()
        
        result = []
        for conv in conversations:
            # Get the requester (the person who sent the request)
            requester_id = conv.created_by_id
            requester = db.query(User).filter(User.id == requester_id).first()
            
            # Get first message (if any)
            first_message = db.query(Message).filter(
                Message.conversation_id == conv.id
            ).order_by(Message.created_at.asc()).first()
            
            conv_dict = {
                "id": conv.id,
                "user1_id": conv.user1_id,
                "user2_id": conv.user2_id,
                "status": conv.status.value,
                "created_by_id": conv.created_by_id,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "other_user_id": requester_id,
                "other_user_username": requester.username if requester else "Unknown",
                "last_message": first_message.content if first_message else None,
                "last_message_time": first_message.created_at if first_message else None,
                "unread_count": 0
            }
            result.append(conv_dict)
        
        return result

    @staticmethod
    def get_conversation_by_id(db: Session, conversation_id: str, current_user_id: str) -> Conversation:
        """
        Get a conversation by ID.
        
        Args:
            db: Database session
            conversation_id: ID of the conversation
            current_user_id: ID of the current user
            
        Returns:
            Conversation object
        """
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation"
            )
        
        return conversation

    @staticmethod
    def accept_conversation(db: Session, conversation_id: str, current_user_id: str) -> Conversation:
        """Accept a pending conversation request."""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this conversation"
            )
        
        # Can't accept your own request
        if conversation.created_by_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot accept your own conversation request"
            )
        
        conversation.status = ConversationStatus.ACCEPTED
        db.commit()
        db.refresh(conversation)
        
        return conversation

    @staticmethod
    def decline_conversation(db: Session, conversation_id: str, current_user_id: str) -> Conversation:
        """Decline a pending conversation request."""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this conversation"
            )
        
        conversation.status = ConversationStatus.DECLINED
        db.commit()
        db.refresh(conversation)
        
        return conversation

    @staticmethod
    def send_message(db: Session, message_data: MessageCreate, current_user_id: str) -> Message:
        """
        Send a message in a conversation.
        
        Args:
            db: Database session
            message_data: Message creation data
            current_user_id: ID of the current user
            
        Returns:
            Created message object
        """
        # Get conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == message_data.conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send messages in this conversation"
            )
        
        # Don't allow sending messages in declined conversations
        if conversation.status == ConversationStatus.DECLINED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send messages in a declined conversation"
            )
        
        # If conversation is pending, restrict message sending
        if conversation.status == ConversationStatus.PENDING:
            # The requester can only send ONE initial message
            if conversation.created_by_id == current_user_id:
                # Check if they've already sent a message
                existing_message = db.query(Message).filter(
                    Message.conversation_id == conversation.id,
                    Message.sender_id == current_user_id
                ).first()
                
                if existing_message:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot send more messages until the recipient accepts your request"
                    )
            # The recipient cannot send any messages until they accept
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Must accept the message request before sending messages"
                )
        
        # Create message
        new_message = Message(
            conversation_id=message_data.conversation_id,
            sender_id=current_user_id,
            content=message_data.content,
            is_read=False
        )
        
        # Update conversation timestamp
        conversation.updated_at = func.now()
        
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        return new_message

    @staticmethod
    def get_messages(
        db: Session,
        conversation_id: str,
        current_user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> list[Message]:
        """
        Get messages in a conversation.
        
        Args:
            db: Database session
            conversation_id: ID of the conversation
            current_user_id: ID of the current user
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of message objects
        """
        # Get conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view messages in this conversation"
            )
        
        # Get messages
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).offset(offset).limit(limit).all()
        
        return messages

    @staticmethod
    def mark_message_as_read(db: Session, message_id: str, current_user_id: str) -> Message:
        """Mark a message as read."""
        message = db.query(Message).filter(Message.id == message_id).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Get conversation to check authorization
        conversation = db.query(Conversation).filter(
            Conversation.id == message.conversation_id
        ).first()
        
        # Check if user is part of conversation and not the sender
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to mark this message as read"
            )
        
        if message.sender_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot mark your own message as read"
            )
        
        message.is_read = True
        db.commit()
        db.refresh(message)
        
        return message

    @staticmethod
    def mark_conversation_as_read(db: Session, conversation_id: str, current_user_id: str) -> int:
        """Mark all messages in a conversation as read."""
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this conversation"
            )
        
        # Mark all unread messages from the other user as read
        updated_count = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user_id,
            Message.is_read == False
        ).update({"is_read": True})
        
        db.commit()
        
        return updated_count
