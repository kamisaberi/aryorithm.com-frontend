"""Licensing API tests (isolated in-memory SQLite, fresh Ed25519 key)."""

import base64
import time

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 (register tables)
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.license import License
from app.models.user import Tenant, TenantTier, User, UserRole
from app.services import license_service as lic
from app.utils.security import create_access_token, hash_password

needs_db = pytest.mark.asyncio

OLD_PRIV = settings.ARYORITHM_MASTER_PRIVATE_KEY_B64
OLD_PUB = settings.ARYORITHM_MASTER_PUBLIC_KEY_B64


@pytest_asyncio.fixture
async def client():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    # Fresh master key for this test module run.
    priv = ed25519.Ed25519PrivateKey.generate()
    priv_raw = priv.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_raw = priv.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    settings.ARYORITHM_MASTER_PRIVATE_KEY_B64 = base64.b64encode(priv_raw).decode()
    settings.ARYORITHM_MASTER_PUBLIC_KEY_B64 = base64.b64encode(pub_raw).decode()

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
    settings.ARYORITHM_MASTER_PRIVATE_KEY_B64 = OLD_PRIV
    settings.ARYORITHM_MASTER_PUBLIC_KEY_B64 = OLD_PUB
    await engine.dispose()


async def _make_user(factory, email="ops@example.com", role=UserRole.TENANT_ADMIN):
    async with factory() as db:
        tenant = Tenant(name="Acme Energy", tier=TenantTier.PRO)
        db.add(tenant)
        await db.flush()
        user = User(
            email=email,
            password_hash=hash_password("password123"),
            name="Ops",
            role=role,
            tenant_id=tenant.id,
        )
        db.add(user)
        await db.flush()
        token, _ = create_access_token(user.id)
        await db.commit()
        return token, user.id, tenant.id


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- pure service unit tests (no HTTP) ---------------------------------------
def test_normalize_plan_slug():
    assert lic.normalize_plan_slug("CRITICAL_OT") == "critical"
    assert lic.normalize_plan_slug("critical") == "critical"
    assert lic.normalize_plan_slug("ENTERPRISE_IT") == "enterprise"
    assert lic.normalize_plan_slug("SOVEREIGN_DEFENSE") == "sovereign"
    assert lic.normalize_plan_slug("COMMUNITY_FREE") == "community"
    with pytest.raises(ValueError):
        lic.normalize_plan_slug("nope")


def test_capabilities():
    mods, plugs = lic.capabilities_for("community")
    assert mods == lic.FREE_COMMUNITY_MODULES and plugs == []
    mods, plugs = lic.capabilities_for("CRITICAL_OT")
    assert mods == lic.ALL_26_MODULES and len(plugs) == len(lic.ALL_30_PLUGINS)
    assert lic.license_kind("community") == "free"
    assert lic.license_kind("critical") == "commercial"


# --- API tests ---------------------------------------------------------------
@needs_db
async def test_subscribe_community_and_commercial(client):
    ac, factory = client
    token, _, _ = await _make_user(factory)

    r = await ac.post(
        "/api/v1/licenses/subscribe",
        json={"plan_slug": "community", "hardware_token": "ARY-HW-abc123"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    env = r.json()["license_envelope"]
    assert env["claims"]["expires_at"] == 0
    assert lic.verify_envelope(env) is True
    assert r.json()["lease_days"] == 0
    # stored envelope carries the C++ file pair as well
    assert lic.verify_envelope(lic.to_cpp_envelope(env)) is True
    lic_id = r.json()["license_id"]

    r = await ac.post(
        "/api/v1/licenses/subscribe",
        json={"plan_slug": "critical", "hardware_token": "ARY-HW-def456", "max_nodes": 5},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text

    # list + kind filters
    r = await ac.get("/api/v1/licenses", headers=_auth(token))
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.get("/api/v1/licenses?kind=free", headers=_auth(token))
    assert len(r.json()) == 1 and r.json()[0]["license_kind"] == "free"
    r = await ac.get("/api/v1/licenses?kind=commercial", headers=_auth(token))
    assert len(r.json()) == 1 and r.json()[0]["license_kind"] == "commercial"

    r = await ac.get(f"/api/v1/licenses/{lic_id}", headers=_auth(token))
    assert r.status_code == 200 and r.json()["signature_valid"] is True

    # detail + verify also resolve by hardware token (unprovisioned boot lookup)
    r = await ac.get("/api/v1/licenses/ARY-HW-abc123", headers=_auth(token))
    assert r.status_code == 200 and r.json()["license_id"] == lic_id
    r = await ac.get("/api/v1/licenses/verify/ARY-HW-abc123", headers=_auth(token))
    assert r.status_code == 200 and r.json()["signature_valid"] is True


@needs_db
async def test_expired_filter_and_revoke(client):
    ac, factory = client
    token, _, _ = await _make_user(factory, email="ops2@example.com")

    r = await ac.post(
        "/api/v1/licenses/subscribe",
        json={"plan_slug": "enterprise", "hardware_token": "ARY-HW-zzz001", "days_valid": 30},
        headers=_auth(token),
    )
    lic_id = r.json()["license_id"]

    # backdate expiry to simulate an expired license
    async with factory() as db:
        row = (await db.execute(select(License).where(License.license_id == lic_id))).scalar_one()
        row.expires_at = int(time.time()) - 10
        await db.commit()

    r = await ac.get("/api/v1/licenses?status=active", headers=_auth(token))
    assert r.json() == []
    r = await ac.get("/api/v1/licenses?status=expired", headers=_auth(token))
    assert len(r.json()) == 1 and r.json()[0]["status"] == "expired"

    r = await ac.post(f"/api/v1/licenses/{lic_id}/revoke", headers=_auth(token))
    assert r.status_code == 200 and r.json()["status"] == "revoked"


@needs_db
async def test_activate_and_portal_download_and_legacy(client):
    ac, factory = client
    token, _, _ = await _make_user(factory, email="ops3@example.com")

    # zero-touch activate bootstraps from tenant tier (PRO -> enterprise)
    r = await ac.post(
        "/api/v1/licenses/activate",
        json={"hardware_token": "ARY-HW-node99", "hostname": "sentinel-substation-01"},
        headers=_auth(token),
    )
    assert r.status_code == 200 and r.json()["status"] == "ACTIVATED"
    body = r.json()
    assert body["lease_days"] == 30
    cpp = body["envelope"]
    assert cpp["signature_algorithm"] == "ED25519"
    assert lic.verify_envelope(cpp) is True
    # legacy claims shape still present for dashboard / portal consumers
    assert body["license_envelope"]["claims"]["locked_hardware_uuid"] == "node99"

    # portal download returns a .lic attachment whose body is directly
    # persistable (cpp envelope) and verifies offline
    r = await ac.post(
        "/api/v1/licenses/portal-download",
        json={"hardware_token": "ARY-HW-node99"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert "attachment" in r.headers["content-disposition"]
    assert lic.verify_envelope(r.json()) is True

    # legacy singular aliases (deployed firmware compat)
    r = await ac.post(
        "/api/v1/license/activate",
        json={"hardware_token": "ARY-HW-node99"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    r = await ac.get("/api/v1/licenses/public-key")
    assert r.status_code == 200 and r.json()["algorithm"] == "ED25519"
