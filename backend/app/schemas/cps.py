"""CPS vertical + identity schemas (Part 3)."""

from pydantic import BaseModel, ConfigDict


class MedicalScannerResponse(BaseModel):
    scanner_id: str
    name: str
    ae_title: str
    ip_address: str
    department: str
    connected_sentinel_node: str
    status: str
    unencrypted_hl7_detected: bool
    last_cstore_timestamp: int | None = None


class PACSEventResponse(BaseModel):
    event_id: str
    timestamp: int
    ae_title: str
    source_ip: str
    destination_ip: str
    anomaly_type: str
    mitre_id: str | None = None
    action_enforced: str
    mitigation_latency_us: float
    details: str


class VesselResponse(BaseModel):
    vessel_mmsi: str
    vessel_name: str
    vessel_type: str
    current_lat: float
    current_lng: float
    satellite_link_status: str
    bandwidth_saved_mb: float
    connected_sentinel_node: str
    active_threats_count: int
    spoofing_detected: bool


class ITDREventResponse(BaseModel):
    incident_id: str
    timestamp: int
    targeted_user: str
    attacker_ip: str
    attack_technique: str
    mitre_id: str | None = None
    encryption_type_requested: str
    status: str
    recommended_action: str


class RevokeSessionRequest(BaseModel):
    user_principal_name: str
    reason: str = ""


class RevokeSessionResponse(BaseModel):
    status: str
    user_principal_name: str
    revoked_at: int


class KinematicVector(BaseModel):
    model_config = ConfigDict(extra="ignore")

    x: float
    y: float
    dt_ms: float


class BotEvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    kinematic_vectors: list[KinematicVector] = []
    keystroke_jitter_ms: float | None = None


class BotEvaluateResponse(BaseModel):
    session_id: str
    verdict: str
    bot_probability: float
    confidence: str
    attribution_factors: list[str] = []
    action_recommended: str


class ZTNASessionResponse(BaseModel):
    user_email: str
    current_risk_score: float
    risk_tier: str
    risk_factors: list[str] = []
    active_enclaves_accessed: list[str] = []
    automated_action: str
    timestamp: int
