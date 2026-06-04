from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class CurrentDraft(BaseModel):
    """Current post draft data"""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None


class ChatRequest(BaseModel):
    """Request for chat endpoint"""
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    conversation_history: Optional[List[ChatMessage]] = Field(default=[], description="Previous messages")
    current_draft: Optional[CurrentDraft] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    success: bool
    message: str = ""
    error: str = ""


class SuggestTitlesRequest(BaseModel):
    """Request for title suggestions"""
    description: str = Field(..., min_length=10, max_length=5000)
    category: Optional[str] = ""
    type: Optional[str] = "idea"


class SuggestTitlesResponse(BaseModel):
    """Response with title suggestions"""
    success: bool
    titles: List[str] = []
    error: str = ""


class ImproveDescriptionRequest(BaseModel):
    """Request for description improvement"""
    description: str = Field(..., min_length=20, max_length=5000)
    type: Optional[str] = "idea"
    category: Optional[str] = ""


class ImproveDescriptionResponse(BaseModel):
    """Response with improved description"""
    success: bool
    improved: str = ""
    suggestions: List[str] = []
    error: str = ""


class RefineIdeaRequest(BaseModel):
    """Request for idea refinement"""
    title: Optional[str] = ""
    description: str = Field(..., min_length=20, max_length=5000)
    category: Optional[str] = ""
    type: Optional[str] = "idea"


class RefineIdeaResponse(BaseModel):
    """Response with idea refinement feedback"""
    success: bool
    feedback: str = ""
    error: str = ""


class SummarizePostResponse(BaseModel):
    """Concise AI summary of a post plus its comment thread."""
    success: bool
    summary: str = ""
    comments_considered: int = 0
    error: str = ""
