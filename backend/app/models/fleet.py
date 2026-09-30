"""Fleet, Enclave, Provisioning, and Kernel Rule models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.database import Base
import enum


class NodeStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    DEGRADED = "DEGRADED"
    MAINTENANCE = "MAINTENANCE"


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    site: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[NodeStatus] = mapped_column(SQLEnum(NodeStatus), default=NodeStatus.OFFLINE)
    cpu_pct: Mapped[float] = mapped_column(Float, default=0.0)
    latency_us: Mapped[float] = mapped_column(Float, default=0.0)
    eps: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[str] = mapped_column(String(32), default="v1.0.0")
    backend: Mapped[str] = mapped_column(String(64), default="OPENVINO")
    ring_buffer_fill_pct: Mapped[int] = mapped_column(Integer, default=0)
    kernel_drops: Mapped[int] = mapped_column(Integer, default=0)
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    enclave_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("enclaves.id"), nullable=True)


class Enclave(Base):
    __tablename__ = "enclaves"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    enclave_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    max_latency_us: Mapped[int] = mapped_column(Integer, default=1000)
    node_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ProvisioningToken(Base):
    __tablename__ = "provisioning_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    enclave_id: Mapped[str] = mapped_column(String(36), ForeignKey("enclaves.id"), nullable=False)
    valid_days: Mapped[int] = mapped_column(Integer, default=7)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class KernelRule(Base):
    __tablename__ = "kernel_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    ip: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
