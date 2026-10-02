"""Canary rollout state machine for neural threat models.

Single OTARollout row per tenant tracks stable/candidate versions.
Transitions: SHADOW_MODE -> CANARY_5_PCT -> FLEET_WIDE, plus emergency
rollback. Promoting a candidate to FLEET_WIDE demotes the previous
fleet-wide models to DISABLED. Stages used here stay within the strict
ThreatModelStage enum so GET /api/v1/models validation never breaks.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import Model, ModelStage, OTARollout
from app.services.model_inventory import ensure_filename_column

ORDER = [ModelStage.SHADOW_MODE, ModelStage.CANARY_5_PCT, ModelStage.FLEET_WIDE]


async def _rollout(db: AsyncSession, tenant_id: str) -> OTARollout:
    result = await db.execute(
        select(OTARollout).where(OTARollout.tenant_id == tenant_id)
    )
    rollout = result.scalar_one_or_none()
    if rollout is None:
        rollout = OTARollout(
            stable_version="v1",
            candidate_version=None,
            stage=ModelStage.FLEET_WIDE,
            tenant_id=tenant_id,
        )
        db.add(rollout)
        await db.flush()
    return rollout


async def get_status(db: AsyncSession, tenant_id: str) -> dict:
    await ensure_filename_column()
    rollout = await _rollout(db, tenant_id)
    await db.flush()
    return {
        "stable_version": rollout.stable_version,
        "candidate_version": rollout.candidate_version,
        "stage": rollout.stage.value
        if isinstance(rollout.stage, ModelStage)
        else str(rollout.stage),
    }


async def stage_candidate(
    db: AsyncSession, tenant_id: str, version: str, sha256: str, url: str
) -> dict:
    """Stage newly trained Forge weights into SHADOW_MODE."""
    await ensure_filename_column()
    filename = version if version.endswith(".onnx") else f"{version}.onnx"
    result = await db.execute(
        select(Model).where(
            Model.tenant_id == tenant_id,
            Model.filename == filename,
        )
    )
    model = result.scalar_one_or_none()
    if model is None:
        model = Model(
            filename=filename,
            version=version[:32],
            sha256=sha256,
            size_bytes=0,
            download_url=url,
            stage=ModelStage.SHADOW_MODE,
            tenant_id=tenant_id,
        )
        db.add(model)
    else:
        model.sha256 = sha256
        model.download_url = url
        model.stage = ModelStage.SHADOW_MODE
    rollout = await _rollout(db, tenant_id)
    rollout.candidate_version = version
    rollout.stage = ModelStage.SHADOW_MODE
    await db.flush()
    return {"status": "candidate_staged", "stage": "SHADOW_MODE"}


async def advance(db: AsyncSession, tenant_id: str) -> dict:
    """Advance rollout: Shadow -> 5% -> Fleet (promotes on arrival)."""
    await ensure_filename_column()
    rollout = await _rollout(db, tenant_id)
    try:
        idx = ORDER.index(rollout.stage)
    except ValueError:
        idx = 0
    new_stage = ORDER[min(idx + 1, len(ORDER) - 1)]
    rollout.stage = new_stage
    if rollout.candidate_version:
        filename = (
            rollout.candidate_version
            if rollout.candidate_version.endswith(".onnx")
            else f"{rollout.candidate_version}.onnx"
        )
        result = await db.execute(
            select(Model).where(
                Model.tenant_id == tenant_id,
                Model.filename == filename,
            )
        )
        candidate = result.scalar_one_or_none()
        if candidate is not None:
            candidate.stage = new_stage
        if new_stage == ModelStage.FLEET_WIDE:
            result = await db.execute(
                select(Model).where(
                    Model.tenant_id == tenant_id,
                    Model.stage == ModelStage.FLEET_WIDE,
                    Model.filename != filename,
                )
            )
            for old in result.scalars().all():
                old.stage = ModelStage.DISABLED
            rollout.stable_version = rollout.candidate_version
            rollout.candidate_version = None
    await db.flush()
    return {
        "status": "advanced",
        "stage": new_stage.value,
        "new_stage": new_stage.value,
    }


async def rollback(db: AsyncSession, tenant_id: str) -> dict:
    """Emergency rollback to the previous stable model."""
    await ensure_filename_column()
    rollout = await _rollout(db, tenant_id)
    if rollout.candidate_version:
        filename = (
            rollout.candidate_version
            if rollout.candidate_version.endswith(".onnx")
            else f"{rollout.candidate_version}.onnx"
        )
        result = await db.execute(
            select(Model).where(
                Model.tenant_id == tenant_id,
                Model.filename == filename,
            )
        )
        candidate = result.scalar_one_or_none()
        if candidate is not None:
            candidate.stage = ModelStage.DISABLED
        rollout.candidate_version = None
    rollout.stage = ModelStage.FLEET_WIDE
    await db.flush()
    return {
        "status": "emergency_rollback_executed",
        "active": rollout.stable_version,
        "stage": ModelStage.FLEET_WIDE.value,
    }
