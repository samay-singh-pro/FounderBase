"""Message service layer for business logic."""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException, status
from typing import Optional

from app.features.messages.models import Conversation, ConversationMember, Message, ConversationStatus
from app.features.messages.schemas import MessageCreate, ConversationCreate
from app.features.auth.models import User
from app.features.media.service import assert_owned as assert_media_owned


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

    # ------------------------------------------------------------------
    # Group helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_recipient_ids(db: Session, conversation: Conversation) -> list[str]:
        """Return all user IDs that should receive broadcasts for this conversation.

        For DMs this is just user1 + user2; for groups it's every row in
        ``conversation_members``. Lets the WS layer be agnostic to which.
        """
        if conversation.is_group:
            rows = (
                db.query(ConversationMember.user_id)
                .filter(ConversationMember.conversation_id == conversation.id)
                .all()
            )
            return [str(r[0]) for r in rows]
        ids = []
        if conversation.user1_id:
            ids.append(str(conversation.user1_id))
        if conversation.user2_id:
            ids.append(str(conversation.user2_id))
        return ids

    @staticmethod
    def is_member(db: Session, conversation_id: str, user_id: str) -> bool:
        return (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
            .first()
            is not None
        )

    @staticmethod
    def is_admin(db: Session, conversation_id: str, user_id: str) -> bool:
        m = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
            .first()
        )
        return m is not None and m.role == "admin"

    @staticmethod
    def _is_participant(db: Session, conversation: "Conversation | None", user_id: str) -> bool:
        """Whether a user takes part in a conversation — DMs and groups alike.

        Groups keep their roster in conversation_members (user1/user2 only carry
        the creator), so a plain user1/user2 comparison wrongly excludes every
        non-creator member."""
        if conversation is None:
            return False
        if conversation.is_group:
            return MessageService.is_member(db, conversation.id, user_id)
        return conversation.user1_id == user_id or conversation.user2_id == user_id

    @staticmethod
    def get_group_members(db: Session, conversation_id: str) -> list[dict]:
        """Return public details for every member of a group, joined with User."""
        rows = (
            db.query(
                ConversationMember.user_id,
                ConversationMember.role,
                ConversationMember.joined_at,
                User.username,
                User.avatar_url,
            )
            .join(User, User.id == ConversationMember.user_id)
            .filter(ConversationMember.conversation_id == conversation_id)
            .order_by(ConversationMember.joined_at.asc())
            .all()
        )
        return [
            {
                "user_id": r.user_id,
                "username": r.username,
                "avatar_url": r.avatar_url,
                "role": r.role,
                "joined_at": r.joined_at,
            }
            for r in rows
        ]

    @staticmethod
    def create_group(
        db: Session,
        creator_id: str,
        name: str,
        member_ids: list[str],
        avatar_url: str | None = None,
    ) -> Conversation:
        """Create a new group conversation. The creator is added as the admin;
        every supplied member_id is added as a regular member. Self is silently
        skipped to avoid a duplicate row."""
        if not name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group name is required",
            )

        # Deduplicate, drop the creator (added as admin), drop empty/blank IDs.
        unique_members = {mid for mid in member_ids if mid and mid != creator_id}
        if not unique_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A group must include at least one other member",
            )

        # Verify all supplied users exist before creating anything.
        existing_users = {
            str(u.id)
            for u in db.query(User.id).filter(User.id.in_(unique_members)).all()
        }
        missing = unique_members - existing_users
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User(s) not found: {', '.join(sorted(missing))}",
            )

        # Stuff the creator into user1/user2 to satisfy the legacy NOT NULL
        # constraint on existing SQLite databases. They're unused for groups —
        # everywhere we branch on conv.is_group and read from
        # conversation_members instead. DM lookups also filter is_group=False,
        # so this never gets confused with a real DM.
        conversation = Conversation(
            user1_id=creator_id,
            user2_id=creator_id,
            status=ConversationStatus.ACCEPTED,  # Groups skip the pending/accept handshake.
            created_by_id=creator_id,
            is_group=True,
            name=name.strip(),
            avatar_url=avatar_url,
        )
        db.add(conversation)
        db.flush()

        db.add(ConversationMember(
            conversation_id=conversation.id,
            user_id=creator_id,
            role="admin",
        ))
        for uid in unique_members:
            db.add(ConversationMember(
                conversation_id=conversation.id,
                user_id=uid,
                role="member",
            ))

        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def update_group(
        db: Session,
        conversation_id: str,
        requester_id: str,
        name: str | None = None,
        avatar_url: str | None = None,
    ) -> Conversation:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation or not conversation.is_group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        if not MessageService.is_admin(db, conversation_id, requester_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can edit the group")

        if name is not None:
            name = name.strip()
            if not name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group name is required")
            conversation.name = name
        if avatar_url is not None:
            conversation.avatar_url = avatar_url or None

        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def add_group_members(
        db: Session,
        conversation_id: str,
        requester_id: str,
        member_ids: list[str],
    ) -> Conversation:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation or not conversation.is_group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        if not MessageService.is_admin(db, conversation_id, requester_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can add members")

        unique = {mid for mid in member_ids if mid}
        if not unique:
            return conversation

        # Skip users already in the group.
        existing = {
            r[0]
            for r in db.query(ConversationMember.user_id)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id.in_(unique),
            )
            .all()
        }
        to_add = unique - existing
        if not to_add:
            return conversation

        # Reject any user IDs that don't exist.
        existing_users = {
            str(u.id)
            for u in db.query(User.id).filter(User.id.in_(to_add)).all()
        }
        missing = to_add - existing_users
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User(s) not found: {', '.join(sorted(missing))}",
            )

        for uid in to_add:
            db.add(ConversationMember(
                conversation_id=conversation_id,
                user_id=uid,
                role="member",
            ))
        conversation.updated_at = func.now()
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def remove_group_member(
        db: Session,
        conversation_id: str,
        requester_id: str,
        target_id: str,
    ) -> Conversation:
        """Admin removes another member, OR a member removes themselves (leave).

        Admin can leave too, but if the last remaining member is the admin and
        nobody else is in the group we just delete the whole conversation.
        """
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation or not conversation.is_group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        is_self = requester_id == target_id
        if not is_self and not MessageService.is_admin(db, conversation_id, requester_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can remove others")

        membership = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == target_id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not in this group")

        db.delete(membership)
        db.flush()

        remaining = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id
        ).count()

        if remaining == 0:
            db.delete(conversation)
            db.commit()
            return conversation

        # If the admin left, promote the oldest remaining member to admin so the
        # group keeps a moderator. Otherwise nobody could rename/add later.
        if membership.role == "admin":
            still_has_admin = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conversation_id,
                    ConversationMember.role == "admin",
                )
                .first()
                is not None
            )
            if not still_has_admin:
                next_admin = (
                    db.query(ConversationMember)
                    .filter(ConversationMember.conversation_id == conversation_id)
                    .order_by(ConversationMember.joined_at.asc())
                    .first()
                )
                if next_admin:
                    next_admin.role = "admin"

        conversation.updated_at = func.now()
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def delete_group(
        db: Session,
        conversation_id: str,
        requester_id: str,
    ) -> None:
        """Permanently delete a group along with all its messages and member
        rows (admin only). The ORM ``all, delete-orphan`` cascade on
        Conversation.messages/members removes those for us."""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation or not conversation.is_group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        if not MessageService.is_admin(db, conversation_id, requester_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete the group",
            )

        db.delete(conversation)
        db.commit()

    # ------------------------------------------------------------------
    # Conversations (DMs + groups)
    # ------------------------------------------------------------------

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
        # Group conversations the user is in (membership via conversation_members).
        member_conv_ids = db.query(ConversationMember.conversation_id).filter(
            ConversationMember.user_id == current_user_id
        ).subquery()

        query = db.query(Conversation).filter(
            or_(
                Conversation.user1_id == current_user_id,
                Conversation.user2_id == current_user_id,
                Conversation.id.in_(member_conv_ids),
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
        """Build conversation dictionary with metadata for both DMs and groups."""
        from app.features.messages.models import MutedConversation, BlockedUser

        # For DMs we identify the other user explicitly; for groups we surface
        # the member list and leave the "other_user_*" fields null.
        other_user_id = None
        other_user = None
        members_payload: list[dict] | None = None
        member_count: int | None = None

        if conv.is_group:
            members_payload = MessageService.get_group_members(db, conv.id)
            member_count = len(members_payload)
        else:
            other_user_id = conv.user2_id if conv.user1_id == current_user_id else conv.user1_id
            other_user = db.query(User).filter(User.id == other_user_id).first() if other_user_id else None

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
        
        # Check if conversation is muted for current user
        is_muted = db.query(MutedConversation).filter(
            MutedConversation.user_id == current_user_id,
            MutedConversation.conversation_id == conv.id
        ).first() is not None
        
        # Block status only applies to DMs.
        is_blocked = False
        is_blocked_by_me = False
        is_blocked_by_them = False
        if not conv.is_group and other_user_id:
            block_record = db.query(BlockedUser).filter(
                or_(
                    and_(BlockedUser.blocker_id == current_user_id, BlockedUser.blocked_id == other_user_id),
                    and_(BlockedUser.blocker_id == other_user_id, BlockedUser.blocked_id == current_user_id)
                )
            ).first()
            is_blocked = block_record is not None
            is_blocked_by_me = block_record is not None and block_record.blocker_id == current_user_id
            is_blocked_by_them = block_record is not None and block_record.blocked_id == current_user_id

        return {
            "id": conv.id,
            "user1_id": conv.user1_id,
            "user2_id": conv.user2_id,
            "status": conv.status.value,
            "created_by_id": conv.created_by_id,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "is_group": bool(conv.is_group),
            "name": conv.name,
            "avatar_url": conv.avatar_url,
            "other_user_id": other_user_id,
            "other_user_username": (other_user.username if other_user else None) if not conv.is_group else None,
            "other_user_avatar_url": (other_user.avatar_url if other_user else None) if not conv.is_group else None,
            "last_message": last_message.content if last_message else None,
            "last_message_time": last_message.created_at if last_message else None,
            "unread_count": unread_count,
            "is_muted": is_muted,
            "is_blocked": is_blocked,
            "is_blocked_by_me": is_blocked_by_me,
            "is_blocked_by_them": is_blocked_by_them,
            "members": members_payload,
            "member_count": member_count,
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
                "other_user_avatar_url": requester.avatar_url if requester else None,
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
        # For groups, participation is encoded in conversation_members.
        if conversation.is_group:
            authorized = MessageService.is_member(db, conversation.id, current_user_id)
        else:
            authorized = (
                conversation.user1_id == current_user_id
                or conversation.user2_id == current_user_id
            )
        if not authorized:
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
        from app.features.messages.models import BlockedUser
        
        # Get conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == message_data.conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Authorization: DMs check user1/user2; groups check conversation_members.
        if conversation.is_group:
            if not MessageService.is_member(db, conversation.id, current_user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to send messages in this conversation"
                )
            other_user_id = None
            block_exists = None
        else:
            if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to send messages in this conversation"
                )
            other_user_id = conversation.user2_id if conversation.user1_id == current_user_id else conversation.user1_id
            block_exists = db.query(BlockedUser).filter(
                or_(
                    and_(BlockedUser.blocker_id == current_user_id, BlockedUser.blocked_id == other_user_id),
                    and_(BlockedUser.blocker_id == other_user_id, BlockedUser.blocked_id == current_user_id)
                )
            ).first()

        if block_exists:
            if block_exists.blocker_id == current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You have blocked this user. Unblock them to send messages."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot send messages to this user."
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
        
        # Require either text or a media attachment
        media_id = getattr(message_data, "media_id", None)
        if not message_data.content.strip() and not media_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message must include text or a media attachment",
            )

        if media_id:
            assert_media_owned(db, [media_id], current_user_id)

        # Create message
        new_message = Message(
            conversation_id=message_data.conversation_id,
            sender_id=current_user_id,
            content=message_data.content,
            is_read=False,
            media_id=media_id,
        )

        # Update conversation timestamp
        conversation.updated_at = func.now()

        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        # Initialize empty reactions list for new message
        new_message._reaction_counts = []

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
        
        # Check if user is part of conversation (DM user1/user2 or group member).
        if conversation.is_group:
            authorized = MessageService.is_member(db, conversation_id, current_user_id)
        else:
            authorized = (
                conversation.user1_id == current_user_id
                or conversation.user2_id == current_user_id
            )
        if not authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view messages in this conversation"
            )

        # Get messages
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).offset(offset).limit(limit).all()
        
        # Add grouped reactions to each message as a transient attribute
        from app.features.messages.models import MessageReaction
        for message in messages:
            reactions = db.query(
                MessageReaction.emoji,
                func.count(MessageReaction.id).label('count')
            ).filter(
                MessageReaction.message_id == message.id
            ).group_by(MessageReaction.emoji).all()
            
            # Attach as a plain Python attribute (not the SQLAlchemy relationship)
            message._reaction_counts = [{"emoji": r.emoji, "count": r.count} for r in reactions]
        
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

        # Check if user is part of conversation. For groups the participants live
        # in conversation_members (user1/user2 only hold the creator), so a plain
        # user1/user2 check would 403 every non-creator member.
        if not MessageService._is_participant(db, conversation, current_user_id):
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
        
        # Add grouped reactions
        from app.features.messages.models import MessageReaction
        reactions = db.query(
            MessageReaction.emoji,
            func.count(MessageReaction.id).label('count')
        ).filter(
            MessageReaction.message_id == message.id
        ).group_by(MessageReaction.emoji).all()
        
        message._reaction_counts = [{"emoji": r.emoji, "count": r.count} for r in reactions]
        
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
        
        # Check if user is part of conversation (group-aware — see note above).
        if not MessageService._is_participant(db, conversation, current_user_id):
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

    @staticmethod
    def block_user(db: Session, blocker_id: str, blocked_id: str) -> dict:
        """
        Block a user. This prevents them from sending messages.
        
        Args:
            db: Database session
            blocker_id: ID of the user doing the blocking
            blocked_id: ID of the user being blocked
            
        Returns:
            Dictionary with block status
        """
        from app.features.messages.models import BlockedUser
        
        # Can't block yourself
        if blocker_id == blocked_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot block yourself"
            )
        
        # Check if user exists
        blocked_user = db.query(User).filter(User.id == blocked_id).first()
        if not blocked_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if already blocked
        existing_block = db.query(BlockedUser).filter(
            BlockedUser.blocker_id == blocker_id,
            BlockedUser.blocked_id == blocked_id
        ).first()
        
        if existing_block:
            # Already blocked, return status
            return {
                "blocked": True,
                "blocked_user_id": blocked_id,
                "message": f"User {blocked_user.username} is already blocked"
            }
        
        # Create block record
        new_block = BlockedUser(
            blocker_id=blocker_id,
            blocked_id=blocked_id
        )
        db.add(new_block)
        db.commit()
        
        return {
            "blocked": True,
            "blocked_user_id": blocked_id,
            "message": f"User {blocked_user.username} has been blocked"
        }

    @staticmethod
    def unblock_user(db: Session, blocker_id: str, blocked_id: str) -> dict:
        """
        Unblock a user.
        
        Args:
            db: Database session
            blocker_id: ID of the user doing the unblocking
            blocked_id: ID of the user being unblocked
            
        Returns:
            Dictionary with unblock status
        """
        from app.features.messages.models import BlockedUser
        
        # Find and delete the block record
        block_record = db.query(BlockedUser).filter(
            BlockedUser.blocker_id == blocker_id,
            BlockedUser.blocked_id == blocked_id
        ).first()
        
        if not block_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not blocked"
            )
        
        db.delete(block_record)
        db.commit()
        
        blocked_user = db.query(User).filter(User.id == blocked_id).first()
        username = blocked_user.username if blocked_user else "User"
        
        return {
            "blocked": False,
            "blocked_user_id": blocked_id,
            "message": f"User {username} has been unblocked"
        }

    @staticmethod
    def mute_conversation(db: Session, user_id: str, conversation_id: str) -> dict:
        """
        Mute a conversation to stop receiving notifications.
        
        Args:
            db: Database session
            user_id: ID of the user muting the conversation
            conversation_id: ID of the conversation to mute
            
        Returns:
            Dictionary with mute status
        """
        from app.features.messages.models import MutedConversation
        
        # Check if conversation exists
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user is part of conversation
        if conversation.user1_id != user_id and conversation.user2_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to mute this conversation"
            )
        
        # Check if already muted
        existing_mute = db.query(MutedConversation).filter(
            MutedConversation.user_id == user_id,
            MutedConversation.conversation_id == conversation_id
        ).first()
        
        if existing_mute:
            return {
                "muted": True,
                "conversation_id": conversation_id,
                "message": "Conversation is already muted"
            }
        
        # Create mute record
        new_mute = MutedConversation(
            user_id=user_id,
            conversation_id=conversation_id
        )
        db.add(new_mute)
        db.commit()
        
        return {
            "muted": True,
            "conversation_id": conversation_id,
            "message": "Conversation muted successfully"
        }

    @staticmethod
    def unmute_conversation(db: Session, user_id: str, conversation_id: str) -> dict:
        """
        Unmute a conversation to resume receiving notifications.
        
        Args:
            db: Database session
            user_id: ID of the user unmuting the conversation
            conversation_id: ID of the conversation to unmute
            
        Returns:
            Dictionary with unmute status
        """
        from app.features.messages.models import MutedConversation
        
        # Find and delete the mute record
        mute_record = db.query(MutedConversation).filter(
            MutedConversation.user_id == user_id,
            MutedConversation.conversation_id == conversation_id
        ).first()
        
        if not mute_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation is not muted"
            )
        
        db.delete(mute_record)
        db.commit()
        
        return {
            "muted": False,
            "conversation_id": conversation_id,
            "message": "Conversation unmuted successfully"
        }
