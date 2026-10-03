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


class InsuranceProof(Base):
    __tablename__ = "insurance_proofs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    certified_sla_us: Mapped[float] = mapped_column(Float, default=0.0)
    hardware_root: Mapped[str] = mapped_column(String(64), default="TPM 2.0")
    insurance_discount_score: Mapped[str] = mapped_column(String(16), default="TIER_A")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
