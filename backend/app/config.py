"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Aryorithm Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # Database (SQLite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./aryorithm.db"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Nexus edge-collector (X-API-Key) — dev default matches dashboard/Nexus simulator
    NEXUS_API_KEY: str = "ary_dev_secret_key_8000"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
