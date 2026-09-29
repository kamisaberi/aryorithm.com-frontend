"""Overview and XAI models."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class OverviewMetric(Base):
    __tablename__ = "overview_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    online_nodes: Mapped[int] = mapped_column(Integer, default=0)
    total_drops: Mapped[int] = mapped_column(Integer, default=0)
    mean_sla_us: Mapped[float] = mapped_column(Float, default=0.0)
    stable_model: Mapped[str] = mapped_column(String(32), default="v1.0.0")
    window: Mapped[str] = mapped_column(String(16), default="24h")
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class XAIAttribution(Base):
    __tablename__ = "xai_attributions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    attacker_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    mitre_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    attributions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    residuals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    baseline_mean: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    audit_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class LatencyDistribution(Base):
    __tablename__ = "latency_distributions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    p50: Mapped[float] = mapped_column(Float, default=0.0)
    p90: Mapped[float] = mapped_column(Float, default=0.0)
    p95: Mapped[float] = mapped_column(Float, default=0.0)
    p99: Mapped[float] = mapped_column(Float, default=0.0)
    p999: Mapped[float] = mapped_column(Float, default=0.0)
    window: Mapped[str] = mapped_column(String(16), default="24h")
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
