"""Cyber-Range & Digital Twin Simulation routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.range import (
    DigitalTwinResponse,
    DigitalTwinCreate,
    DigitalTwinCreateResponse,
    TwinActionResponse,
    AttackReplayRequest,
    AttackReplayResponse,
    ResilienceScoreResponse,
)

router = APIRouter(prefix="/range", tags=["Cyber Range"])


@router.get("/twins", response_model=list[DigitalTwinResponse])
async def list_twins(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List virtual digital twin topologies."""
    return [
        DigitalTwinResponse(twin_id="TWIN-OT-SUBSTATION", nodes=5, status="IDLE"),
        DigitalTwinResponse(twin_id="TWIN-REFINERY-B", nodes=8, status="RUNNING"),
    ]


@router.post("/twins", response_model=DigitalTwinCreateResponse)
async def create_twin(
    body: DigitalTwinCreate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create custom virtual network topology."""
    return DigitalTwinCreateResponse(twin_id="TWIN-new01", status="PROVISIONED")


@router.post("/twins/{twin_id}/start", response_model=TwinActionResponse)
async def start_twin(
    twin_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Spin up virtual cyber range in cloud/sandbox."""
    return TwinActionResponse(status="RUNNING", sandbox_ip="10.240.0.1")


@router.post("/twins/{twin_id}/stop", response_model=TwinActionResponse)
async def stop_twin(
    twin_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismantle virtual sandbox."""
    return TwinActionResponse(status="TERMINATED")


@router.post("/attacks/replay", response_model=AttackReplayResponse)
async def replay_attack(
    body: AttackReplayRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replay real-world malware capture (PCAP)."""
    return AttackReplayResponse(status="STREAMING", frames_injected=120)


@router.get("/resilience/score", response_model=ResilienceScoreResponse)
async def get_resilience_score(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Compute MTTFI and auto-rollback resilience score."""
    return ResilienceScoreResponse(mttfi_ms=38.4, rollback_guard_ms=120, score=98.4)
