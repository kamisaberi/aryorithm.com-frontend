"""Pydantic contracts for the Scenario Graph Studio API."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PurdueLevel = Literal[0, 1, 2, 3, 4]
IssueSeverity = Literal["error", "warning"]


class PaletteItem(BaseModel):
    """One draggable component in the studio palette.

    Palette entries intentionally vary by category (networks expose
    ``default_subnet`` while PLCs expose ``protocols`` and ``image``), so
    unknown keys are preserved rather than dropped.
    """

    model_config = ConfigDict(extra="allow")

    type: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=255)


class PaletteCategory(BaseModel):
    category: str
    items: list[PaletteItem] = Field(default_factory=list)


class ScenarioPalette(BaseModel):
    categories: list[PaletteCategory] = Field(default_factory=list)


class ScenarioSubnet(BaseModel):
    """A bridge or air-gapped subnet in the graph."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    cidr: str = Field(min_length=1, max_length=64)
    gateway: str = Field(default="", max_length=64)
    internal: bool = False
    purdue_level: PurdueLevel = 3


class ScenarioNode(BaseModel):
    """A visual container bound to one subnet."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=64)
    subnet_id: str | None = Field(default=None, max_length=64)
    ip: str = Field(default="", max_length=64)
    image: str = Field(default="", max_length=255)
    protocols: list[str] = Field(default_factory=list)
    ports: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)
    x: float = Field(default=0, ge=0, le=20000)
    y: float = Field(default=0, ge=0, le=20000)


class ScenarioLink(BaseModel):
    """A directed edge between two visual nodes."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=64)
    source_node_id: str = Field(min_length=1, max_length=64)
    target_node_id: str = Field(min_length=1, max_length=64)
    kind: str = Field(default="ETHERNET", max_length=32)
    label: str = Field(default="", max_length=255)
    protocol: str = Field(default="", max_length=64)
    config: dict[str, Any] = Field(default_factory=dict)


class ScenarioGraphWrite(BaseModel):
    """Payload for ``POST /api/v1/matrix-scenarios`` (create or update)."""

    model_config = ConfigDict(extra="ignore")

    scenario_id: str | None = Field(default=None, min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    target_sector: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=12000)
    subnets: list[ScenarioSubnet] = Field(default_factory=list)
    nodes: list[ScenarioNode] = Field(default_factory=list)
    links: list[ScenarioLink] = Field(default_factory=list)


class ScenarioGraphSummary(BaseModel):
    """Lightweight library card metadata."""

    scenario_id: str
    name: str
    target_sector: str
    description: str = ""
    status: str
    subnet_count: int = 0
    node_count: int = 0
    link_count: int = 0
    compiled_at: datetime | None = None
    bundled_at: datetime | None = None
    last_launched_at: datetime | None = None
    hub_slug: str | None = None
    created_at: datetime
    updated_at: datetime


class ScenarioGraphDetail(ScenarioGraphSummary):
    """Full graph, compiled artifact and launch metadata."""

    subnets: list[ScenarioSubnet] = Field(default_factory=list)
    nodes: list[ScenarioNode] = Field(default_factory=list)
    links: list[ScenarioLink] = Field(default_factory=list)
    compiled_yaml: str | None = None
    bundle_name: str | None = None
    bundle_size_bytes: int | None = None
    bundle_sha256: str | None = None
    hub_url: str | None = None
    last_launch_id: str | None = None
    last_launch_agent_id: str | None = None
    last_launch_status: str | None = None
    last_launch_message: str | None = None


class ScenarioGraphSaveResult(BaseModel):
    scenario_id: str
    status: str
    subnet_count: int
    node_count: int
    link_count: int
    created_at: datetime
    updated_at: datetime


class ScenarioCompileIssue(BaseModel):
    severity: IssueSeverity = "error"
    code: str
    message: str
    subnet_id: str | None = None
    node_id: str | None = None
    link_id: str | None = None


class ScenarioCompileResult(BaseModel):
    status: str
    valid: bool
    scenario_id: str
    compiled_yaml: str | None = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    issues: list[ScenarioCompileIssue] = Field(default_factory=list)
    compiled_at: datetime | None = None


class ScenarioLaunchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agent_id: str | None = Field(default=None, max_length=64)


class ScenarioLaunchResult(BaseModel):
    status: str
    scenario_id: str
    launch_id: str
    agent_id: str | None = None
    agent_status: str
    message: str
    dispatched_at: datetime
    compiled_sha256: str


class ScenarioDeleteResult(BaseModel):
    status: str = "DELETED"
    scenario_id: str
