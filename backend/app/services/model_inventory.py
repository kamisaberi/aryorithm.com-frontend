"""Shared inventory logic for GET /api/v1/models (spec brief)."""

from sqlalchemy import inspect, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine
from app.models.ai import Model, ModelStage

# Built-in / default seed data from the spec brief (exact values).
DEFAULT_MODELS: list[dict] = [
    {
        "filename": "network_threat_v1.onnx",
        "version": "v1",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "size_bytes": 1420500,
        "download_url": "/api/v1/models/network_threat_v1.onnx",
        "stage": ModelStage.FLEET_WIDE,
    },
    {
        "filename": "network_threat_v2.onnx",
        "version": "v2",
        "sha256": "8fa9c89b3f4618e47f5255470d9a690e7da3c6046e297893a776",
        "size_bytes": 1485200,
        "download_url": "/api/v1/models/network_threat_v2.onnx",
        "stage": ModelStage.SHADOW_MODE,
    },
]


async def ensure_filename_column() -> None:
    """Lightweight SQLite migration: ADD COLUMN models.filename if missing.

    Base.metadata.create_all() does not add columns to existing tables,
    and aryorithm.db already ships a `models` table without `filename`.
    """
    def _check_and_add(sync_conn) -> None:
        insp = inspect(sync_conn)
        try:
            cols = [c["name"] for c in insp.get_columns("models")]
        except Exception:
            return
        if "filename" not in cols:
            sync_conn.execute(text("ALTER TABLE models ADD COLUMN filename VARCHAR(255)"))

    async with engine.begin() as conn:
        await conn.run_sync(_check_and_add)


async def ensure_default_models(db: AsyncSession, tenant_id: str) -> None:
    """Idempotently seed the two baseline records for a tenant."""
    await ensure_filename_column()
    result = await db.execute(select(Model).where(Model.tenant_id == tenant_id))
    existing = list(result.scalars().all())
    if existing:
        # Backfill filename/version on legacy rows seeded before the spec.
        changed = False
        by_version = {m.version: m for m in existing}
        for seed in DEFAULT_MODELS:
            row = by_version.get(seed["version"])
            if row is not None and not getattr(row, "filename", None):
                row.filename = seed["filename"]
                row.sha256 = seed["sha256"]
                row.size_bytes = seed["size_bytes"]
                row.download_url = seed["download_url"]
                row.stage = seed["stage"]
                changed = True
        if changed:
            await db.flush()
        # If tenant already has any models, do not duplicate seeds.
        filenames = {getattr(m, "filename", None) for m in existing}
        missing = [s for s in DEFAULT_MODELS if s["filename"] not in filenames]
        if not missing:
            return
        for seed in missing:
            db.add(Model(tenant_id=tenant_id, **seed))
        await db.flush()
        return
    for seed in DEFAULT_MODELS:
        db.add(Model(tenant_id=tenant_id, **seed))
    await db.flush()


async def list_models_for_tenant(db: AsyncSession, tenant_id: str) -> list[Model]:
    await ensure_default_models(db, tenant_id)
    result = await db.execute(
        select(Model).where(Model.tenant_id == tenant_id).order_by(Model.filename)
    )
    return list(result.scalars().all())


def to_metadata_response(m: Model) -> dict:
    stage_value = m.stage.value if isinstance(m.stage, ModelStage) else str(m.stage)
    filename = getattr(m, "filename", None) or f"{m.version}.onnx"
    return {
        "filename": filename,
        "sha256": m.sha256,
        "size_bytes": m.size_bytes,
        "download_url": m.download_url or f"/api/v1/models/{filename}",
        "stage": stage_value,
    }
