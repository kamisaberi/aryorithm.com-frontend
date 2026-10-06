"""Per-tenant offline license records (community + commercial).

Each row owns one signed Ed25519 envelope that a Sentinel appliance can
verify offline with the master *public* key and enforce locally
(authorized modules / plugins, node quota, expiry). The full envelope is
stored in ``envelope`` so the portal can re-download the .lic file any time.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Human-readable id printed inside the envelope, e.g. LIC-1738000000-EUR
    license_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    # Canonical plan slug: community | enterprise | critical | sovereign
    plan_slug: Mapped[str] = mapped_column(String(32), nullable=False, default="community", index=True)
    # Denormalized for cheap filtering: free (community) | commercial (all paid)
    license_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="free", index=True)

    hardware_token: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    locked_hardware_uuid: Mapped[str] = mapped_column(String(255), nullable=False, default="", index=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False, default="sentinel-node")
    max_nodes: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    days_valid: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Epoch seconds; expires_at == 0 means never expires (community).
    issued_at: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)

    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    authorized_modules: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    authorized_plugins: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    signature_algorithm: Mapped[str] = mapped_column(String(16), nullable=False, default="ED25519")
    signature: Mapped[str] = mapped_column(Text, nullable=False, default="")
    envelope: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
