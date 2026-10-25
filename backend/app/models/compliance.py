"""Compliance, GRC, and Audit Vault models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class ComplianceFramework(str, enum.Enum):
    NIS2 = "NIS2"
    DORA = "DORA"
    IEC62443 = "IEC62443"
    CMMC = "CMMC"


class ComplianceRecord(Base):
    __tablename__ = "compliance_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    framework: Mapped[ComplianceFramework] = mapped_column(SQLEnum(ComplianceFramework), nullable=False, index=True)
    compliant: Mapped[bool] = mapped_column(Boolean, default=True)
    score_pct: Mapped[float] = mapped_column(Float, default=100.0)
    status: Mapped[str] = mapped_column(String(32), default="COMPLIANT")
    findings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class AttestationLog(Base):
    __tablename__ = "attestation_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    pcr0_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class SbomAttestation(Base):
    """Hardware-anchored live-SBOM submission from a Sentinel appliance."""

    __tablename__ = "sbom_attestations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attestation_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    node_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    sbom_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    pcr10_hash: Mapped[str] = mapped_column(String(128), default="")
    tpm_quote: Mapped[str] = mapped_column(Text, default="")
    signature: Mapped[str] = mapped_column(Text, default="")
    public_key: Mapped[str] = mapped_column(String(128), default="")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    drift_events_found: Mapped[int] = mapped_column(Integer, default=0)
    live_sbom: Mapped[dict] = mapped_column(JSON, default=dict)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class SbomDriftEvent(Base):
    """In-kernel W^X / mprotect violation blocked by the edge eBPF engine."""

    __tablename__ = "sbom_drift_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(96), unique=True, nullable=False, index=True)
    node_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    attestation_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), default="MPROTECT_PROT_EXEC_BLOCKED", index=True)
    severity: Mapped[str] = mapped_column(String(16), default="CRITICAL", index=True)
    process_name: Mapped[str] = mapped_column(String(255), default="")
    pid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    action: Mapped[str] = mapped_column(String(64), default="SIGKILL")
    mitre_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(32), default="SBOM_ATTESTATION", index=True)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class InsuranceProof(Base):
    __tablename__ = "insurance_proofs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    certified_sla_us: Mapped[float] = mapped_column(Float, default=0.0)
    hardware_root: Mapped[str] = mapped_column(String(64), default="TPM 2.0")
    insurance_discount_score: Mapped[str] = mapped_column(String(16), default="TIER_A")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
