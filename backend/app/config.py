"""Application configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Application
    APP_NAME: str = "Aryorithm Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-to-a-long-random-secret-with-at-least-32-chars"

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

    # Licensing (Ed25519 master keypair for offline .lic envelopes).
    # NEVER commit the real private key — set via env or a secrets vault.
    # Public key (base64, 32 bytes) may be committed; appliances verify with it.
    ARYORITHM_MASTER_PRIVATE_KEY_B64: str = ""
    ARYORITHM_MASTER_PUBLIC_KEY_B64: str = ""
    # Dev fallback: raw 32-byte private key file (also git-ignored).
    LICENSE_KEY_FILE: str = "tools/licensing/master_private.key"


settings = Settings()
