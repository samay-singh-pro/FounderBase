"""
WebSocket router for real-time messaging.

Handles WebSocket connections, authentication, and message routing.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.connection import SessionLocal
from app.features.auth.models import User
from app.features.messages.websocket import manager
from app.features.messages.schemas import MessageCreate
from app.features.messages.service import MessageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time messaging.
    Client connects with: ws://localhost:8000/api/v1/messages/ws?token=<jwt_token>
    """
    # Accept connection first
    await websocket.accept()
    
    # Authenticate user from token
    try:
        payload = decode_access_token(token)
        if payload is None:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=1008, reason="Invalid token")
            return
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Get database session
    db = SessionLocal()
    
    # Update last_seen timestamp when user connects
    user_record = db.query(User).filter(User.id == user_id).first()
    if user_record:
        user_record.last_seen = datetime.now(timezone.utc)
        db.commit()
    
    # Register user connection with manager
    if user_id not in manager.active_connections:
        manager.active_connections[user_id] = set()
    manager.active_connections[user_id].add(websocket)
    
    # Broadcast online status to conversation participants
    await manager.broadcast_online_status(user_id, True, db)
    
    try:
        # Send online status notification
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "user_id": user_id
        })
        
        logger.info(f"User {user_id} connected via WebSocket")
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type")
            
            if message_type == "message":
                await handle_new_message(websocket, message_data, user_id, db)
            
            elif message_type == "typing":
                await handle_typing_indicator(message_data, user_id)
            
            elif message_type == "mark_read":
                await handle_mark_read(message_data, user_id, db)
    
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        await cleanup_connection(websocket, user_id, db)


async def handle_new_message(websocket: WebSocket, message_data: dict, user_id: str, db: Session):
    """Handle incoming message from client."""
    conversation_id = message_data.get("conversation_id")
    content = message_data.get("content")
    
    if not conversation_id or not content:
        await websocket.send_json({
            "type": "error",
            "message": "Missing conversation_id or content"
        })
        return
    
    try:
        # Create message in database
        new_message = MessageService.send_message(
            db=db,
            message_data=MessageCreate(
                conversation_id=conversation_id,
                content=content
            ),
            current_user_id=user_id
        )
        
        # Get conversation to find recipient
        conversation = MessageService.get_conversation_by_id(
            db=db,
            conversation_id=conversation_id,
            current_user_id=user_id
        )
        
        # Determine recipient
        recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
        
        # Prepare message for broadcast
        # Add 'Z' suffix to indicate UTC timezone
        created_at_utc = new_message.created_at.isoformat() + 'Z' if not new_message.created_at.isoformat().endswith('Z') else new_message.created_at.isoformat()
        
        message_response = {
            "type": "message",
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_id": new_message.sender_id,
            "content": new_message.content,
            "is_read": new_message.is_read,
            "created_at": created_at_utc
        }
        
        # Send to both sender and recipient
        await manager.send_message_to_conversation(
            message_response,
            [user_id, recipient_id]
        )
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


async def handle_typing_indicator(message_data: dict, user_id: str):
    """Handle typing indicator from client."""
    conversation_id = message_data.get("conversation_id")
    is_typing = message_data.get("is_typing", False)
    recipient_id = message_data.get("recipient_id")
    
    if conversation_id and recipient_id:
        await manager.broadcast_typing_indicator(
            conversation_id=conversation_id,
            user_id=user_id,
            is_typing=is_typing,
            recipient_id=recipient_id
        )


async def handle_mark_read(message_data: dict, user_id: str, db: Session):
    """Handle mark message as read."""
    message_id = message_data.get("message_id")
    if message_id:
        try:
            MessageService.mark_message_read(
                db=db,
                message_id=message_id,
                current_user_id=user_id
            )
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")


async def cleanup_connection(websocket: WebSocket, user_id: str, db: Session):
    """Clean up WebSocket connection on disconnect."""
    was_online = manager.is_user_online(user_id)
    manager.disconnect(websocket, user_id)
    
    # Update last_seen and broadcast offline status only if user has no more connections
    if was_online and not manager.is_user_online(user_id):
        # Update last_seen timestamp in database
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_seen = datetime.now(timezone.utc)
            db.commit()
            
            # Broadcast offline status with last_seen
            await manager.broadcast_online_status(user_id, False, db, user.last_seen)
    
    db.close()
