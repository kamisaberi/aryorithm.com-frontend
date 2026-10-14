"""First-run installer — DB configuration + initial data seeding.

Public (unauthenticated) wizard used on fresh deploys / cPanel where there
is no shell access. Blocked once ``install.lock`` exists unless ``force``
is set and the lock is removed manually.

Flow:
  1. Fill the form at ``GET /install`` (static HTML page).
  2. ``POST /api/v1/install/test-connection`` to verify DB credentials.
  3. ``POST /api/v1/install/run`` writes ``.env``, creates all tables and
     seeds tenant + admin + catalogs.

After install restart the app (``touch passenger_wsgi.py`` on cPanel or
restart uvicorn) so the new ``DATABASE_URL`` takes effect — the installer
already created everything with its own engine, the restart only reloads
the running process.
"""

from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
ENV_PATH = BASE_DIR / ".env"
ENV_EXAMPLE_PATH = BASE_DIR / ".env.example"
LOCK_PATH = BASE_DIR / "install.lock"

router = APIRouter(prefix="/install", tags=["Installer"])


# ---------------------------------------------------------------- schemas


class TestConnectionRequest(BaseModel):
    db_driver: Literal["mysql", "sqlite"] = "mysql"
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""


class InstallRequest(BaseModel):
    # Database
    db_driver: Literal["mysql", "sqlite"] = "mysql"
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = Field(default="", description="MySQL database name (cPanel: e.g. kami_aryorithm)")
    db_user: str = ""
    db_password: str = ""

    # Application
    app_name: str = "Aryorithm Backend"
    app_env: Literal["production", "development"] = "production"
    secret_key: str = ""  # auto-generated when empty
    cors_origins: str = ""  # comma-separated extra origins, optional

    # First organization + admin
    tenant_name: str = "Default Organization"
    admin_name: str = "Administrator"
    admin_email: EmailStr = "admin@example.com"
    admin_password: str = Field(default="", min_length=8)

    # Seed toggles
    seed_plans: bool = True
    seed_models: bool = True
    seed_sentinel: bool = True
    seed_model_vault: bool = True
    seed_demo: bool = False

    force: bool = False


# ---------------------------------------------------------------- helpers


def build_database_url(payload: TestConnectionRequest | InstallRequest) -> str:
    if payload.db_driver == "sqlite":
        name = (payload.db_name or "aryorithm.db").strip() or "aryorithm.db"
        # Allow absolute path or plain filename (relative to backend/).
        if name == ":memory:":
            return "sqlite+aiosqlite:///:memory:"
        if name.startswith("/") or name.startswith("./"):
            return f"sqlite+aiosqlite:///{name}"
        return f"sqlite+aiosqlite:///./{name}"
    db_name = payload.db_name.strip()
    if not db_name:
        raise HTTPException(422, "db_name is required for MySQL")
    if not payload.db_user.strip():
        raise HTTPException(422, "db_user is required for MySQL")
    user = quote_plus(payload.db_user.strip())
    password = quote_plus(payload.db_password or "")
    host = (payload.db_host or "localhost").strip()
    port = int(payload.db_port or 3306)
    auth = f"{user}:{password}@" if password else f"{user}@"
    return f"mysql+aiomysql://{auth}{host}:{port}/{db_name}?charset=utf8mb4"


def _parse_env_file(path: Path) -> tuple[list[str], dict[str, str]]:
    """Return (lines, key->value) preserving comments/order for rewrite."""
    if not path.is_file():
        return [], {}
    lines = path.read_text(encoding="utf-8").splitlines()
    values: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        values[key.strip()] = val.strip()
    return lines, values


def _set_env_key(lines: list[str], values: dict[str, str], key: str, value: str) -> None:
    entry = f'{key}="{value}"' if (" " in value or "[" in value or "," in value) and not value.startswith("[") else f"{key}={value}"
    # Keep JSON-ish values quoted consistently.
    if key in ("CORS_ORIGINS",):
        entry = f"{key}={value}"
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = entry
            values[key] = value
            return
    lines.append(entry)
    values[key] = value


def write_env_file(database_url: str, body: InstallRequest) -> str:
    secret = body.secret_key.strip()
    if len(secret) < 32:
        secret = secrets.token_urlsafe(48)

    # Start from existing .env, else .env.example, else blank.
    if ENV_PATH.is_file():
        lines, _ = _parse_env_file(ENV_PATH)
    elif ENV_EXAMPLE_PATH.is_file():
        lines, _ = _parse_env_file(ENV_EXAMPLE_PATH)
    else:
        lines = []

    values: dict[str, str] = {}
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            k, _, v = line.partition("=")
            values[k.strip()] = v.strip()

    _set_env_key(lines, values, "APP_NAME", body.app_name.strip() or "Aryorithm Backend")
    _set_env_key(lines, values, "APP_ENV", body.app_env)
    _set_env_key(lines, values, "DEBUG", "false" if body.app_env == "production" else "true")
    _set_env_key(lines, values, "SECRET_KEY", secret)
    _set_env_key(lines, values, "DATABASE_URL", database_url)

    if body.cors_origins.strip():
        origins = [o.strip() for o in body.cors_origins.split(",") if o.strip()]
        _set_env_key(lines, values, "CORS_ORIGINS", json.dumps(origins))

    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        os.chmod(ENV_PATH, 0o600)
    except OSError:
        pass
    return secret


