"""Draft model for storing opportunity drafts"""

import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.db.base import Base


class Draft(Base):
    """Draft model for opportunity drafts"""
    
    __tablename__ = "drafts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    type = Column(String(50), nullable=False, default="problem")
    category = Column(String(100), nullable=False, default="")
    link = Column(Text, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)