"""Pydantic schemas for opportunity requests and responses"""

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class SortField(str, Enum):
    """Allowed fields for sorting opportunities"""
    created_at = "created_at"
    title = "title"
    category = "category"
    type = "type"
    status = "status"


class SortOrder(str, Enum):
    """Sort order direction"""
    asc = "asc"
    desc = "desc"


class OpportunityCreate(BaseModel):
    """Schema for creating a new opportunity"""
    
    title: str = Field(
        min_length=5,
        max_length=255,
        description="Concise title describing the opportunity"
    )
    description: str = Field(
        min_length=20,
        description="Detailed description with context and impact"
    )
    type: Literal["problem", "idea", "improvement"] = Field(
        description="Type: problem (needs fixing), idea (new concept), improvement (enhancement)"
    )
    category: str = Field(
        min_length=2,
        max_length=100,
        description="Category (e.g., food, farming, tech, government, education, health)"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Improve local farmers market access",
                    "description": "Many local farmers struggle to reach urban customers due to lack of digital presence and logistics support. A platform connecting farmers with consumers could increase their income by 30-40%.",
                    "type": "problem",
                    "category": "farming"
                },
                {
                    "title": "Solar-powered irrigation system",
                    "description": "Develop affordable solar-powered irrigation systems for small-scale farmers in remote areas where grid electricity is unreliable.",
                    "type": "idea",
                    "category": "farming"
                }
            ]
        }
    }


class OpportunityPublic(BaseModel):
    """Public opportunity data (response schema)"""
    
    model_config = {"from_attributes": True}
    
    id: str
    title: str
    description: str
    type: str
    category: str
    user_id: str
    created_at: datetime
    status: str


class OpportunityList(BaseModel):
    """Paginated list of opportunities"""
    
    opportunities: list[OpportunityPublic]
    total: int
    skip: int
    limit: int
