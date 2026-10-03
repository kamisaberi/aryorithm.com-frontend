"""Threat defense schemas."""

from pydantic import BaseModel
from datetime import datetime


class ThreatEventResponse(BaseModel):
    threat_id: str
    attacker_ip: str
    mitre_id: str | None
    tactic: str | None
    dropped: bool
    detected_at: datetime


class ThreatBroadcastRequest(BaseModel):
    ip: str
    attributions: list[dict] = []


class ThreatBroadcastResponse(BaseModel):
    status: str
    target_ip: str


class CollectiveBusResponse(BaseModel):
    rule_id: str
    origin_node: str
    fanout_latency_ms: float


class MitreHitResponse(BaseModel):
    technique_id: str
    name: str
    count: int


class ScadaResponse(BaseModel):
    modbus_violations: int
    dnp3_violations: int
    overrides_blocked: int


class IdentityBotResponse(BaseModel):
    impossible_velocity_hits: int
    bot_kinematic_blocks: int


class GlobalFeedIndicator(BaseModel):
    indicator: str
    type: str = "ipv4"
    severity: str = "high"
    mitre_id: str | None = None
    description: str | None = None


class GlobalFeedResponse(BaseModel):
    indicators: list[GlobalFeedIndicator]
    count: int
    updated_at: datetime


class GlobalFeedItem(BaseModel):
    """Exact sentinel-nexus polling shape: [{"ip": "..."}]."""

    ip: str


class GlobalFeedVerboseItem(BaseModel):
    """Rich collective-defense feed row (Service 7, ?verbose=true)."""

    indicator_id: str
    ip: str
    subnet_mask: int = 32
    threat_type: str
    mitre_id: str | None = None
    confidence: float = 0.0
    first_seen_timestamp: int
    expires_at_timestamp: int
    origin_anonymized_sector: str
    total_appliances_blocked: int


class ScadaSummary(BaseModel):
    modbus_violations_total: int = 0
    iec104_trips_blocked: int = 0
    s7comm_writes_blocked: int = 0
    dnp3_anomalies_total: int = 0


class ScadaEventItem(BaseModel):
    timestamp: int
    appliance_id: str
    site: str
    protocol: str
    plc_ip: str | None = None
    attacker_ip: str
    function_code: str
    register_address: int | None = None
    mitre_id: str | None = None
    action: str
    mitigation_time_us: float


class ScadaMonitorResponse(BaseModel):
    summary: ScadaSummary
    recent_events: list[ScadaEventItem] = []


class RansomwareHashResponse(BaseModel):
    sha256: str
    process_name: str
    detected_entropy: float
    nominal_baseline: float
    burst_iops: int
    reported_by_site: str
    first_detected: int
    status: str


class XAIAttributionVector(BaseModel):
    rank: int
    feature: str
    contribution_pct: float
    observed: str
    baseline: str
    audit_note: str


class XAIIncidentResponse(BaseModel):
    attacker_ip: str
    mitre_id: str | None = None
    attributions: list[XAIAttributionVector] = []
