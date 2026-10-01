"""Shared inventory logic for GET /api/v1/models (spec brief)."""

from pathlib import Path

from sqlalchemy import inspect, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine
from app.models.ai import Model, ModelStage

# Local mirror dir for ONNX binaries served by GET /api/v1/models/{filename}.
# backend/app/services/model_inventory.py -> parents[2] == backend/
MODEL_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "models"

# Real-world cybersecurity ONNX artifacts (verified 2026-10-02).
# sha256/size_bytes below are the actual upstream bytes. The two quantized
# int8 models are mirrored under storage/models/; the 499MB CodeBERT
# artifact stays Hugging Face-hosted and is served via 302 redirect.
# Sources (all public, ungated Hugging Face repos):
# - sms_spam_bert_tiny_int8: onnx-community/bert-tiny-finetuned-sms-spam-detection-ONNX
#   (onnx/model_int8.onnx; base mrm8488/bert-tiny-finetuned-sms-spam-detection) — SMS smishing
# - phishing_bert_small_int8: onnx-community/bert-small-phishing-ONNX
#   (onnx/model_int8.onnx; base David-Egea/bert-small-phishing, MIT) — phishing text
# - malicious_url_codebert: protectai/codebert-base-Malicious_URLs-onnx
#   (model.onnx; base DunnBC22/codebert-base-Malicious_URLs) — malicious URLs
WEB_MODELS: list[dict] = [
    {
        "filename": "sms_spam_bert_tiny_int8.onnx",
        "version": "v3",
        "sha256": "0ce41a2af81a71712cbfcd84f8b0b583e7a345db14ce179905aa1ca02c992d4a",
        "size_bytes": 4490601,
        "download_url": "/api/v1/models/sms_spam_bert_tiny_int8.onnx",
        "stage": ModelStage.CANARY_5_PCT,
    },
    {
        "filename": "phishing_bert_small_int8.onnx",
        "version": "v4",
        "sha256": "b82f10fd29dee2c9fe9cae51997529234bb889151965e0580c4f008e8124455e",
        "size_bytes": 28990230,
        "download_url": "/api/v1/models/phishing_bert_small_int8.onnx",
        "stage": ModelStage.SHADOW_MODE,
    },
    {
        "filename": "malicious_url_codebert.onnx",
        "version": "v5",
        "sha256": "6afa5ed584331bf116f19525e3818577337a5b91462650915ae52b7e1f521c39",
        "size_bytes": 498876751,
        "download_url": (
            "https://huggingface.co/protectai/codebert-base-Malicious_URLs-onnx"
            "/resolve/main/model.onnx"
        ),
        "stage": ModelStage.SHADOW_MODE,
    },
]

# Mirror sources for seed_web_models.py (absolute-URL rows need no mirror).
SOURCE_URLS: dict[str, str] = {
    "sms_spam_bert_tiny_int8.onnx": (
        "https://huggingface.co/onnx-community/bert-tiny-finetuned-sms-spam-detection-ONNX"
        "/resolve/main/onnx/model_int8.onnx"
    ),
    "phishing_bert_small_int8.onnx": (
        "https://huggingface.co/onnx-community/bert-small-phishing-ONNX"
        "/resolve/main/onnx/model_int8.onnx"
    ),
    "malicious_url_codebert.onnx": (
        "https://huggingface.co/protectai/codebert-base-Malicious_URLs-onnx"
        "/resolve/main/model.onnx"
    ),
}

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


async def ensure_web_models(db: AsyncSession, tenant_id: str) -> None:
    """Idempotently seed real-world cybersecurity ONNX rows for a tenant.

    Rows whose sha256 is still an unfilled placeholder are skipped, so a
    half-configured entry can never land in the database.
    """
    await ensure_filename_column()
    result = await db.execute(select(Model.filename).where(Model.tenant_id == tenant_id))
    existing = set(result.scalars().all())
    for meta in WEB_MODELS:
        if meta["filename"] not in existing and "REPLACE_" not in meta["sha256"]:
            db.add(Model(tenant_id=tenant_id, **meta))
    await db.flush()


async def list_models_for_tenant(db: AsyncSession, tenant_id: str) -> list[Model]:
    await ensure_default_models(db, tenant_id)
    await ensure_web_models(db, tenant_id)
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