def is_locked() -> bool:
    return LOCK_PATH.is_file()


async def _try_connect(database_url: str, timeout: int = 8) -> dict:
    """Open engine, run SELECT 1 (+ version), dispose. Raises on failure."""
    if database_url.startswith("sqlite"):
        engine = create_async_engine(database_url)
    else:
        engine = create_async_engine(database_url, pool_pre_ping=True, connect_args={"connect_timeout": timeout})
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            version = None
            if database_url.startswith("mysql"):
                try:
                    row = (await conn.execute(text("SELECT VERSION()"))).first()
                    version = str(row[0]) if row else None
                except Exception:
                    version = None
        return {"ok": True, "server_version": version}
    finally:
        await engine.dispose()


# ---------------------------------------------------------------- routes


@router.get("/generate-secret")
async def generate_secret() -> dict:
    """Generate a deploy-ready SECRET_KEY (also auto-done on install)."""
    return {"secret_key": secrets.token_urlsafe(48)}


@router.get("/status")
async def install_status(db: AsyncSession = Depends(get_db)) -> dict:
    """Public: is this backend already installed?"""
    locked = is_locked()
    has_env = ENV_PATH.is_file()
    user_count: int | None = None
    db_error: str | None = None
    admin_email: str | None = None
    if locked:
        try:
            data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
            admin_email = data.get("admin_email")
        except Exception:
            admin_email = None
    try:
        try:
            result = await db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = int(result.scalar() or 0)
        except Exception as exc:
            db_error = f"users table not reachable ({type(exc).__name__})"
    except Exception as exc:  # DB unreachable (wrong .env, MySQL down)
        db_error = f"{type(exc).__name__}: {exc}".split("\n")[0][:300]

    installed = locked and (user_count or 0) > 0
    return {
        "installed": installed,
        "lock_exists": locked,
        "has_env": has_env,
        "user_count": user_count,
        "db_error": db_error,
        "admin_email": admin_email,
    }


@router.post("/test-connection")
async def test_connection(body: TestConnectionRequest) -> dict:
    """Public: verify DB host/user/pass/name before installing."""
    try:
        url = build_database_url(body)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, f"Bad database URL: {exc}")
    try:
        info = await _try_connect(url)
    except Exception as exc:
        msg = str(exc).split("\n")[0][:400]
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Could not connect to database: {type(exc).__name__}: {msg}",
        )
    # Masked URL for display (never echo the password).
    masked = url
    if body.db_driver == "mysql" and body.db_password:
        masked = url.replace(quote_plus(body.db_password), "***")
    return {
        "ok": True,
        "driver": body.db_driver,
        "database_url_masked": masked,
        "server_version": info.get("server_version"),
        "message": "Connection successful.",
    }


