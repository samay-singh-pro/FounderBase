"""Media database model and join tables."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


# Many-to-many junction: an opportunity (post) can have multiple media items.
opportunity_media = Table(
    "opportunity_media",
    Base.metadata,
    Column("opportunity_id", String(36), ForeignKey("opportunities.id", ondelete="CASCADE"), primary_key=True),
    Column("media_id", String(36), ForeignKey("media.id", ondelete="CASCADE"), primary_key=True),
    Column("position", Integer, default=0, nullable=False),
)


class Media(Base):
    """A single media item: image, video, or GIF (Cloudinary-backed or GIPHY-sourced)."""

    __tablename__ = "media"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # User who uploaded / attached this media. Null for GIPHY items not owned by anyone.
    owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    # "image" | "video" | "gif"
    media_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # "cloudinary" (real or stub upload) | "giphy"
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="cloudinary")

    # External provider ID (e.g. cloudinary public_id, giphy gif id)
    source_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Media(id={self.id}, type={self.media_type}, source={self.source})>"
