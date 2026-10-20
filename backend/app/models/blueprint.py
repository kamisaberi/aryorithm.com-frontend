"""Visual Threat Blueprint Editor models."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BlueprintStatus(str, enum.Enum):
    """Lifecycle of a visual threat blueprint."""

    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"
    DEPLOYED = "DEPLOYED"


class ThreatBlueprint(Base):
    """Saved node-and-edge graph for the Visual Threat Blueprint Editor.

    ``nodes`` / ``edges`` hold the exact canvas JSON consumed by
    ``app.aryorithm.com``. ``compiled_yaml`` is populated by the compile
    endpoint and broadcast by the deploy endpoint.
    """

    __tablename__ = "threat_blueprints"
    __table_args__ = (
        UniqueConstraint("tenant_id", "blueprint_id", name="uq_blueprint_tenant_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    blueprint_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    target_sites: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[BlueprintStatus] = mapped_column(
        SQLEnum(BlueprintStatus), default=BlueprintStatus.DRAFT, nullable=False
    )

    # Canvas graph (arrays of node / edge objects).
    nodes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    edges: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Compiled model_routes.yaml + deploy bookkeeping.
    compiled_yaml: Mapped[str | None] = mapped_column(Text, nullable=True)
    compiled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_deployed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id"), nullable=False
    )
