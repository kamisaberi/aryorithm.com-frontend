"""Mission Control & Executive Overview routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.overview import (
    OverviewMetricsResponse,
    ThreatMapResponse,
    LatencyDistributionResponse,
    XAIAttributionResponse,
    XAIDetailResponse,
)

router = APIRouter(tags=["Mission Control"])


@router.get("/overview/metrics", response_model=OverviewMetricsResponse)
async def get_overview_metrics(
    enclave_id: str | None = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """High-level KPI cards (Active nodes, drops, SLA, egress)."""
    return OverviewMetricsResponse(
        online_nodes=124,
        total_drops=142080,
        mean_sla_us=0.84,
        stable_model="v2.4",
    )


@router.get("/overview/threat-map", response_model=ThreatMapResponse)
async def get_threat_map(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Geospatial and enclave attack coordinates."""
    return ThreatMapResponse(
        coordinates=[
            {"site": "Substation-01", "lat": 59.43, "lng": 24.75, "active_threat": True},
            {"site": "Substation-02", "lat": 59.44, "lng": 24.76, "active_threat": False},
        ]
    )


@router.get("/overview/latency-distribution", response_model=LatencyDistributionResponse)
async def get_latency_distribution(
    window: str = Query("24h"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Percentile histogram (p50, p90, p95, p99, p99.9)."""
    return LatencyDistributionResponse(p50=0.84, p90=0.89, p95=0.92, p99=0.98, p999=1.04)


@router.get("/xai/recent", response_model=list[XAIAttributionResponse])
async def get_recent_xai(
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent XAI feature attribution cards."""
    return [
        XAIAttributionResponse(
            attacker_ip="198.51.100.45",
            mitre_id="T0855",
            attributions=[{"feature": "SCADA_FC", "pct": 54.2}],
        ),
        XAIAttributionResponse(
            attacker_ip="203.0.113.99",
            mitre_id="T1059",
            attributions=[{"feature": "CMD_SEQ", "pct": 38.7}],
        ),
    ]


@router.get("/xai/{incident_id}", response_model=XAIDetailResponse)
async def get_xai_detail(
    incident_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deep-dive feature attribution for single incident."""
    return XAIDetailResponse(
        incident_id=incident_id,
        residuals=[{"feature": "SCADA_FC", "value": 0.42}],
        baseline_mean=[{"feature": "SCADA_FC", "value": 0.12}],
        audit_note="Anomalous SCADA function code detected with high confidence.",
    )
