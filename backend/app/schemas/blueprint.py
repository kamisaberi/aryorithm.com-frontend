"""Visual Threat Blueprint Editor schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Canvas graph
# ---------------------------------------------------------------------------
class BlueprintNode(BaseModel):
    """A single palette node placed on the canvas."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=128)
    type: str = Field(min_length=1, max_length=64)
    label: str = Field(default="", max_length=255)
    position: dict[str, float] = Field(default_factory=dict)
    config: dict[str, Any] = Field(default_factory=dict)


class BlueprintEdge(BaseModel):
    """A directed wire between an output socket and an input socket."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=128)
    source_node: str = Field(min_length=1, max_length=128)
    source_port: str = Field(min_length=1, max_length=64)
    target_node: str = Field(min_length=1, max_length=128)
    target_port: str = Field(min_length=1, max_length=64)


class BlueprintWrite(BaseModel):
    """Payload for ``POST /api/v1/blueprints`` (create or update draft).

    ``blueprint_id`` omitted -> a new id is generated. Supplying the id of
    a blueprint already owned by the tenant updates that draft.
    """

    model_config = ConfigDict(extra="ignore")

    blueprint_id: str | None = Field(default=None, min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=4000)
    target_sites: list[str] = Field(default_factory=list)
    nodes: list[BlueprintNode] = Field(default_factory=list)
    edges: list[BlueprintEdge] = Field(default_factory=list)


class BlueprintSummary(BaseModel):
    """Lightweight metadata for the blueprint library list."""

    blueprint_id: str
    name: str
    description: str = ""
    target_sites: list[str] = Field(default_factory=list)
    status: str
    node_count: int = 0
    edge_count: int = 0
    last_deployed_at: datetime | None = None
    compiled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # Linked Hub production-blueprint artifact and its current visibility.
    compiled_artifact: dict | None = None
    visibility: str = "private"


class BlueprintDetail(BlueprintSummary):
    """Full node-and-edge graph consumed by the canvas."""

    nodes: list[BlueprintNode] = Field(default_factory=list)
    edges: list[BlueprintEdge] = Field(default_factory=list)
    compiled_yaml: str | None = None


# ---------------------------------------------------------------------------
# Node catalog
# ---------------------------------------------------------------------------
class CatalogSocket(BaseModel):
    name: str
    socket_type: str
    color: str
    required: bool = True
    accepts: list[str] = Field(default_factory=list)


class CatalogNode(BaseModel):
    catalog_id: str
    type: str
    stage: int
    category: str
    label: str
    description: str = ""
    default_config: dict[str, Any] = Field(default_factory=dict)
    inputs: list[CatalogSocket] = Field(default_factory=list)
    outputs: list[CatalogSocket] = Field(default_factory=list)
    latency_sla_ns: int | None = None


class CatalogStage(BaseModel):
    stage: int
    name: str
    color: str
    nodes: list[CatalogNode] = Field(default_factory=list)


class NodeCatalogResponse(BaseModel):
    version: str = "1.0"
    socket_types: dict[str, dict[str, str]] = Field(default_factory=dict)
    stages: list[CatalogStage] = Field(default_factory=list)
    nodes: list[CatalogNode] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Compile / deploy
# ---------------------------------------------------------------------------
class CompileResponse(BaseModel):
    blueprint_id: str
    status: str
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    node_count: int = 0
    edge_count: int = 0
    estimated_latency_ns: int = 0
    compiled_yaml: str | None = None
    compiled_at: datetime | None = None


class DeployResponse(BaseModel):
    status: str
    blueprint_id: str
    deployed_at: datetime
    target_sites: list[str] = Field(default_factory=list)
    nodes_targeted: int = 0
    broadcast_latency_ms: float = 0.0
    grpc_status: str = "BROADCAST_OK"
    fleet_health: str = "9/9"
    config_sha256: str = ""


class DeleteBlueprintResponse(BaseModel):
    status: str = "DELETED"
    blueprint_id: str
