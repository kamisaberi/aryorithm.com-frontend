"""Cloud Forge jobs (``/api/v1/forge``).

Training is queued as a durable database row.  The background GPU worker is
deployment-specific; the API contract (queued -> training -> completed) is
implemented here, including deterministic Golden Gate / INT8 metrics and a
downloadable artifact once a job completes.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ForgeJob(Base):
    __tablename__ = "forge_jobs"

    job_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued", index=True)
    base_model: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    base_model_slug: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    dataset_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    dataset_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    dataset_samples: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    epochs: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    learning_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0001)

    target_hardware: Mapped[str] = mapped_column(
        String(64), nullable=False, default="NVIDIA_TENSORRT_CUDA_H100"
    )
    estimated_completion_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=12)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    training_duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall_retention_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    degradation: Mapped[float | None] = mapped_column(Float, nullable=True)
    gate_passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    quant_format: Mapped[str] = mapped_column(String(64), nullable=False, default="INT8_QDQ_ONNX")
    latency_ns: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    model_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    artifact_path: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    error: Mapped[str] = mapped_column(Text, nullable=False, default="")
