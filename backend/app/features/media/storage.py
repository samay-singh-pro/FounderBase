"""Storage abstraction for media uploads.

Today: a local-disk "Cloudinary stub" that writes to ``backend/uploads/`` and
returns URLs shaped like Cloudinary's. Swap to the real ``cloudinary`` SDK
when credentials are provided in settings.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


@dataclass
class UploadResult:
    url: str
    thumbnail_url: str | None
    public_id: str
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None


class Storage(Protocol):
    async def upload(self, file: UploadFile, kind: str) -> UploadResult: ...


class CloudinaryStubStorage:
    """Saves files to local disk and returns Cloudinary-shaped URLs.

    Use this until ``cloudinary_*`` settings are configured. The on-disk layout
    mirrors what we'd do with a real Cloudinary bucket (a ``public_id`` per
    asset), so swapping later is a one-line change in ``get_storage()``.
    """

    def __init__(self) -> None:
        self.root = Path(settings.media_local_upload_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.public_base = settings.media_public_base_url.rstrip("/")

    async def upload(self, file: UploadFile, kind: str) -> UploadResult:
        # Allocate a stable public_id (similar to Cloudinary's).
        ext = _safe_ext(file.filename, file.content_type)
        public_id = f"foundrbase/{kind}/{uuid.uuid4().hex}"
        rel_path = f"{public_id}{ext}"
        dest = self.root / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)

        # Stream to disk so we don't hold large videos in memory.
        size = 0
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                out.write(chunk)

        url = f"{self.public_base}/{rel_path}"
        thumbnail_url = url if kind != "video" else None  # Real Cloudinary would generate a poster.
        return UploadResult(
            url=url,
            thumbnail_url=thumbnail_url,
            public_id=public_id,
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=size,
        )


def get_storage() -> Storage:
    """Pick the storage backend.

    Real Cloudinary kicks in only when all three credentials are present;
    otherwise we use the stub so the feature works end-to-end without keys.
    """
    if (
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    ):
        # Lazy import: only required when real Cloudinary is configured.
        try:
            from .storage_cloudinary import CloudinaryStorage  # noqa: WPS433

            return CloudinaryStorage()
        except ImportError:
            pass
    return CloudinaryStubStorage()


_EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}


def _safe_ext(filename: str | None, content_type: str | None) -> str:
    if content_type and content_type in _EXT_BY_MIME:
        return _EXT_BY_MIME[content_type]
    if filename:
        _, ext = os.path.splitext(filename)
        if ext and len(ext) <= 6:
            return ext.lower()
    return ""


def classify_kind(mime: str) -> str:
    """Map a mime type to one of: image, gif, video. Raises 415 if not allowed."""
    allowed_images = {m.strip() for m in settings.media_allowed_image_mimes.split(",") if m.strip()}
    allowed_videos = {m.strip() for m in settings.media_allowed_video_mimes.split(",") if m.strip()}

    if mime == "image/gif":
        return "gif"
    if mime in allowed_images:
        return "image"
    if mime in allowed_videos:
        return "video"

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=f"Unsupported media type: {mime}",
    )


def enforce_size(kind: str, size_bytes: int) -> None:
    """Reject uploads larger than the configured limit for the given kind."""
    if kind == "video":
        limit = settings.media_max_video_bytes
    else:
        limit = settings.media_max_image_bytes
    if size_bytes > limit:
        mb = limit // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{kind.capitalize()} exceeds {mb}MB limit",
        )
