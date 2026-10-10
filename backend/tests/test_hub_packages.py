"""Sentinel packages tests (isolated in-memory SQLite, public endpoints)."""

import hashlib

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 (register tables)
from app.database import Base, get_db
from app.main import app
from app.models.hub import SentinelPackage
from app.services import sentinel_packages as spkg

needs_db = pytest.mark.asyncio

EXPECTED_SLUGS = {
    "modbus-actuator-guard",
    "s7comm-safety-interlock",
    "log4j-jndi-fastdrop",
    "iec104-grid-shield",
    "http-rapid-reset-shield",
    "dicom-phi-sanitizer",
    "dnp3-water-telemetry",
    "mavlink-uav-guardian",
}


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


@needs_db
async def test_seed_stores_eight_records(client):
    ac, factory = client
    r = await ac.get("/api/v1/hub/packages")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list) and len(body) == 8
    assert {p["slug"] for p in body} == EXPECTED_SLUGS
    assert all(p["verified"] is True for p in body)
    assert {p["tier"] for p in body} == {"native", "wasm", "lua"}
    # Reseed is convergent — still exactly 8, no duplicates.
    await ac.get("/api/v1/hub/packages")
    async with factory() as db:
        count = (await db.execute(select(func.count()).select_from(SentinelPackage))).scalar()
        assert count == 8


@needs_db
async def test_record_field_fidelity(client):
    ac, _ = client
    r = await ac.get("/api/v1/hub/packages/modbus-actuator-guard")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == "org.aryorithm.package.modbus_actuator_guard"
    assert body["name"] == "Modbus SCADA Physical Actuator Guard"
    assert body["version"] == "1.0.0"
    assert body["tier"] == "native"
    assert body["tier_display"] == "Tier A (Native C++20)"
    assert body["language"] == "C++20"
    assert body["author"] == "Aryorithm Certified Security Team"
    assert body["sector"] == "Water, Oil & Gas, Manufacturing"
    assert body["target_protocol"] == "MODBUS_TCP"
    assert body["default_port"] == 502
    assert body["latency_sla_ns"] == 120
    assert body["latency_display"] == "< 120 ns"
    assert body["mitigation_action"] == "KERNEL_DROP"
    assert body["compliance_tags"] == ["IEC-62443-4-2-FR3", "CMMC-SI.L2-3.14.1"]
    assert body["package_file_name"] == "modbus_actuator_guard.spkg"
    assert body["package_file_size_bytes"] == 23552
    assert body["signature_algorithm"] == "Ed25519"
    assert body["install_command"] == "nexus-ctl hub broadcast modbus_actuator_guard.spkg"
    assert body["created_at"].startswith("2026-10-10T12:00:00")

    r = await ac.get("/api/v1/hub/packages/no-such-package")
    assert r.status_code == 404


@needs_db
async def test_list_filters(client):
    ac, _ = client
    r = await ac.get("/api/v1/hub/packages", params={"tier": "wasm"})
    assert r.status_code == 200
    assert {p["slug"] for p in r.json()} == {
        "s7comm-safety-interlock", "dicom-phi-sanitizer", "mavlink-uav-guardian",
    }
    r = await ac.get("/api/v1/hub/packages", params={"tier": "bogus"})
    assert r.status_code == 400

    r = await ac.get("/api/v1/hub/packages", params={"sector": "water"})
    assert {p["slug"] for p in r.json()} == {"modbus-actuator-guard", "dnp3-water-telemetry"}
    r = await ac.get("/api/v1/hub/packages", params={"sector": "HEALTHCARE"})
    assert [p["slug"] for p in r.json()] == ["dicom-phi-sanitizer"]

    r = await ac.get("/api/v1/hub/packages", params={"search": "drone"})
    assert [p["slug"] for p in r.json()] == ["mavlink-uav-guardian"]
    r = await ac.get("/api/v1/hub/packages", params={"search": "s7comm"})
    assert [p["slug"] for p in r.json()] == ["s7comm-safety-interlock"]
    r = await ac.get("/api/v1/hub/packages", params={"tier": "native", "search": "water"})
    assert {p["slug"] for p in r.json()} == {"modbus-actuator-guard", "dnp3-water-telemetry"}
    r = await ac.get("/api/v1/hub/packages", params={"search": "zzz-no-match"})
    assert r.json() == []


@needs_db
async def test_download_is_self_consistent(client):
    ac, _ = client
    r = await ac.get("/api/v1/hub/packages/dicom-phi-sanitizer/download")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/octet-stream"
    assert r.headers["content-disposition"] == 'attachment; filename="dicom_phi_sanitizer.spkg"'
    assert len(r.content) == 19456
    assert r.headers["x-checksum-sha256"] == hashlib.sha256(r.content).hexdigest()
    assert r.content.startswith(b"SPKG1:org.aryorithm.package.dicom_phi_sanitizer:1.0.0\n")

    r = await ac.get("/api/v1/hub/packages/no-such-package/download")
    assert r.status_code == 404


@needs_db
async def test_spkg_bytes_match_record_size(client):
    ac, factory = client
    await ac.get("/api/v1/hub/packages")  # trigger seed
    async with factory() as db:
        rows = (await db.execute(select(SentinelPackage))).scalars().all()
        assert len(rows) == 8
        for row in rows:
            assert len(spkg.build_spkg_bytes(row)) == row.package_file_size_bytes
