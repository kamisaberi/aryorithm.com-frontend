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
