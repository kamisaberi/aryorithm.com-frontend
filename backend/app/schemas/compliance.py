"""Compliance and GRC schemas."""

from pydantic import BaseModel, ConfigDict
from datetime import datetime


class NIS2Mandate(BaseModel):
    article: str
    title: str
    status: str
    evidence: str


class NIS2Response(BaseModel):
    framework: str
    overall_status: str
    compliance_score_pct: float
    statutory_mandates: list[NIS2Mandate] = []
    last_audit_timestamp: int


class IEC62443Response(BaseModel):
    standard: str
    system_integrity: str
    zones_verified: int


class CMMCControl(BaseModel):
    control_id: str
    title: str
    status: str
    evidence: str


class CMMCResponse(BaseModel):
    standard: str
    certified_level: str
    controls_evaluated: int
    controls_passed: int
    score_percentage: float
    key_findings: list[CMMCControl] = []


class ComplianceExportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    framework: str
    format: str = "PDF"
    include_sla_proofs: bool = True
    reporting_period_days: int = 30


class AttestationLogResponse(BaseModel):
    timestamp: datetime
    pcr0_hash: str
    verified: bool


class InsuranceTelemetry(BaseModel):
    total_protected_nodes: int
    p50_mitigation_latency_us: float
    p99_mitigation_latency_us: float
    tpm2_hardware_root_coverage_pct: float
    ransomware_lateral_containment_sla_us: float
    unmitigated_breach_window_sec: float


class InsuranceProofResponse(BaseModel):
    tenant_name: str
    certified_tier: str
    insurance_discount_eligibility: bool
    estimated_discount_range_pct: str
    actuarial_telemetry: InsuranceTelemetry
    cryptographic_verification_token: str
    issued_timestamp: int
    valid_until_timestamp: int


class GtpSliceRow(BaseModel):
    node_id: str
    site: str = ""
    status: str = "UNKNOWN"
    active_teids: int = 0
    gtp_slice_violations_dropped: int = 0
    unmapped_teids_dropped: int = 0
    total_slice_drops: int = 0
    n3_peer: str | None = None
    s_nssai: list = []
    last_updated: str | None = None


class GtpSliceSummary(BaseModel):
    reporting_nodes: int = 0
    active_teids: int = 0
    gtp_slice_violations_dropped: int = 0
    unmapped_teids_dropped: int = 0
    total_dropped: int = 0
    affected_nodes: int = 0


class FiveGTelemetryResponse(BaseModel):
    tenant_id: str
    generated_at: int
    summary: GtpSliceSummary
    active_teids: int = 0
    gtp_slice_violations_dropped: int = 0
    unmapped_teids_dropped: int = 0
    total_dropped: int = 0
    n3_gtp_u: dict = {}
    slices: list[GtpSliceRow] = []
    nodes: list[GtpSliceRow] = []


class FiveGSlicingComplianceResponse(BaseModel):
    framework: str
    standard: str
    generated_at: int
    overall_status: str
    compliance_score_pct: float
    slice_isolation_verified: bool
    nis2_article: str
    summary: GtpSliceSummary
    s_nssai: list = []
    findings: list[dict] = []
    audited_nodes: int = 0


class SbomAttestResponse(BaseModel):
    status: str = "ATTESTED"
    attestation_id: str
    node_id: str
    sbom_sha256: str
    pcr10_hash: str = ""
    tpm_quote_present: bool = False
    signature_present: bool = False
    verified: bool = False
    drift_events_ingested: int = 0
    live_sbom_url: str
    received_at: datetime


class SbomDriftEventResponse(BaseModel):
    event_id: str
    timestamp: int
    node_id: str
    attestation_id: str | None = None
    event_type: str
    severity: str
    process_name: str = ""
    pid: int | None = None
    address: str | None = None
    action: str = "SIGKILL"
    mitre_id: str | None = None
    reason: str = ""
    source: str = "SBOM_ATTESTATION"
    details: dict = {}
