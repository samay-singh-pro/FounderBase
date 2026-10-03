from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # env_ignore_empty: a blank env var (e.g. an optional key left empty in the
    # Render dashboard) falls back to the default below instead of overriding it.
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True
    )

    app_name: str = "FoundrBase API"
    # SQLite by default. Point DATABASE_URL at a Postgres instance (e.g. Neon's
    # free tier) to keep data across restarts on hosts with ephemeral disks.
    database_url: str = "sqlite:///./app.db"

    # CORS allowed origins — comma-separated list, or "*" for any origin.
    # In production set CORS_ORIGINS to your deployed frontend URL(s).
    cors_origins: str = "*"

    # JWT Settings
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 1 day
    
    # Google Gemini AI Settings
    google_gemini_api_key: str = ""  # Set in .env file
    gemini_model: str = "models/gemini-flash-lite-latest"  # Cheapest model

    # Media upload limits (bytes)
    media_max_image_bytes: int = 2 * 1024 * 1024   # 2 MB
    media_max_video_bytes: int = 20 * 1024 * 1024  # 20 MB
    media_max_per_post: int = 2
    media_max_per_comment: int = 1
    media_max_per_message: int = 1

    # Allowed mime types
    media_allowed_image_mimes: str = "image/jpeg,image/png,image/webp,image/gif"
    media_allowed_video_mimes: str = "video/mp4,video/webm,video/quicktime"

    # Storage backend ("cloudinary" supported; uses stub when creds blank).
    media_storage_backend: str = "cloudinary"
    media_local_upload_dir: str = "uploads"   # Used by the stub fallback.
    media_public_base_url: str = "/uploads"   # Where stubbed uploads are served.

    # Cloudinary credentials (leave blank to use the stub).
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # GIPHY API (leave blank to use canned stub responses).
    giphy_api_key: str = ""
    giphy_api_base: str = "https://api.giphy.com/v1/gifs"


settings = Settings()
