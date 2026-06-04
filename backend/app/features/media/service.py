"""Media business logic: upload pipeline and GIPHY proxy."""

from __future__ import annotations

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.features.media.models import Media
from app.features.media.schemas import GiphyAttach, GiphyResult
from app.features.media.storage import classify_kind, enforce_size, get_storage


async def upload_media(
    db: Session,
    owner_id: str,
    file: UploadFile,
) -> Media:
    """Validate, store, and record a single uploaded media file."""
    if not file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing content type",
        )

    kind = classify_kind(file.content_type)
    storage = get_storage()
    result = await storage.upload(file, kind)
    enforce_size(kind, result.size_bytes)

    media = Media(
        owner_id=owner_id,
        media_type=kind,
        source="cloudinary",
        source_id=result.public_id,
        url=result.url,
        thumbnail_url=result.thumbnail_url,
        mime_type=result.mime_type,
        size_bytes=result.size_bytes,
        width=result.width,
        height=result.height,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def attach_giphy(db: Session, owner_id: str, data: GiphyAttach) -> Media:
    """Persist a chosen GIPHY gif as a reusable Media row."""
    media = Media(
        owner_id=owner_id,
        media_type="gif",
        source="giphy",
        source_id=data.giphy_id,
        url=data.url,
        thumbnail_url=data.thumbnail_url or data.url,
        mime_type="image/gif",
        width=data.width,
        height=data.height,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def get_media_by_ids(db: Session, ids: list[str]) -> list[Media]:
    if not ids:
        return []
    rows = db.query(Media).filter(Media.id.in_(ids)).all()
    by_id = {m.id: m for m in rows}
    # Preserve caller order.
    return [by_id[i] for i in ids if i in by_id]


def assert_owned(db: Session, ids: list[str], owner_id: str) -> list[Media]:
    """Look up media by id and require the caller to own each one."""
    media = get_media_by_ids(db, ids)
    if len(media) != len(set(ids)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more media items not found",
        )
    for m in media:
        if m.owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this media item",
            )
    return media


# ---------------------------------------------------------------------------
# GIPHY
# ---------------------------------------------------------------------------

_STUB_TRENDING: list[GiphyResult] = [
    GiphyResult(
        id="stub-trending-1",
        title="Stub: thumbs up",
        url="https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
        thumbnail_url="https://media.giphy.com/media/111ebonMs90YLu/200w.gif",
        width=480,
        height=270,
    ),
    GiphyResult(
        id="stub-trending-2",
        title="Stub: clapping",
        url="https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif",
        thumbnail_url="https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/200w.gif",
        width=480,
        height=270,
    ),
    GiphyResult(
        id="stub-trending-3",
        title="Stub: party",
        url="https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
        thumbnail_url="https://media.giphy.com/media/g9582DNuQppxC/200w.gif",
        width=480,
        height=270,
    ),
    GiphyResult(
        id="stub-trending-4",
        title="Stub: laughing",
        url="https://media.giphy.com/media/l0HlOBZcl7sbV6LnO/giphy.gif",
        thumbnail_url="https://media.giphy.com/media/l0HlOBZcl7sbV6LnO/200w.gif",
        width=480,
        height=270,
    ),
]


async def giphy_trending(limit: int = 12) -> list[GiphyResult]:
    if not settings.giphy_api_key:
        return _STUB_TRENDING[:limit]
    return await _giphy_call("/trending", params={"limit": limit})


async def giphy_search(query: str, limit: int = 12) -> list[GiphyResult]:
    if not settings.giphy_api_key:
        # Re-label so it's obvious in dev that no real query happened.
        return [
            GiphyResult(
                id=f"{r.id}-stub-{query[:12]}",
                title=f"Stub for '{query}'",
                url=r.url,
                thumbnail_url=r.thumbnail_url,
                width=r.width,
                height=r.height,
            )
            for r in _STUB_TRENDING[:limit]
        ]
    return await _giphy_call("/search", params={"q": query, "limit": limit})


async def _giphy_call(path: str, *, params: dict) -> list[GiphyResult]:
    import httpx  # Lazy import: only required when GIPHY is configured.

    url = f"{settings.giphy_api_base.rstrip('/')}{path}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url, params={**params, "api_key": settings.giphy_api_key})
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="GIPHY request failed")
    data = resp.json().get("data", [])
    return [_giphy_to_result(item) for item in data]


def _giphy_to_result(item: dict) -> GiphyResult:
    images = item.get("images", {})
    original = images.get("original", {})
    thumb = images.get("fixed_width_small", {}) or images.get("preview_gif", {})
    return GiphyResult(
        id=item.get("id", ""),
        title=item.get("title"),
        url=original.get("url") or item.get("url", ""),
        thumbnail_url=thumb.get("url"),
        width=int(original.get("width") or 0) or None,
        height=int(original.get("height") or 0) or None,
    )
