"""AI Model Lifecycle and Silicon Acceleration models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class ModelStage(str, enum.Enum):
    STORED = "STORED"
    SHADOW_MODE = "SHADOW_MODE"
    CANARY_5_PCT = "CANARY_5_PCT"
    CANARY_12_PCT = "CANARY_12_PCT"
    FLEET_WIDE = "FLEET_WIDE"
    ROLLED_BACK = "ROLLED_BACK"
    DISABLED = "DISABLED"


# Strict spec enum for GET /api/v1/models (Threat Models Endpoint brief).
class ThreatModelStage(str, enum.Enum):
    FLEET_WIDE = "FLEET_WIDE"
    CANARY_5_PCT = "CANARY_5_PCT"
    SHADOW_MODE = "SHADOW_MODE"
    DISABLED = "DISABLED"


class Model(Base):
    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Unique artifact filename, e.g. "network_threat_v1.onnx" (spec field).
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    version: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    sha256: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    stage: Mapped[ModelStage] = mapped_column(SQLEnum(ModelStage), default=ModelStage.STORED)
    download_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class OTARollout(Base):
    __tablename__ = "ota_rollouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stable_version: Mapped[str] = mapped_column(String(32), nullable=False)
    candidate_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    stage: Mapped[ModelStage] = mapped_column(SQLEnum(ModelStage), default=ModelStage.FLEET_WIDE)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class ForgeDataset(Base):
    __tablename__ = "forge_datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    samples: Mapped[int] = mapped_column(Integer, default=0)
    high_uncertainty: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class CompileTask(Base):
    __tablename__ = "compile_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    model_id: Mapped[str] = mapped_column(String(32), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), default="")
    target: Mapped[str] = mapped_column(String(64), nullable=False)
    precision: Mapped[str] = mapped_column(String(16), default="FP16")
    status: Mapped[str] = mapped_column(String(32), default="COMPILING")
    polls: Mapped[int] = mapped_column(Integer, default=0)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    download_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class TrismResult(Base):
    __tablename__ = "trism_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    safe: Mapped[bool] = mapped_column(Boolean, default=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    sanitized_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class TrismAuditLog(Base):
    """Every TRiSM gateway evaluation (Service 6 audit trail)."""

    __tablename__ = "trism_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    threat_category: Mapped[str] = mapped_column(String(64), default="BENIGN")
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=True)
