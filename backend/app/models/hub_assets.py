"""Unified hub asset metadata (signatures / ownership / readme / manifest).

This side table is the tenancy/visibility/forking authority for all seven
Hub artifact types (package, model, dataset, pcap, scenario, blueprint and
appliance).  The source catalog tables keep their historical public/global
shape; this table adds the fields required by workspaces without forcing a
destructive migration of the existing catalogs.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HubAssetMeta(Base):
    """Per-asset publication, ownership, visibility and lineage metadata."""

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
    tenant_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("tenants.id"), nullable=True, index=True
    )

    # ``public`` is visible to everyone; ``private`` is visible to the owning
    # tenant/user and to explicit share grantees.  Legacy assets without a
    # meta row are treated as public for backwards compatibility.
    visibility: Mapped[str] = mapped_column(
        String(16), nullable=False, default="private", index=True
    )

    # Fork lineage.  ``forked_from_*`` points at the immediate parent asset.
    forked_from_type: Mapped[str | None] = mapped_column(
        String(16), nullable=True, index=True
    )
    forked_from_slug: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    fork_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # A deleted root that still has descendants is retained on disk so the
    # children remain downloadable.  It is hidden from all catalogs.
    orphaned_root: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    yanked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
