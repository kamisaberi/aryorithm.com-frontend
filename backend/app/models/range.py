"""Cyber-Range and Digital Twin Simulation models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class TwinStatus(str, enum.Enum):
    IDLE = "IDLE"
    PROVISIONED = "PROVISIONED"
    RUNNING = "RUNNING"
    TERMINATED = "TERMINATED"


class DigitalTwin(Base):
    __tablename__ = "digital_twins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    twin_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    nodes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[TwinStatus] = mapped_column(SQLEnum(TwinStatus), default=TwinStatus.IDLE)
    sandbox_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class AttackReplay(Base):
    __tablename__ = "attack_replays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    malware: Mapped[str] = mapped_column(String(128), nullable=False)
    target_node: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="STREAMING")
    frames_injected: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ResilienceScore(Base):
    __tablename__ = "resilience_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mttfi_ms: Mapped[float] = mapped_column(Float, default=0.0)
    rollback_guard_ms: Mapped[float] = mapped_column(Float, default=0.0)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class RangeInstance(Base):
    """Cloud twin sandbox instance (Service 24)."""

    __tablename__ = "range_instances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    instance_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    blueprint_id: Mapped[str] = mapped_column(String(64), nullable=False)
    enclave_name: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(32), default="INITIALIZING")
    polls: Mapped[int] = mapped_column(Integer, default=0)
    assigned_ip: Mapped[str] = mapped_column(String(64), default="")
    traffic_profile: Mapped[str] = mapped_column(String(128), default="")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ResilienceEvaluation(Base):
    """Resilience benchmark snapshot (Service 26)."""

    __tablename__ = "resilience_evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    score: Mapped[float] = mapped_column(Float, default=0.0)
    mttfi_ms: Mapped[float] = mapped_column(Float, default=0.0)
    latency_us: Mapped[float] = mapped_column(Float, default=0.0)
    rollback_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class MDRIncident(Base):
    """Co-managed SOC triage case (Service 27)."""

    __tablename__ = "mdr_incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM")
    target_site: Mapped[str] = mapped_column(String(255), default="")
    protocol: Mapped[str] = mapped_column(String(32), default="")
    threat_summary: Mapped[str] = mapped_column(Text, default="")
    assigned_analyst: Mapped[str] = mapped_column(String(255), default="")
    analyst_verdict: Mapped[str] = mapped_column(String(64), default="UNDER_INVESTIGATION")
    status: Mapped[str] = mapped_column(String(32), default="OPEN")
    contained_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class MDRMessage(Base):
    __tablename__ = "mdr_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(64), ForeignKey("mdr_incidents.incident_id"), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role: Mapped[str] = mapped_column(String(64), default="customer")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class EmergencyDispatch(Base):
    """Emergency SLA dispatch record (Service 28)."""

    __tablename__ = "emergency_dispatches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dispatch_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    affected_enclave: Mapped[str] = mapped_column(String(255), nullable=False)
    urgency: Mapped[str] = mapped_column(String(64), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    responders: Mapped[list | None] = mapped_column(JSON, nullable=True)
    response_time_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
