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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.connection import engine
from app.features.messages.websocket_router import router as websocket_router


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
