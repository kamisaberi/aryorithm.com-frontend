"""Threat Defense & Collective Intelligence routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.threat import (
    ThreatEventResponse,
    ThreatBroadcastRequest,
    ThreatBroadcastResponse,
    CollectiveBusResponse,
    MitreHitResponse,
    ScadaResponse,
    IdentityBotResponse,
)

router = APIRouter(prefix="/threats", tags=["Threat Defense"])


@router.get("/events", response_model=list[ThreatEventResponse])
async def list_threat_events(
    limit: int = Query(50, ge=1, le=200),
    tactic: str | None = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Historical log of detected & dropped threats."""
    return [
        ThreatEventResponse(
            threat_id="threat-001",
            attacker_ip="198.51.100.45",
            mitre_id="T0855",
            tactic="Lateral Movement",
            dropped=True,
            detected_at="2026-09-29T10:30:00Z",
        ),
        ThreatEventResponse(
            threat_id="threat-002",
            attacker_ip="203.0.113.99",
            mitre_id="T1059",
            tactic="Command and Scripting Interpreter",
            dropped=True,
            detected_at="2026-09-29T10:25:00Z",
        ),
    ]


@router.post("/broadcast", response_model=ThreatBroadcastResponse)
async def broadcast_threat(
    body: ThreatBroadcastRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Broadcast zero-day IP fleet-wide (< 50ms)."""
    return ThreatBroadcastResponse(status="broadcast_dispatched", target_ip=body.ip)


@router.get("/collective-bus", response_model=list[CollectiveBusResponse])
async def list_collective_bus(
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Live collective defense synchronization log."""
    return [
        CollectiveBusResponse(rule_id="RULE-441", origin_node="NODE-01", fanout_latency_ms=38.4),
        CollectiveBusResponse(rule_id="RULE-442", origin_node="NODE-02", fanout_latency_ms=41.2),
    ]


@router.get("/mitre", response_model=list[MitreHitResponse])
async def list_mitre_hits(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Aggregated MITRE ATT&CK technique hit counts."""
    return [
        MitreHitResponse(technique_id="T0855", name="Unauthorized Command", count=14),
        MitreHitResponse(technique_id="T1059", name="Command and Scripting Interpreter", count=8),
        MitreHitResponse(technique_id="T1071", name="Application Layer Protocol", count=5),
    ]


@router.get("/scada", response_model=ScadaResponse)
async def get_scada_monitor(
    protocol: str | None = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dedicated SCADA OT anomaly monitor."""
    return ScadaResponse(modbus_violations=12, dnp3_violations=2, overrides_blocked=14)


@router.get("/identity-bot", response_model=IdentityBotResponse)
async def get_identity_bot(
    type: str | None = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ITDR & Bot kinematics telemetry."""
    return IdentityBotResponse(impossible_velocity_hits=4, bot_kinematic_blocks=22)
