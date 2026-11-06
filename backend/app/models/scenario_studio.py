"""Scenario Graph Studio ORM models.

The studio stores the visual graph as normalized tenant-owned rows:

* ``scenario_studio_graphs`` — graph metadata, compile/bundle/launch state
* ``scenario_studio_subnets`` — CIDR segments and air-gap policy
* ``scenario_studio_nodes`` — PLCs, sensors, actors and their IP bindings
* ``scenario_studio_links`` — Ethernet / telemetry / attack vectors

Rows are deliberately separate from ``matrix_scenarios`` (the earlier flat
scenario editor) and from the physical ``threat_blueprints`` DAG so existing
routes and tables are never changed by this feature.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ScenarioStudioStatus(str, enum.Enum):
    """Lifecycle of a saved scenario graph."""

    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"
    BUNDLED = "BUNDLED"
    LAUNCHED = "LAUNCHED"


class ScenarioGraph(Base):
    """A tenant-owned visual cyber-range scenario graph."""

    __tablename__ = "scenario_studio_graphs"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "scenario_id",
            name="uq_scenario_studio_graph_tenant",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    scenario_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_sector: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[ScenarioStudioStatus] = mapped_column(
        SQLEnum(ScenarioStudioStatus),
        nullable=False,
        default=ScenarioStudioStatus.DRAFT,
    )

    compiled_yaml: Mapped[str | None] = mapped_column(Text, nullable=True)
    compiled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    bundle_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bundle_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bundle_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bundle_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bundled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Global Hub slug.  The first tenant keeps the bare scenario id; a second
    # tenant with the same local id gets a tenant-prefixed slug.
    hub_slug: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )

    last_launch_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_launch_agent_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    last_launch_status: Mapped[str | None] = mapped_column(
        String(32), nullable=True
    )
    last_launch_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_launched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id"), nullable=False, index=True
    )


class ScenarioSubnet(Base):
    """One bridge or air-gapped L2 segment in the visual graph."""

    __tablename__ = "scenario_studio_subnets"
    __table_args__ = (
        UniqueConstraint(
            "graph_pk", "subnet_key", name="uq_scenario_studio_subnet_key"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    graph_pk: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenario_studio_graphs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subnet_key: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cidr: Mapped[str] = mapped_column(String(64), nullable=False)
    gateway: Mapped[str] = mapped_column(String(64), nullable=False)
    internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    purdue_level: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ScenarioNode(Base):
    """One visual container: PLC, IED, sensor or simulation actor."""

    __tablename__ = "scenario_studio_nodes"
    __table_args__ = (
        UniqueConstraint(
            "graph_pk", "node_key", name="uq_scenario_studio_node_key"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    graph_pk: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenario_studio_graphs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    node_key: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    node_type: Mapped[str] = mapped_column(String(64), nullable=False)
    subnet_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    image: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    protocols: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ports: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ScenarioLink(Base):
    """One directed edge between two scenario nodes."""

    __tablename__ = "scenario_studio_links"
    __table_args__ = (
        UniqueConstraint(
            "graph_pk", "link_key", name="uq_scenario_studio_link_key"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    graph_pk: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenario_studio_graphs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    link_key: Mapped[str] = mapped_column(String(64), nullable=False)
    source_node_key: Mapped[str] = mapped_column(String(64), nullable=False)
    target_node_key: Mapped[str] = mapped_column(String(64), nullable=False)
    link_kind: Mapped[str] = mapped_column(
        String(32), nullable=False, default="ETHERNET"
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    protocol: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
