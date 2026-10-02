"""Top-level OTA routes — GET/POST /api/v1/ota/* (route-table contract)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.user import User
from app.services import ota as ota_service

router = APIRouter(prefix="/ota", tags=["OTA Rollout"])


class OTAStatus(BaseModel):
    stable_version: str
    candidate_version: str | None = None
    stage: str


class OTAStageBody(BaseModel):
    version: str
    sha256: str
    url: str


class OTAStageResult(BaseModel):
    status: str
    stage: str


class OTAAdvanceResult(BaseModel):
    status: str
    stage: str


class OTARollbackResult(BaseModel):
    status: str
    active: str


@router.get("/status", response_model=OTAStatus)
async def ota_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current Canary staged rollout status."""
    return OTAStatus(**await ota_service.get_status(db, user.tenant_id))


@router.post("/stage", response_model=OTAStageResult)
async def ota_stage(
    body: OTAStageBody,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stage newly trained Forge candidate weights into SHADOW_MODE."""
    return OTAStageResult(
        **await ota_service.stage_candidate(
            db, user.tenant_id, body.version, body.sha256, body.url
        )
    )


@router.post("/advance", response_model=OTAAdvanceResult)
async def ota_advance(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Advance rollout (Shadow -> 5% -> Fleet)."""
    data = await ota_service.advance(db, user.tenant_id)
    return OTAAdvanceResult(status=data["status"], stage=data["stage"])


@router.post("/rollback", response_model=OTARollbackResult)
async def ota_rollback(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Emergency rollback to previous stable model."""
    data = await ota_service.rollback(db, user.tenant_id)
    return OTARollbackResult(status=data["status"], active=data["active"])
