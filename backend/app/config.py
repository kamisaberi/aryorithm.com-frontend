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

    # Database: SQLite by default; MySQL 8+ on servers/cPanel.
    #   SQLite: sqlite+aiosqlite:///./aryorithm.db
    #   MySQL:  mysql+aiomysql://USER:PASSWORD@HOST:3306/DBNAME?charset=utf8mb4
    DATABASE_URL: str = "sqlite+aiosqlite:///./aryorithm.db"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cross-subdomain SSO cookies (dashboard + hub + main share one login).
    # Browsers send Domain=.aryorithm.com cookies to every subdomain, so a
    # member logged in on one app stays logged in on the others.
    # Local dev: leave COOKIE_DOMAIN empty (localhost can't use Domain cookies).
    COOKIE_ACCESS_NAME: str = "ary_access"
    COOKIE_REFRESH_NAME: str = "ary_refresh"
    COOKIE_DOMAIN: str = ""
    COOKIE_PATH: str = "/"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Nexus edge-collector (X-API-Key) — dev default matches dashboard/Nexus simulator
    NEXUS_API_KEY: str = "ary_dev_secret_key_8000"

    # Licensing (Ed25519 master keypair for offline .lic envelopes).
    # NEVER commit the real private key — set via env or a secrets vault.
    # Public key (base64, 32 bytes) may be committed; appliances verify with it.
    ARYORITHM_MASTER_PRIVATE_KEY_B64: str = ""
    ARYORITHM_MASTER_PUBLIC_KEY_B64: str = ""
    # Dedicated Authority-root verify key for official .aryopack releases.
    # Empty falls back to ARYORITHM_MASTER_PUBLIC_KEY_B64 (or the dev key file).
    ARYORITHM_AUTHORITY_PUBLIC_KEY_B64: str = ""
    # Dev fallback: raw 32-byte private key file (also git-ignored).
    LICENSE_KEY_FILE: str = "tools/licensing/master_private.key"

    # Aryorithm Hub (feature store / plugin registry) artifact vault.
    HUB_PACKAGE_DIR: str = "storage/packages"
    HUB_MAX_UPLOAD_BYTES: int = 104857600
    HUB_PUBLIC_BASE: str = "https://hub.aryorithm.com"
    # Workspace frontend used when generating expiring share links.
    WORKSPACE_PUBLIC_BASE: str = "https://app.aryorithm.com"

    # Signed production-site blueprints + official air-gapped appliance vaults.
    # Appliances are large (hundreds of MB), so they use a separate limit.
    HUB_BLUEPRINTS_DIR: str = "storage/hub/blueprints"
    HUB_APPLIANCES_DIR: str = "storage/hub/appliances"
    HUB_APPLIANCE_MAX_UPLOAD_BYTES: int = 2147483648

    # Cloud Model Vault (AI model registry) artifact vault. Layout mirrors
    # the S3 URI scheme: models/{slug}/{version}/{format_dir}/{file}.
    MODEL_VAULT_DIR: str = "storage/model-vault"
    MODEL_VAULT_MAX_UPLOAD_BYTES: int = 536870912

    # Cloud Forge (remote GPU training queue). The simulated duration keeps
    # the queued -> training -> completed lifecycle deterministic until the
    # external GPU worker is connected.
    FORGE_DIR: str = "storage/forge"
    FORGE_SIMULATED_TRAINING_SECONDS: int = 12


settings = Settings()
