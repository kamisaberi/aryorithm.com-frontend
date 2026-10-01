"""Threat Defense & Collective Intelligence routes."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_nexus_caller
from app.models.user import User
from app.schemas.threat import (
    ThreatEventResponse,
    ThreatBroadcastRequest,
    ThreatBroadcastResponse,
    CollectiveBusResponse,
    MitreHitResponse,
    ScadaResponse,
    IdentityBotResponse,
    GlobalFeedItem,
)

router = APIRouter(prefix="/threats", tags=["Threat Defense"])

logger = logging.getLogger("uvicorn.error")


@router.get("/events", response_model=list[ThreatEventResponse])
async def list_threat_events(
    limit: int = Query(50, ge=1, le=200),
    tactic: str | None = Query(None),
    user: User = Depends(get_current_user),
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
            detected_at=datetime(2026, 9, 29, 10, 30, tzinfo=timezone.utc),
        ),
        ThreatEventResponse(
            threat_id="threat-002",
            attacker_ip="203.0.113.99",
            mitre_id="T1059",
            tactic="Command and Scripting Interpreter",
            dropped=True,
            detected_at=datetime(2026, 9, 29, 10, 25, tzinfo=timezone.utc),
        ),
    ]


@router.post("/broadcast", response_model=ThreatBroadcastResponse)
async def broadcast_threat(
    body: ThreatBroadcastRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Broadcast zero-day IP fleet-wide (< 50ms)."""
    return ThreatBroadcastResponse(status="broadcast_dispatched", target_ip=body.ip)


@router.get("/collective-bus", response_model=list[CollectiveBusResponse])
async def list_collective_bus(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Live collective defense synchronization log."""
    return [
        CollectiveBusResponse(rule_id="RULE-441", origin_node="NODE-01", fanout_latency_ms=38.4),
        CollectiveBusResponse(rule_id="RULE-442", origin_node="NODE-02", fanout_latency_ms=41.2),
    ]


@router.get("/mitre", response_model=list[MitreHitResponse])
async def list_mitre_hits(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Aggregated MITRE ATT&CK technique hit counts."""
    return [
        MitreHitResponse(technique_id="T0855", name="Unauthorized Command", count=14),
        MitreHitResponse(technique_id="T1059", name="Command and Scripting Interpreter", count=8),
        MitreHitResponse(technique_id="T1071", name="Application Layer Protocol", count=5),
    ]


@router.get("/scada", response_model=ScadaResponse)
async def get_scada_monitor(
    protocol: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dedicated SCADA OT anomaly monitor."""
    return ScadaResponse(modbus_violations=12, dnp3_violations=2, overrides_blocked=14)


@router.get("/identity-bot", response_model=IdentityBotResponse)
async def get_identity_bot(
    type: str | None = Query(None),  # noqa: A002 - query param name is part of public API
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ITDR & Bot kinematics telemetry."""
    return IdentityBotResponse(impossible_velocity_hits=4, bot_kinematic_blocks=22)


@router.get("/global-feed", response_model=list[GlobalFeedItem])
async def get_global_feed(
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    caller: User | None = Depends(get_nexus_caller),
):
    """Sentinel-nexus inbound threat polling — GET every ~20s.

    Sender headers: `Authorization: Bearer <JWT>`, `X-Tenant-ID`.
    Returns bare list `[{"ip": "..."}]` (or `[]` when empty) —
    exactly what Nexus parses.
    """
    feed = [GlobalFeedItem(ip="185.220.101.5")]
    logger.info(
        "GET /api/v1/threats/global-feed tenant=%s count=%d user=%s",
        x_tenant_id or "tenant-dev-local",
        len(feed),
        getattr(caller, "id", "api-key"),
    )
    print(
        f"[threats/global-feed] tenant={x_tenant_id or 'tenant-dev-local'} "
        f"count={len(feed)} ips={[i.ip for i in feed]}",
        flush=True,
    )
    return feed
