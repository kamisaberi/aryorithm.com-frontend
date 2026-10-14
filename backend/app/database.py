"""Database engine and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    # Drop dead server-side connections (cPanel/MySQL kills idle ones).
    # Harmless on SQLite.
    pool_pre_ping=True,
    pool_recycle=3600,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def run_schema_ddl(migrate_fn, bind=None) -> None:
    """Run sync DDL (create_all / add-column migrations) on a request's bind.

    Pass ``db.bind`` (the request session's engine) so schema bootstrapping
    never checks out connections from the process-global engine on a foreign
    event loop — aiomysql is strict about loop affinity and raises
    "Future attached to a different loop" otherwise (visible under pytest's
    per-test loops, and a latent risk under multi-loop servers). Falls back
    to the global engine for scripts/CLI (single loop).
    """
    _bind = bind if bind is not None else engine
    if hasattr(_bind, "begin"):
        async with _bind.begin() as conn:
            await conn.run_sync(migrate_fn)
    else:  # already an AsyncConnection
        await _bind.run_sync(migrate_fn)


async def ensure_mysql_tables_utf8mb4(target_engine) -> dict:
    """Make the engine's database fully utf8mb4 (MySQL only).

    Two gaps, both common when the database was created with the server
    default (often latin1 on cPanel):
      1. the database DEFAULT charset — fresh ``create_all`` tables inherit
         it, so fix it first with ``ALTER DATABASE``;
      2. already-created non-utf8mb4 tables — ``CONVERT`` them (content-safe:
         rows could only have arrived through utf8mb4 connections or ASCII,
         both of which convert cleanly).

    Without this, the first non-ASCII seed row (✔/▸/€) dies with
    ``DataError 1366 Incorrect string value``. Returns
    ``{"database": bool, "tables": [...]}`` (empty/False when already
    compliant, or when the engine is not MySQL).
    """
    from sqlalchemy import text

    result: dict = {"database": False, "tables": []}
    if getattr(getattr(target_engine, "dialect", None), "name", "") != "mysql":
        return result
    async with target_engine.connect() as conn:
        db_name = (await conn.execute(text("SELECT DATABASE()"))).scalar()
        if not db_name:
            return result
        schema_charset = (
            await conn.execute(
                text(
                    "SELECT DEFAULT_CHARACTER_SET_NAME FROM information_schema.SCHEMATA "
                    "WHERE SCHEMA_NAME = :db"
                ),
                {"db": db_name},
            )
        ).scalar()
        if not str(schema_charset or "").startswith("utf8mb4"):
            await conn.execute(
                text(
                    f"ALTER DATABASE `{db_name}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            result["database"] = True
        rows = (
            await conn.execute(
                text(
                    "SELECT TABLE_NAME FROM information_schema.TABLES "
                    "WHERE TABLE_SCHEMA = :db AND TABLE_TYPE = 'BASE TABLE' "
                    "AND TABLE_COLLATION IS NOT NULL "
                    "AND TABLE_COLLATION NOT LIKE 'utf8mb4%'"
                ),
                {"db": db_name},
            )
        ).all()
        for (table_name,) in rows:
            # Table names come from information_schema, not user input.
            await conn.execute(
                text(
                    f"ALTER TABLE `{table_name}` "
                    "CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            result["tables"].append(table_name)
        await conn.commit()
    # Dispose so the DDL is visible to subsequently created pools/sessions.
    await target_engine.dispose()
    return result
