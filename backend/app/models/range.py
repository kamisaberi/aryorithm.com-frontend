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
