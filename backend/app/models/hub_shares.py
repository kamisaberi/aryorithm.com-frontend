"""Granular artifact sharing and expiring share links.

Shares are attached to the canonical ``(asset_type, slug)`` key used by
:class:`app.models.hub_assets.HubAssetMeta`.  A share can target a user, a
tenant, or an email address (useful before the recipient has an account).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HubAssetShare(Base):
    """Direct grant of a permission on one artifact to a user/tenant/email."""

    __tablename__ = "hub_asset_shares"
    __table_args__ = (
        UniqueConstraint(
            "asset_type",
            "slug",
            "grantee_type",
            "grantee_id",
            "grantee_email",
            "permission",
            name="uq_hub_asset_share",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    grantee_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    grantee_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    grantee_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    permission: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class HubShareLink(Base):
    """Signed, time-bounded share link for a single artifact."""

    __tablename__ = "hub_share_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    token_prefix: Mapped[str] = mapped_column(String(24), nullable=False, default="")
    permission: Mapped[str] = mapped_column(String(16), nullable=False, default="VIEW")
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    use_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
