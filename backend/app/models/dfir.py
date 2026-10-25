"""Digital Forensics and Incident Response models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class PCAP(Base):
    __tablename__ = "pcaps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pcap_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    sha256: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class FirmwareReport(Base):
    __tablename__ = "firmware_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), default="")
    sha256: Mapped[str] = mapped_column(String(128), default="")
    cpu_arch: Mapped[str] = mapped_column(String(64), default="UNKNOWN")
    filesystem: Mapped[str] = mapped_column(String(64), default="UNKNOWN")
    security_score: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    status: Mapped[str] = mapped_column(String(32), default="ANALYZING")
    vulnerabilities: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class MedicalScanner(Base):
    __tablename__ = "medical_scanners"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scanner_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ae_title: Mapped[str] = mapped_column(String(64), default="")
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    department: Mapped[str] = mapped_column(String(255), default="")
    node_node_id: Mapped[str] = mapped_column(String(64), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class Vessel(Base):
    __tablename__ = "vessels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vessel_mmsi: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    vessel_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vessel_type: Mapped[str] = mapped_column(String(64), default="")
    current_lat: Mapped[float] = mapped_column(Float, default=0.0)
    current_lng: Mapped[float] = mapped_column(Float, default=0.0)
    satellite_link_status: Mapped[str] = mapped_column(String(64), default="")
    bandwidth_saved_mb: Mapped[float] = mapped_column(Float, default=0.0)
    node_node_id: Mapped[str] = mapped_column(String(64), default="")
    spoofing_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ITDREvent(Base):
    __tablename__ = "itdr_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    targeted_user: Mapped[str] = mapped_column(String(255), nullable=False)
    attacker_ip: Mapped[str] = mapped_column(String(64), default="")
    attack_technique: Mapped[str] = mapped_column(String(64), default="")
    mitre_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    encryption: Mapped[str] = mapped_column(String(32), default="")
    status: Mapped[str] = mapped_column(String(32), default="BLOCKED_IN_KERNEL")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ZTNASession(Base):
    __tablename__ = "ztna_risk_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    enclaves: Mapped[list | None] = mapped_column(JSON, nullable=True)
    quarantined: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class SpaceSatellite(Base):
    """Monitored LEO/GEO downlink tracked by a Sentinel space gateway."""

    __tablename__ = "space_satellites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    satellite_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    orbit_class: Mapped[str] = mapped_column(String(16), default="LEO", index=True)
    norad_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    operator: Mapped[str] = mapped_column(String(255), default="")
    ground_station: Mapped[str] = mapped_column(String(255), default="")
    downlink_protocol: Mapped[str] = mapped_column(String(64), default="CCSDS")
    frequency_band: Mapped[str] = mapped_column(String(32), default="Ka")
    telemetry_integrity: Mapped[str] = mapped_column(String(32), default="NOMINAL")
    status: Mapped[str] = mapped_column(String(32), default="TRACKING", index=True)
    signal_strength_dbm: Mapped[float] = mapped_column(Float, default=0.0)
    packet_loss_pct: Mapped[float] = mapped_column(Float, default=0.0)
    last_downlink_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    connected_sentinel_node: Mapped[str] = mapped_column(String(128), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class SpaceTelecommandAudit(Base):
    """Rejected rogue AOCS / telecommand audit row (Idea E)."""

    __tablename__ = "space_telecommand_audits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    satellite_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ground_station: Mapped[str] = mapped_column(String(255), default="")
    command_name: Mapped[str] = mapped_column(String(255), default="")
    service_type: Mapped[str] = mapped_column(String(64), default="AOCS")
    function_code: Mapped[str] = mapped_column(String(64), default="")
    sequence_counter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_sequence_counter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_ip: Mapped[str] = mapped_column(String(64), default="")
    mitre_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    action_enforced: Mapped[str] = mapped_column(String(64), default="TELECOMMAND_BLOCKED")
    status: Mapped[str] = mapped_column(String(32), default="BLOCKED", index=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    raw: Mapped[dict] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
