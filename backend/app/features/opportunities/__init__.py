"""Opportunities feature module - Problem/Idea/Improvement tracking

This module contains everything related to opportunities:
- Database models (Opportunity)
- Request/Response schemas
- Business logic (create, list, filter)
- API routes

Future extensions:
- Likes/reactions
- Comments
- AI analysis
- Tags
- Status workflows
"""

from app.features.opportunities.models import Opportunity
from app.features.opportunities.schemas import (
    OpportunityCreate,
    OpportunityList,
    OpportunityPublic,
)

__all__ = ["Opportunity", "OpportunityCreate", "OpportunityPublic", "OpportunityList"]
