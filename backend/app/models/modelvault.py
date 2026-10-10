"""Cloud Model Vault models (AI model registry).

SQLite adaptation of the vault DDL: PostgreSQL ENUMs become ``str, Enum``
columns (repo convention, as in ``app/models/ai.py``), ``gen_random_uuid()``
becomes Python-side ``uuid4`` defaults, ``NUMERIC`` becomes ``Float``, and
``TIMESTAMP WITH TIME ZONE`` becomes ``DateTime(timezone=True)``.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ModelTier(str, enum.Enum):
    FOUNDATION = "FOUNDATION"
    COMMUNITY = "COMMUNITY"
    ENTERPRISE_CUSTOM = "ENTERPRISE_CUSTOM"


class ModelFormat(str, enum.Enum):
    ONNX = "ONNX"
    SAFETENSORS = "SAFETENSORS"
    OPENVINO_IR = "OPENVINO_IR"
    TENSORRT_ENGINE = "TENSORRT_ENGINE"
    RKNN = "RKNN"
    HAILO_HEF = "HAILO_HEF"


class ModelPrecision(str, enum.Enum):
    INT8 = "INT8"
    FP16 = "FP16"
    FP32 = "FP32"
    DYNAMIC = "DYNAMIC"


class RolloutStage(str, enum.Enum):
    DEVELOPMENT = "DEVELOPMENT"
    SHADOW_MODE = "SHADOW_MODE"
    CANARY_5_PERCENT = "CANARY_5_PERCENT"
    FLEET_PRODUCTION = "FLEET_PRODUCTION"
    DEPRECATED = "DEPRECATED"


class AIModel(Base):
    """Logical model family (e.g. aryo-netflow-mae-v2)."""

    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    tier: Mapped[ModelTier] = mapped_column(SQLEnum(ModelTier), nullable=False, default=ModelTier.FOUNDATION)
    domain: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    architecture: Mapped[str] = mapped_column(String(128), nullable=False)
    author: Mapped[str] = mapped_column(String(128), nullable=False, default="Aryorithm AI Research Lab")
    short_description: Mapped[str] = mapped_column(Text, nullable=False)
    technical_description: Mapped[str] = mapped_column(Text, nullable=False)
    input_tensor_shape: Mapped[str] = mapped_column(String(64), nullable=False)
    output_tensor_shape: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    versions: Mapped[list["AIModelVersion"]] = relationship(
        "AIModelVersion", back_populates="model", cascade="all, delete-orphan"
    )


class AIModelVersion(Base):
    """One trained checkpoint of a model family."""

    __tablename__ = "ai_model_versions"
    __table_args__ = (UniqueConstraint("model_id", "version", name="uq_model_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id: Mapped[str] = mapped_column(String(128), ForeignKey("ai_models.id"), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    rollout_stage: Mapped[RolloutStage] = mapped_column(
        SQLEnum(RolloutStage), nullable=False, default=RolloutStage.DEVELOPMENT, index=True
    )
    golden_safety_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    golden_recall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    base_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    p99_latency_ns: Mapped[int] = mapped_column(Integer, nullable=False)
    training_dataset_summary: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    release_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    last_gate_run_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tested_attacks_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    false_positive_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    model: Mapped["AIModel"] = relationship("AIModel", back_populates="versions")
    artifacts: Mapped[list["AIModelArtifact"]] = relationship(
        "AIModelArtifact", back_populates="version_row", cascade="all, delete-orphan"
    )


class AIModelArtifact(Base):
    """One physical compiled file (format × precision × hardware)."""

    __tablename__ = "ai_model_artifacts"
    __table_args__ = (
        UniqueConstraint("version_id", "format", "precision", "target_hardware", name="uq_version_format_hw"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    version_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_model_versions.id"), nullable=False, index=True)
    format: Mapped[ModelFormat] = mapped_column(SQLEnum(ModelFormat), nullable=False, index=True)
    precision: Mapped[ModelPrecision] = mapped_column(SQLEnum(ModelPrecision), nullable=False)
    file_name: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    # Vault-relative storage key, mirroring the S3 URI scheme:
    # ``models/{slug}/{version}/{format_dir}/{file}``.
    s3_storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    sha256_checksum: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    signature_ed25519: Mapped[str] = mapped_column(String(128), nullable=False)
    target_hardware: Mapped[str] = mapped_column(String(128), nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    version_row: Mapped["AIModelVersion"] = relationship("AIModelVersion", back_populates="artifacts")
