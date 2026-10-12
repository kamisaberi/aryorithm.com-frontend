"""Installer wizard tests (isolated — never touches the real .env/lock)."""

import pathlib

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

import app.routers.install as install_mod
from app.main import app

needs_db = pytest.mark.asyncio


@pytest_asyncio.fixture
async def iso_paths(tmp_path, monkeypatch):
    monkeypatch.setattr(install_mod, "ENV_PATH", tmp_path / ".env")
    monkeypatch.setattr(install_mod, "LOCK_PATH", tmp_path / "install.lock")
    monkeypatch.setattr(
        install_mod, "ENV_EXAMPLE_PATH", pathlib.Path("backend/.env.example")
        if pathlib.Path("backend/.env.example").is_file()
        else install_mod.ENV_EXAMPLE_PATH,
    )
    # Resolve repo .env.example regardless of CWD.
    repo_example = pathlib.Path(install_mod.BASE_DIR) / ".env.example"
    monkeypatch.setattr(install_mod, "ENV_EXAMPLE_PATH", repo_example)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, tmp_path


@needs_db
async def test_status_shape(iso_paths):
    ac, _ = iso_paths
    r = await ac.get("/api/v1/install/status")
    assert r.status_code == 200
    body = r.json()
    assert body["installed"] is False  # tmp lock never exists
    assert set(body) >= {"installed", "lock_exists", "has_env", "user_count"}


@needs_db
async def test_generate_secret(iso_paths):
    ac, _ = iso_paths
    r = await ac.get("/api/v1/install/generate-secret")
    assert r.status_code == 200
    assert len(r.json()["secret_key"]) >= 32


@needs_db
async def test_test_connection_sqlite(iso_paths):
    ac, tmp = iso_paths
    r = await ac.post(
        "/api/v1/install/test-connection",
        json={"db_driver": "sqlite", "db_name": str(tmp / "probe.db")},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


@needs_db
async def test_test_connection_bad_mysql(iso_paths):
    ac, _ = iso_paths
    r = await ac.post(
        "/api/v1/install/test-connection",
        json={"db_driver": "mysql", "db_host": "127.0.0.1", "db_port": 19999,
              "db_name": "nope", "db_user": "u", "db_password": "p"},
    )
    assert r.status_code == 400


@needs_db
async def test_test_connection_missing_fields(iso_paths):
    ac, _ = iso_paths
    r = await ac.post(
        "/api/v1/install/test-connection",
        json={"db_driver": "mysql", "db_name": "", "db_user": ""},
    )
    assert r.status_code == 422


@needs_db
async def test_full_run_sqlite(iso_paths):
    ac, tmp = iso_paths
    db_file = str(tmp / "t.db")
    payload = {
        "db_driver": "sqlite", "db_name": db_file,
        "app_name": "TestApp", "app_env": "production", "secret_key": "",
        "tenant_name": "Acme", "admin_name": "Boss",
        "admin_email": "boss@example.com", "admin_password": "StrongPass123",
        "seed_plans": True, "seed_models": True, "seed_sentinel": True,
        "seed_model_vault": False, "seed_demo": True,
    }
    r = await ac.post("/api/v1/install/run", json=payload)
    assert r.status_code == 200, r.text[:500]
    body = r.json()
    assert body["ok"] is True
    assert body["admin_email"] == "boss@example.com"
    assert body["user_count"] >= 1
    assert (tmp / ".env").is_file()
    assert (tmp / "install.lock").is_file()
    env_text = (tmp / ".env").read_text()
    assert "DATABASE_URL=" in env_text and "SECRET_KEY=" in env_text
    assert "StrongPass123" not in env_text  # never persist plaintext password

    # Verify seeded tables directly.
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp}/t.db")
    try:
        async with engine.connect() as conn:
            for table, minimum in [("users", 1), ("tenants", 1),
                                   ("subscription_plans", 4), ("models", 2),
                                   ("sentinel_packages", 8)]:
                n = (await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))).scalar()
                assert n >= minimum, (table, n)
    finally:
        await engine.dispose()

    # Second run without force is locked.
    r2 = await ac.post("/api/v1/install/run", json=payload)
    assert r2.status_code == 403

    # Force re-run is idempotent (no duplicate users).
    payload["force"] = True
    r3 = await ac.post("/api/v1/install/run", json=payload)
    assert r3.status_code == 200
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp}/t.db")
    try:
        async with engine.connect() as conn:
            n = (await conn.execute(text("SELECT COUNT(*) FROM users"))).scalar()
            assert n == 1
    finally:
        await engine.dispose()


@needs_db
async def test_installer_page_served(iso_paths):
    ac, _ = iso_paths
    r = await ac.get("/install")
    assert r.status_code == 200
    assert "Installer" in r.text and "db_name" in r.text
