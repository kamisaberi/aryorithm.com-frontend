"""Cyber-range and digital twin schemas."""

from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DigitalTwinResponse(BaseModel):
    twin_id: str
    nodes: int
    status: str


class DigitalTwinCreate(BaseModel):
    name: str
    node_profiles: list[dict] = []


class DigitalTwinCreateResponse(BaseModel):
    twin_id: str
    status: str


class TwinActionResponse(BaseModel):
    status: str
    sandbox_ip: str | None = None


class AttackReplayRequest(BaseModel):
    malware: str
    target: str


class AttackReplayResponse(BaseModel):
    status: str
    frames_injected: int


class ResilienceScoreResponse(BaseModel):
    mttfi_ms: float
    rollback_guard_ms: float
    score: float


class TwinBlueprint(BaseModel):
    blueprint_id: str
    name: str
    description: str
    protocols: list[str] = []


class TwinNode(BaseModel):
    id: str
    ip: str
    role: str


class RangeInstanceResponse(BaseModel):
    instance_id: str
    status: str
    blueprint_id: str
    enclave_name: str
    assigned_sandbox_ip: str
    web_console_url: str
    expires_at_timestamp: int
    allocated_nodes: list[TwinNode] = []


class ProvisionTwinRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    blueprint_id: str
    enclave_name: str = ""
    duration_hours: float = 2.0
    traffic_profile: str = "OMNIFLOW_SCADA_DEFAULT"


class ResilienceMetrics(BaseModel):
    mean_time_to_fleet_immunity_ms: float
    mttfi_target_sla_ms: float
    p50_kernel_mitigation_latency_us: float
    p99_kernel_mitigation_latency_us: float
    auto_rollback_latency_ms: float
    simulated_attack_containment_rate_pct: float


class ResilienceBenchResponse(BaseModel):
    resilience_score: float
    rating_tier: str
    metrics: ResilienceMetrics
    tested_malware_profiles: list[str] = []
    last_evaluation_timestamp: int
    # Legacy keys kept for the existing resilience page.
    mttfi_ms: float = 0.0
    rollback_guard_ms: float = 0.0
    score: float = 0.0
