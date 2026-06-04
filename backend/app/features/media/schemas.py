"""Pydantic schemas for media."""

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_serializer


class MediaPublic(BaseModel):
    """Public media representation, returned from upload + attached to other resources."""

    model_config = {"from_attributes": True}

    id: str
    media_type: str
    source: str
    url: str
    thumbnail_url: str | None = None
    mime_type: str | None = None
    width: int | None = None
    height: int | None = None
    size_bytes: int | None = None
    created_at: datetime | None = None

    @field_serializer("created_at")
    def serialize_datetime(self, dt: datetime | None, _info: Any) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class GiphyAttach(BaseModel):
    """Payload to attach a GIPHY gif (already discovered via search) as a Media row."""

    giphy_id: str = Field(min_length=1, max_length=128)
    url: str = Field(min_length=1, max_length=1000)
    thumbnail_url: str | None = Field(default=None, max_length=1000)
    width: int | None = None
    height: int | None = None


class GiphyResult(BaseModel):
    """A single GIPHY search result item."""

    id: str
    title: str | None = None
    url: str
    thumbnail_url: str | None = None
    width: int | None = None
    height: int | None = None


class GiphySearchResponse(BaseModel):
    """Wrapper for GIPHY search results."""

    results: list[GiphyResult]
