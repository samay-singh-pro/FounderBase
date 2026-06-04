from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime, timedelta

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from .schemas import (
    ChatRequest, ChatResponse,
    SuggestTitlesRequest, SuggestTitlesResponse,
    ImproveDescriptionRequest, ImproveDescriptionResponse,
    RefineIdeaRequest, RefineIdeaResponse,
    SummarizePostResponse,
)
from .service import ai_service
from app.core.config import settings
from app.features.comments.service import get_comments_by_opportunity
from app.features.opportunities.service import get_opportunity_by_id

router = APIRouter(prefix="/ai", tags=["ai"])

# Simple in-memory rate limiting (in production, use Redis)
request_tracker: Dict[int, list] = {}
RATE_LIMIT_REQUESTS = 20  # requests
RATE_LIMIT_WINDOW = 300  # 5 minutes in seconds


def check_rate_limit(user_id: int) -> bool:
    """
    Check if user has exceeded rate limit
    Returns True if within limit, False if exceeded
    """
    now = datetime.now()
    
    # Clean up old requests
    if user_id in request_tracker:
        request_tracker[user_id] = [
            req_time for req_time in request_tracker[user_id]
            if (now - req_time).total_seconds() < RATE_LIMIT_WINDOW
        ]
    
    # Check current request count
    if user_id not in request_tracker:
        request_tracker[user_id] = []
    
    if len(request_tracker[user_id]) >= RATE_LIMIT_REQUESTS:
        return False
    
    # Add current request
    request_tracker[user_id].append(now)
    return True


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with AI assistant about post creation
    - Context-aware: knows about current draft
    - Conversation history: maintains context
    - Rate limited: 20 requests per 5 minutes
    """
    # Check if API key is configured
    if not settings.google_gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured. Please contact administrator."
        )
    
    # Rate limiting
    if not check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a few minutes before trying again."
        )
    
    # Convert Pydantic models to dicts for service
    history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
    draft = request.current_draft.model_dump() if request.current_draft else None
    
    # Call AI service
    result = await ai_service.chat(
        message=request.message,
        conversation_history=history,
        current_draft=draft
    )
    
    return ChatResponse(**result)


@router.post("/suggest-titles", response_model=SuggestTitlesResponse)
async def suggest_titles(
    request: SuggestTitlesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate title suggestions based on description
    Returns 5 title options
    """
    if not settings.google_gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured."
        )
    
    if not check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded."
        )
    
    result = await ai_service.suggest_titles(
        description=request.description,
        category=request.category,
        post_type=request.type
    )
    
    return SuggestTitlesResponse(**result)


@router.post("/improve-description", response_model=ImproveDescriptionResponse)
async def improve_description(
    request: ImproveDescriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Improve description with AI suggestions
    Returns improved version + specific suggestions
    """
    if not settings.google_gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured."
        )
    
    if not check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded."
        )
    
    result = await ai_service.improve_description(
        description=request.description,
        post_type=request.type,
        category=request.category
    )
    
    return ImproveDescriptionResponse(**result)


@router.post("/refine-idea", response_model=RefineIdeaResponse)
async def refine_idea(
    request: RefineIdeaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive feedback to refine the idea
    Returns structured feedback on clarity, impact, completeness
    """
    if not settings.google_gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured."
        )
    
    if not check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded."
        )
    
    result = await ai_service.refine_idea(
        title=request.title,
        description=request.description,
        category=request.category,
        post_type=request.type
    )

    return RefineIdeaResponse(**result)


@router.post("/summarize-post/{opportunity_id}", response_model=SummarizePostResponse)
async def summarize_post(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Summarize a post and its comment thread for the current user.

    Server-side fetch keeps the prompt accurate (clients can't lie about which
    comments exist) and lets us cap comment volume before calling Gemini.
    """
    if not settings.google_gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured.",
        )

    if not check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded.",
        )

    opportunity = get_opportunity_by_id(db, opportunity_id, current_user_id=str(current_user.id))
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Pull up to 100 comments — service caps inside generate_content too.
    comments, _total = get_comments_by_opportunity(
        db=db,
        opportunity_id=opportunity_id,
        current_user_id=str(current_user.id),
        skip=0,
        limit=100,
    )

    result = await ai_service.summarize_post(
        title=opportunity["title"],
        description=opportunity["description"],
        post_type=opportunity["type"],
        category=opportunity["category"],
        comments=[
            {"username": c.get("username", ""), "content": c.get("content", "")}
            for c in comments
        ],
    )

    return SummarizePostResponse(**result)
