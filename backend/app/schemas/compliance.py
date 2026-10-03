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
