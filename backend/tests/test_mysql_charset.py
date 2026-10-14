"""MySQL utf8mb4 hardening tests.

- Dump DDL pins the charset (no server needed; always runs).
- ensure_mysql_tables_utf8mb4 converts latin1 tables (needs a live MySQL
  with CREATE DATABASE rights; set MYSQL_CHARSET_TEST_URL, else skipped):
      MYSQL_CHARSET_TEST_URL="mysql+aiomysql://root@127.0.0.1:3307/?charset=utf8mb4"
"""

import os

import pytest

needs_db = pytest.mark.asyncio


def test_dump_pins_utf8mb4_charset(tmp_path):
    from tools.transfer_mysql import build_dump

    sql_text, counts = build_dump("./aryorithm.db")
    assert counts
    statements = [blk for blk in sql_text.split(";\n") if blk.lstrip().startswith("CREATE TABLE")]
    assert statements, "dump must contain CREATE TABLE statements"
    for ddl in statements:
        assert "CHARSET=utf8mb4" in ddl, ddl[:120]
        assert "COLLATE=utf8mb4_unicode_ci" in ddl, ddl[:120]


LIVE_URL = os.environ.get("MYSQL_CHARSET_TEST_URL")
needs_live_mysql = pytest.mark.skipif(not LIVE_URL, reason="needs MYSQL_CHARSET_TEST_URL")


def _db_url(db_name: str) -> str:
    base = LIVE_URL.rstrip("/")
    root, _, query = base.partition("?")
    return f"{root.rstrip('/')}/{db_name}?{query}" if query else f"{root.rstrip('/')}/{db_name}"


@needs_db
@needs_live_mysql
async def test_ensure_converts_latin1_tables():
    import uuid

    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.database import ensure_mysql_tables_utf8mb4

    db_name = f"charset_probe_{uuid.uuid4().hex[:8]}"
    admin = create_async_engine(_db_url("mysql"))
    try:
        async with admin.begin() as conn:
            await conn.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`"))
            # Simulate a cPanel database created with the server default.
            await conn.execute(text(f"CREATE DATABASE `{db_name}` CHARACTER SET latin1"))
            await conn.execute(text(f"CREATE TABLE `{db_name}`.`probe` "
                                    "(id VARCHAR(36) PRIMARY KEY, label VARCHAR(255))"))
            await conn.execute(text(f"INSERT INTO `{db_name}`.`probe` VALUES ('a', 'plain ascii')"))
        target = create_async_engine(_db_url(db_name))
        try:
            fixed = await ensure_mysql_tables_utf8mb4(target)
            assert fixed["tables"] == ["probe"], fixed
            async with target.connect() as conn:
                coll = (await conn.execute(text(
                    "SELECT TABLE_COLLATION FROM information_schema.TABLES "
                    "WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'probe'"), {"db": db_name})).scalar()
                assert coll == "utf8mb4_unicode_ci", coll
                assert (await conn.execute(text(f"SELECT label FROM `{db_name}`.`probe`"))).scalar() == "plain ascii"
            # Second run is a no-op.
            target2 = create_async_engine(_db_url(db_name))
            try:
                assert await ensure_mysql_tables_utf8mb4(target2) == {"database": False, "tables": []}
            finally:
                await target2.dispose()
        finally:
            await target.dispose()
    finally:
        async with admin.begin() as conn:
            await conn.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`"))
        await admin.dispose()


@needs_db
@needs_live_mysql
async def test_installer_heals_latin1_database(tmp_path, monkeypatch):
    """End-to-end: /install/run into a latin1-default DB (the 1366 report)."""
    import uuid

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    import app.routers.install as install_mod
    from app.main import app

    monkeypatch.setattr(install_mod, "ENV_PATH", tmp_path / ".env")
    monkeypatch.setattr(install_mod, "LOCK_PATH", tmp_path / "install.lock")

    db_name = f"charset_install_{uuid.uuid4().hex[:8]}"
    admin = create_async_engine(_db_url("mysql"))
    try:
        async with admin.begin() as conn:
            await conn.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`"))
            await conn.execute(text(f"CREATE DATABASE `{db_name}` CHARACTER SET latin1"))
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            r = await ac.post("/api/v1/install/run", json={
                "db_driver": "mysql", "db_host": "127.0.0.1", "db_port": 3307,
                "db_name": db_name, "db_user": "root", "db_password": "",
                "admin_email": "latin@example.com", "admin_password": "StrongPass123",
                "seed_plans": True, "seed_models": False, "seed_sentinel": False,
                "seed_model_vault": False, "seed_demo": False,
            })
            assert r.status_code == 200, r.text[:500]
            body = r.json()
            assert body["ok"] is True
            assert body["charset_fixed_database"] is True, body
            # Seeding landed in the SCRATCH db (the test client itself talks
            # to the real global engine, so verify directly): admin user with
            # working password + the previously-failing ▸ rows present.
            from sqlalchemy import select as _select

            from app.models.subscription import PlanEntitlement as _PE
            from app.models.user import User as _User
            from app.utils.security import verify_password as _vp

            check = create_async_engine(
                _db_url(db_name), pool_pre_ping=True)
            try:
                from sqlalchemy.ext.asyncio import async_sessionmaker as _sm

                async with _sm(check, expire_on_commit=False)() as db:
                    u = (await db.execute(_select(_User).where(
                        _User.email == "latin@example.com"))).scalar_one_or_none()
                    assert u is not None
                    assert _vp("StrongPass123", u.password_hash)
                    labels = [r for r in (await db.execute(_select(_PE.item_label))).scalars()]
                    assert any(str(v).startswith("▸") for v in labels), labels[:3]
            finally:
                await check.dispose()
    finally:
        async with admin.begin() as conn:
            await conn.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`"))
        await admin.dispose()


@needs_db
@needs_live_mysql
async def test_ensure_is_noop_on_compliant_and_sqlite():
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.database import ensure_mysql_tables_utf8mb4

    ok = create_async_engine(_db_url("aryorithm"))
    try:
        assert await ensure_mysql_tables_utf8mb4(ok) == {"database": False, "tables": []}
    finally:
        await ok.dispose()

    lite = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        assert await ensure_mysql_tables_utf8mb4(lite) == {"database": False, "tables": []}
    finally:
        await lite.dispose()
