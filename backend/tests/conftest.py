"""Shared fixtures for backend API tests (isolated in-memory SQLite).

Each test gets a fresh database; the app's ``get_db`` dependency is
overridden per-test and restored afterwards. Mirrors the pattern from
test_licenses.py so all suites behave identically.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 (register tables)
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.user import Tenant, TenantTier, User, UserRole
from app.utils.security import create_access_token, hash_password


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, factory
    app.dependency_overrides.clear()
    await engine.dispose()


async def make_user(factory, email="ops@example.com", role=UserRole.TENANT_ADMIN,
                    tier=TenantTier.PRO, active=True):
    """Create tenant + user directly in the test DB; return (token, user_id, tenant_id)."""
    async with factory() as db:
        tenant = Tenant(name="Acme Energy", tier=tier)
        db.add(tenant)
        await db.flush()
        user = User(
            email=email,
            password_hash=hash_password("password123"),
            name="Ops",
            role=role,
            tenant_id=tenant.id,
            is_active=active,
        )
        db.add(user)
        await db.flush()
        token, _ = create_access_token(user.id)
        await db.commit()
        return token, user.id, tenant.id


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def nexus_key_headers():
    return {"X-API-Key": settings.NEXUS_API_KEY}
