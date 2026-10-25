"""Unified hub asset metadata (signatures / ownership / readme / manifest).

The five public catalogs (``sentinel_packages``, ``ai_models``,
``hub_pcaps``, ``hub_datasets``, ``hub_scenarios``) predate the unified
``/hub/assets/{asset_type}/{slug}`` API.  This side table keeps the fields
that do not exist on those legacy rows — Ed25519 signature, enrolled author
key, owner, manifest JSON and rendered readme — without altering any
existing table or route.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HubAssetMeta(Base):
    """Per-asset publication metadata shared by all five asset types."""

    __tablename__ = "hub_asset_meta"
    __table_args__ = (UniqueConstraint("asset_type", "slug", name="uq_hub_asset_meta"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    signature: Mapped[str] = mapped_column(Text, nullable=False, default="")
    public_key: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    file_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    tier: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    author: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    industry: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    compliance: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    manifest: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    readme_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    owner_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    yanked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
