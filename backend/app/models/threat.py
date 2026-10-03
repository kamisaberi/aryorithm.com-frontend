"""Threat defense and collective intelligence models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class ThreatStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    DROPPED = "DROPPED"
    ALLOWED = "ALLOWED"


class ThreatEvent(Base):
    __tablename__ = "threat_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    threat_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    attacker_ip: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    mitre_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tactic: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[ThreatStatus] = mapped_column(SQLEnum(ThreatStatus), default=ThreatStatus.DETECTED)
    dropped: Mapped[bool] = mapped_column(Boolean, default=False)
    attributions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    node_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("nodes.id"), nullable=True)


class CollectiveBusLog(Base):
    __tablename__ = "collective_bus_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    origin_node: Mapped[str] = mapped_column(String(64), nullable=False)
    fanout_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class MitreHit(Base):
    __tablename__ = "mitre_hits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    technique_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ScadaAnomaly(Base):
    __tablename__ = "scada_anomalies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    protocol: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    violation_type: Mapped[str] = mapped_column(String(128), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0)
    overrides_blocked: Mapped[int] = mapped_column(Integer, default=0)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class IdentityBotEvent(Base):
    __tablename__ = "identity_bot_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    impossible_velocity: Mapped[bool] = mapped_column(Boolean, default=False)
    bot_kinematic_block: Mapped[bool] = mapped_column(Boolean, default=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class GlobalThreat(Base):
    """Central anonymized IOC feed (Service 7). Tenant NULL = global row."""

    __tablename__ = "global_threats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    indicator_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    ip: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    subnet_mask: Mapped[int] = mapped_column(Integer, default=32)
    threat_type: Mapped[str] = mapped_column(String(64), default="THREAT_SCADA_ANOMALY")
    mitre_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    origin_sector: Mapped[str] = mapped_column(String(64), default="ENERGY_UTILITY")
    appliances_blocked: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=True)


class ScadaEvent(Base):
    """Physical actuation log (Service 8) — only the last update per key is kept."""

    __tablename__ = "scada_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_node_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    site: Mapped[str] = mapped_column(String(255), default="")
    protocol: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    plc_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    attacker_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    function_code: Mapped[str] = mapped_column(String(64), default="")
    register_address: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mitre_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(32), default="XDP_DROP")
    mitigation_time_us: Mapped[float] = mapped_column(Float, default=0.0)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class RansomwareHash(Base):
    """High-entropy IOC clearinghouse (Service 9). Tenant NULL = global row."""

    __tablename__ = "ransomware_hashes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sha256: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    process_name: Mapped[str] = mapped_column(String(255), default="")
    detected_entropy: Mapped[float] = mapped_column(Float, default=0.0)
    nominal_baseline: Mapped[float] = mapped_column(Float, default=3.84)
    burst_iops: Mapped[int] = mapped_column(Integer, default=0)
    reported_by_site: Mapped[str] = mapped_column(String(255), default="")
    first_detected: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status: Mapped[str] = mapped_column(String(32), default="BLOCKED_FLEET_WIDE")

    tenant_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=True)
