from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time messaging.
    """
    def __init__(self):
        # user_id -> Set of WebSocket connections (user can have multiple tabs/devices)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Add a new WebSocket connection for a user."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")
        
        # Broadcast online status to relevant users
        await self.broadcast_online_status(user_id, True)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection for a user."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            # Remove user entry if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} disconnected. No active connections.")
            else:
                logger.info(f"User {user_id} connection closed. Remaining: {len(self.active_connections[user_id])}")
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user has any active connections."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to all connections of a specific user."""
        if user_id in self.active_connections:
            disconnected_sockets = set()
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected_sockets.add(connection)
            
            # Clean up disconnected sockets
            for socket in disconnected_sockets:
                self.disconnect(socket, user_id)
    
    async def send_message_to_conversation(self, message: dict, user_ids: list[str]):
        """Send a message to all users in a conversation."""
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    async def broadcast_online_status(self, user_id: str, is_online: bool, db=None, last_seen=None):
        """
        Broadcast online/offline status to all users who have conversations with this user.
        """
        logger.info(f"User {user_id} is now {'online' if is_online else 'offline'}")
        
        if db is None:
            return
        
        try:
            from app.features.messages.models import Conversation
            from sqlalchemy import or_
            
            # Find all users who have conversations with this user
            conversations = db.query(Conversation).filter(
                or_(
                    Conversation.user1_id == user_id,
                    Conversation.user2_id == user_id
                ),
                Conversation.status != "declined"
            ).all()
            
            # Get unique user IDs to notify
            related_user_ids = set()
            for conv in conversations:
                other_user_id = conv.user2_id if conv.user1_id == user_id else conv.user1_id
                related_user_ids.add(other_user_id)
            
            # Broadcast status update to all related users
            status_message = {
                "type": "online_status",
                "user_id": user_id,
                "is_online": is_online
            }
            
            # Include last_seen timestamp when going offline
            if not is_online and last_seen:
                last_seen_str = last_seen.isoformat() + 'Z' if not last_seen.isoformat().endswith('Z') else last_seen.isoformat()
                status_message["last_seen"] = last_seen_str
            
            for related_user_id in related_user_ids:
                await self.send_personal_message(status_message, related_user_id)
                
        except Exception as e:
            logger.error(f"Error broadcasting online status: {e}")
    
    async def broadcast_typing_indicator(self, conversation_id: str, user_id: str, is_typing: bool, recipient_id: str):
        """Send typing indicator to conversation participants."""
        message = {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing
        }
        await self.send_personal_message(message, recipient_id)
    
    def get_online_users(self) -> list[int]:
        """Get list of all currently online user IDs."""
        return list(self.active_connections.keys())


# Global connection manager instance
manager = ConnectionManager()