@router.post("/run")
async def run_installer(body: InstallRequest) -> dict:
    """Public: write .env, create tables, seed admin + catalogs. One-shot."""
    if is_locked() and not body.force:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Already installed (install.lock exists). Delete install.lock to re-run, or pass force=true.",
        )
    if len(body.admin_password) < 8:
        raise HTTPException(422, "admin_password must be at least 8 characters")

    database_url = build_database_url(body)

    # 1. Verify the target DB is reachable before writing anything.
    try:
        await _try_connect(database_url)
    except Exception as exc:
        msg = str(exc).split("\n")[0][:400]
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Could not connect to database: {type(exc).__name__}: {msg}",
        )

    # 2. Persist .env (secret auto-generated when short/empty).
    secret_used = write_env_file(database_url, body)

    # 3. Create tables on the TARGET database (own engine — the global one
    #    still points at the old DATABASE_URL until the process restarts).
    import app.models  # noqa: F401  (register tables for create_all)
    from app.database import Base, ensure_mysql_tables_utf8mb4

    engine = create_async_engine(database_url, pool_pre_ping=True)
    # Self-heal databases created with a latin1 default (common on cPanel):
    # fix the database default (fresh create_all inherits it) and convert
    # non-utf8mb4 tables now, or the first non-ASCII seed row dies with
    # MySQL error 1366 mid-install. No-op when already compliant.
    charset_fix = await ensure_mysql_tables_utf8mb4(engine)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as db:
            from sqlalchemy import select as _select

            from app.models.subscription import PlanEntitlement, SubscriptionPlan
            from app.models.user import Tenant, TenantTier, User, UserRole
            from app.utils.security import hash_password

            # --- tenant + admin (idempotent by email) ---
            existing = (
                await db.execute(_select(User).where(User.email == str(body.admin_email)))
            ).scalar_one_or_none()
            if existing is None:
                tenant = Tenant(name=body.tenant_name.strip() or "Default Organization", tier=TenantTier.ENTERPRISE)
                db.add(tenant)
                await db.flush()
                admin = User(
                    email=str(body.admin_email),
                    password_hash=hash_password(body.admin_password),
                    name=body.admin_name.strip() or "Administrator",
                    role=UserRole.SUPER_ADMIN,
                    tenant_id=tenant.id,
                )
                db.add(admin)
                await db.flush()
                tenant_id = tenant.id
            else:
                existing.password_hash = hash_password(body.admin_password)
                existing.is_active = True
                existing.role = UserRole.SUPER_ADMIN
                existing.name = body.admin_name.strip() or existing.name
                tenant_id = existing.tenant_id
                await db.flush()

            seeded: dict[str, int | bool] = {}

            # --- subscription plans matrix ---
            if body.seed_plans:
                from app.services.plan_catalog import ensure_plan_seed

                await ensure_plan_seed(db)
                seeded["plans"] = True

            # --- baseline threat-model inventory for the admin tenant ---
            if body.seed_models:
                from app.services.model_inventory import ensure_default_models, ensure_web_models

                await ensure_default_models(db, tenant_id)
                await ensure_web_models(db, tenant_id)
                seeded["models"] = True

            # --- sentinel package catalog (+ .spkg files on disk) ---
            if body.seed_sentinel:
                from app.services.sentinel_packages import ensure_seed as ensure_spkg

                await ensure_spkg(db)
                seeded["sentinel_packages"] = True

            # --- cloud model vault catalog ---
            if body.seed_model_vault:
                from app.services.model_vault import ensure_seed as ensure_vault

                await ensure_vault(db)
                seeded["model_vault"] = True

            # --- minimal demo fleet (3 zones, no fake telemetry) ---
            if body.seed_demo:
                from app.models.fleet import Enclave

                for gid, name, desc, sla, scada in [
                    ("CRITICAL_OT", "Critical OT", "Industrial SCADA protection zone", 800, True),
                    ("HOSPITAL_PACS", "Hospital PACS", "DICOM inspection zone", 500, False),
                    ("DEFAULT_DMZ", "Enterprise DMZ", "Public-facing gateways", 1000, False),
                ]:
                    row = (
                        await db.execute(
                            _select(Enclave).where(Enclave.tenant_id == tenant_id, Enclave.enclave_id == gid)
                        )
                    ).scalar_one_or_none()
                    if row is None:
                        db.add(
                            Enclave(
                                enclave_id=gid, name=name, description=desc,
                                max_latency_us=sla, scada_mode=scada, tenant_id=tenant_id,
                            )
                        )
                await db.flush()
                seeded["demo_enclaves"] = True

            user_count = int((await db.execute(_select(func.count(User.id)))).scalar() or 0)
            await db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Install failed: {type(exc).__name__}: {exc}")
    finally:
        await engine.dispose()

    # 4. Lock + best-effort Passenger restart trigger.
    LOCK_PATH.write_text(
        json.dumps(
            {
                "installed_at": datetime.now(timezone.utc).isoformat(),
                "driver": body.db_driver,
                "db_host": body.db_host if body.db_driver == "mysql" else "local-file",
                "db_name": body.db_name or "aryorithm.db",
                "admin_email": str(body.admin_email),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    restarted_hint = False
    try:
        wsgi = BASE_DIR / "passenger_wsgi.py"
        if wsgi.is_file():
            os.utime(wsgi, None)
            restarted_hint = True
    except OSError:
        pass

    return {
        "ok": True,
        "message": "Installation complete.",
        "admin_email": str(body.admin_email),
        "user_count": user_count,
        "seeded": seeded,
        "secret_generated": len(body.secret_key.strip()) < 32,
        "charset_fixed_database": charset_fix["database"],
        "charset_fixed_tables": charset_fix["tables"],
        "database_url_masked": database_url.replace(quote_plus(body.db_password), "***")
        if body.db_driver == "mysql" and body.db_password
        else database_url,
        "next_steps": [
            "RESTART the backend so the new DATABASE_URL loads"
            + (" (passenger_wsgi.py touched — Passenger should reload shortly)" if restarted_hint else " (cPanel: Setup Python App → Restart, or: touch passenger_wsgi.py)"),
            "Log in with your admin email + password at POST /api/v1/auth/login.",
            "Delete or keep install.lock — while it exists /install/run stays locked.",
        ],
    }
