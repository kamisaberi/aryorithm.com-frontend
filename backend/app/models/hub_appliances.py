"""Official air-gapped appliance (``.aryopack``) releases.

Only the Aryorithm Authority (``super_admin``) may publish these bundles.
The three indexed selector columns (architecture / industry / license tier)
drive the public 3-axis Matrix Selector.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HubApplianceRelease(Base):
    """One pre-built official ``.aryopack`` release."""

    __tablename__ = "hub_appliance_releases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    # 3-axis Matrix Selector keys.
    architecture: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    industry: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    license_tier: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    # Artifact + verification.
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    authority_signature: Mapped[str] = mapped_column(String(256), nullable=False)
    verified_health_checks: Mapped[str] = mapped_column(String(16), nullable=False, default="21/21")

    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    # Audit trail (not exposed by the public API).
    published_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
