"""Aryorithm Hub (feature store / plugin registry) models.

Catalog + versions are **global** (not per-tenant): every appliance and
dashboard reads the same index. Stars and API tokens are per-user.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HubAuthor(Base):
    __tablename__ = "hub_authors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Linked on first JWT-authenticated publish; ApiKey publishes resolve
    # through the token's owner instead.
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    github_handle: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    website: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    # Enrolled Ed25519 verify key (hex with optional 0x prefix, or base64).
    public_key: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    plugins: Mapped[list["HubPlugin"]] = relationship("HubPlugin", back_populates="author")


class HubPlugin(Base):
    __tablename__ = "hub_plugins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Public short id shown in the catalog, e.g. pkg-8f1c2a04.
    public_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    short_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    long_description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    category: Mapped[str] = mapped_column(String(64), nullable=False, default="industrial-ot", index=True)
    runtime: Mapped[str] = mapped_column(String(32), nullable=False, default="NATIVE_CPP20", index=True)
    supported_silicon: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    verification_tier: Mapped[str] = mapped_column(String(32), nullable=False, default="COMMUNITY_VERIFIED", index=True)

    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("hub_authors.id"), nullable=False, index=True)
    author: Mapped["HubAuthor"] = relationship("HubAuthor", back_populates="plugins")

    install_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stars_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fast_path_latency_us: Mapped[float | None] = mapped_column(Float, nullable=True)
    silicon_counts: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    ports: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    mitre_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    repository_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")

    # Lower-cased title + description + tags + MITRE ids; SQLite LIKE search.
    # (Upgrade path: Postgres tsvector / Meilisearch — see hub_service.)
    search_text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    versions: Mapped[list["HubPluginVersion"]] = relationship(
        "HubPluginVersion", back_populates="plugin", cascade="all, delete-orphan"
    )


class HubPluginVersion(Base):
    __tablename__ = "hub_plugin_versions"
    __table_args__ = (UniqueConstraint("plugin_id", "version", name="uq_hub_plugin_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plugin_id: Mapped[str] = mapped_column(String(36), ForeignKey("hub_plugins.id"), nullable=False, index=True)
    plugin: Mapped["HubPlugin"] = relationship("HubPlugin", back_populates="versions")

    version: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    changelog: Mapped[str] = mapped_column(Text, nullable=False, default="")
    release_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Yanked versions stay downloadable for historical builds but are
    # excluded from "latest" resolution and fresh-install flows.
    yanked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    yank_reason: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    advisory_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    security_update: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    sha256: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    signature: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    package_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_sentinel_version: Mapped[str] = mapped_column(String(32), nullable=False, default=">= 2.0.0")
    manifest_yaml: Mapped[str] = mapped_column(Text, nullable=False, default="")
    readme_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    security_envelope: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    dependencies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    artifact_path: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class HubStar(Base):
    __tablename__ = "hub_stars"
    __table_args__ = (UniqueConstraint("plugin_id", "user_id", name="uq_hub_star"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plugin_id: Mapped[str] = mapped_column(String(36), ForeignKey("hub_plugins.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class HubApiToken(Base):
    """Persistent CLI publish tokens (`Authorization: ApiKey <key>`).

    Only the sha256 hash is stored — the full key is shown once at creation.
    """

    __tablename__ = "hub_api_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    token_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    key_prefix: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    scopes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_used: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SentinelPackage(Base):
    """Verified sentinel extension package (`.spkg`) — the official catalog.

    One row per package (version embedded, unlike the versioned plugin
    registry). Seeded with the 8 verified starter packages; see
    ``app/services/sentinel_packages.py``. Field-for-field with the
    ``SentinelPackageRecord`` interface in ``HUB_PACKAGES.md``.
    """

    __tablename__ = "sentinel_packages"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    tier: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # native | wasm | lua
    tier_display: Mapped[str] = mapped_column(String(64), nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    author: Mapped[str] = mapped_column(String(128), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sector: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    target_protocol: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    default_port: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latency_sla_ns: Mapped[int] = mapped_column(Integer, nullable=False)
    latency_display: Mapped[str] = mapped_column(String(32), nullable=False)
    mitigation_action: Mapped[str] = mapped_column(String(32), nullable=False, default="KERNEL_DROP")
    compliance_tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    short_description: Mapped[str] = mapped_column(Text, nullable=False)
    technical_details: Mapped[str] = mapped_column(Text, nullable=False)
    package_file_name: Mapped[str] = mapped_column(String(128), nullable=False)
    package_file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    signature_algorithm: Mapped[str] = mapped_column(String(32), nullable=False, default="Ed25519")
    install_command: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
