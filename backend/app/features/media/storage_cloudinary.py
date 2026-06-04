"""Real Cloudinary storage backend.

Activated when ``CLOUDINARY_CLOUD_NAME``, ``CLOUDINARY_API_KEY``, and
``CLOUDINARY_API_SECRET`` are all set. ``get_storage()`` in ``storage.py``
lazy-imports this module — if the cloudinary SDK isn't installed or the
import fails, we silently fall back to the local-disk stub.
"""

from __future__ import annotations

import cloudinary
import cloudinary.uploader

from app.core.config import settings
from app.features.media.storage import UploadResult, enforce_size


class CloudinaryStorage:
    """Uploads to Cloudinary via the Python SDK."""

    def __init__(self) -> None:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )

    async def upload(self, file, kind: str) -> UploadResult:
        # Cloudinary's SDK is sync, but uploads are typically fast. Reading
        # the whole UploadFile into memory matches what `upload()` expects.
        data = await file.read()
        enforce_size(kind, len(data))

        # "image" handles JPEG/PNG/WebP/GIF; "video" handles MP4/WebM/MOV.
        # Cloudinary auto-detects via "auto", but pinning the type lets us
        # use kind-specific transformations downstream if we want.
        resource_type = "video" if kind == "video" else "image"

        result = cloudinary.uploader.upload(
            data,
            resource_type=resource_type,
            folder=f"foundrbase/{kind}",
            # Returns a secure (https) URL and basic metadata. We rely on
            # Cloudinary's auto-generated public_id since we don't need a
            # human-readable filename.
        )

        secure_url = result.get("secure_url") or result.get("url", "")
        public_id = result.get("public_id", "")
        thumbnail_url = _thumbnail_url(result, kind)

        return UploadResult(
            url=secure_url,
            thumbnail_url=thumbnail_url,
            public_id=public_id,
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=int(result.get("bytes") or len(data)),
            width=result.get("width"),
            height=result.get("height"),
        )


def _thumbnail_url(result: dict, kind: str) -> str | None:
    """Pick a sensible thumbnail URL from a Cloudinary upload response.

    For videos, Cloudinary exposes a generated poster via the same public_id
    with the ``.jpg`` extension. For images we just reuse the original URL.
    """
    secure_url = result.get("secure_url") or result.get("url")
    if not secure_url:
        return None
    if kind != "video":
        return secure_url
    # e.g. https://res.cloudinary.com/<cloud>/video/upload/v1/foo.mp4
    # → https://res.cloudinary.com/<cloud>/video/upload/v1/foo.jpg
    base, _, _ext = secure_url.rpartition(".")
    return f"{base}.jpg" if base else secure_url
