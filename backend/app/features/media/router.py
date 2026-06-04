"""Media API routes: upload, GIPHY proxy."""

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.media import service
from app.features.media.schemas import (
    GiphyAttach,
    GiphySearchResponse,
    MediaPublic,
)

router = APIRouter(prefix="/media", tags=["Media"])


@router.post(
    "/upload",
    response_model=MediaPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a single image, GIF, or video",
)
async def upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MediaPublic:
    media = await service.upload_media(db, str(current_user.id), file)
    return MediaPublic.model_validate(media)


@router.post(
    "/giphy/attach",
    response_model=MediaPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Persist a chosen GIPHY gif as a Media row",
)
def attach_giphy(
    data: GiphyAttach,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MediaPublic:
    media = service.attach_giphy(db, str(current_user.id), data)
    return MediaPublic.model_validate(media)


@router.get(
    "/giphy/trending",
    response_model=GiphySearchResponse,
    summary="Trending GIFs (stubbed until GIPHY key is configured)",
)
async def trending(
    limit: int = Query(12, ge=1, le=50),
    _current_user: User = Depends(get_current_user),
) -> GiphySearchResponse:
    results = await service.giphy_trending(limit=limit)
    return GiphySearchResponse(results=results)


@router.get(
    "/giphy/search",
    response_model=GiphySearchResponse,
    summary="Search GIFs (stubbed until GIPHY key is configured)",
)
async def search(
    q: str = Query(..., min_length=1, max_length=80),
    limit: int = Query(12, ge=1, le=50),
    _current_user: User = Depends(get_current_user),
) -> GiphySearchResponse:
    results = await service.giphy_search(q, limit=limit)
    return GiphySearchResponse(results=results)
