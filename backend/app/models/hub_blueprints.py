"""Production site blueprints published to the Hub marketplace.

A blueprint is a signed, sandboxed DAG bundle (``.blueprint``) containing
``model_routes.yaml`` plus hardware bindings and dependency metadata.  It is
distinct from :class:`app.models.blueprint.ThreatBlueprint`, which is the
tenant-scoped visual editor graph.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HubBlueprint(Base):
    """Signed production-site blueprint in the public Hub catalog."""

    __tablename__ = "hub_blueprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    target_site: Mapped[str | None] = mapped_column(String(255), nullable=True)
    industry: Mapped[str] = mapped_column(
        String(64), nullable=False, default="CRITICAL_INFRASTRUCTURE", index=True
    )
    target_architecture: Mapped[str] = mapped_column(
        String(32), nullable=False, default="x86_64", index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Technical + SLA specs.
    primary_interface: Mapped[str] = mapped_column(String(64), nullable=False, default="ens160")
    max_pipeline_latency_us: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    dependencies_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    hardware_binding_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sla_guarantees_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    raw_dag_yaml: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Cryptographic integrity.
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    author_public_key: Mapped[str] = mapped_column(String(128), nullable=False)
    signature: Mapped[str] = mapped_column(String(256), nullable=False)

    # Internal ownership for the author-or-admin delete rule.
    owner_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )

    # Artifact location relative to ``settings.HUB_BLUEPRINTS_DIR``.
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    downloads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    verified_signature: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_yanked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
