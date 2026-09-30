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
