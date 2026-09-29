"""Overview and XAI schemas."""

from pydantic import BaseModel
from datetime import datetime


class OverviewMetricsResponse(BaseModel):
    online_nodes: int
    total_drops: int
    mean_sla_us: float
    stable_model: str


class ThreatMapResponse(BaseModel):
    coordinates: list[dict]


class LatencyDistributionResponse(BaseModel):
    p50: float
    p90: float
    p95: float
    p99: float
    p999: float


class XAIAttributionResponse(BaseModel):
    attacker_ip: str
    mitre_id: str | None
    attributions: list[dict]


class XAIDetailResponse(BaseModel):
    incident_id: str
    residuals: list[dict]
    baseline_mean: list[dict]
    audit_note: str | None
