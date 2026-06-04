"""FoundrBase API - Main application entry point

A modular FastAPI backend for managing opportunities (problems, ideas, improvements).

Features:
- JWT authentication
- Opportunity management
- Extensible feature-based architecture

API Documentation: /docs
Alternative Docs: /redoc
Health Check: /health
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.connection import engine
from app.features.messages.websocket_router import router as websocket_router


def _ensure_media_columns() -> None:
    """Idempotently add new nullable columns to existing tables.

    ``Base.metadata.create_all`` only creates missing tables, not new columns on
    existing ones, so we patch the schema here to avoid forcing a DB wipe when
    pulling new fields like the media foreign keys or the user avatar URL.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl in (
            ("comments", "media_id", "ALTER TABLE comments ADD COLUMN media_id VARCHAR(36)"),
            ("messages", "media_id", "ALTER TABLE messages ADD COLUMN media_id VARCHAR(36)"),
            ("users", "avatar_url", "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(1000)"),
            ("conversations", "is_group", "ALTER TABLE conversations ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT 0"),
            ("conversations", "name", "ALTER TABLE conversations ADD COLUMN name VARCHAR(120)"),
            ("conversations", "avatar_url", "ALTER TABLE conversations ADD COLUMN avatar_url VARCHAR(1000)"),
        ):
            if not inspector.has_table(table):
                continue
            existing = {col["name"] for col in inspector.get_columns(table)}
            if column not in existing:
                conn.execute(text(ddl))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Runs on startup:
    - Create database tables from models
    - Initialize any required services

    Runs on shutdown:
    - Cleanup resources (if needed)
    """
    # Startup
    Base.metadata.create_all(bind=engine)
    _ensure_media_columns()
    yield
    # Shutdown (add cleanup here if needed)


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Backend API for opportunity management and collaboration",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware (configure based on your needs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router)

# Include WebSocket router
app.include_router(websocket_router, prefix="/api/v1/messages", tags=["WebSocket"])

# Serve locally stored media uploads (used by the Cloudinary stub backend).
_uploads_dir = Path(settings.media_local_upload_dir).resolve()
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    settings.media_public_base_url,
    StaticFiles(directory=str(_uploads_dir)),
    name="uploads",
)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    """Root endpoint - API information"""
    return {
        "message": "Welcome to FoundrBase API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    """Health check endpoint for monitoring"""
    return {"status": "ok", "service": "FoundrBase API"}
