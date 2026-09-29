"""Compliance and GRC schemas."""

from pydantic import BaseModel
from datetime import datetime


class NIS2Response(BaseModel):
    framework: str
    compliant: bool
    incident_sla_verified: bool


class IEC62443Response(BaseModel):
    standard: str
    system_integrity: str
    zones_verified: int


class CMMCResponse(BaseModel):
    findings: list[dict]


class ComplianceExportRequest(BaseModel):
    framework: str
    format: str = "PDF"


class AttestationLogResponse(BaseModel):
    timestamp: datetime
    pcr0_hash: str
    verified: bool


class InsuranceProofResponse(BaseModel):
    certified_sla_us: float
    hardware_root: str
    insurance_discount_score: str
