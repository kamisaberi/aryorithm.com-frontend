"""Fleet management schemas."""

from pydantic import BaseModel, ConfigDict
from datetime import datetime


class NodeResponse(BaseModel):
    node_id: str
    site: str
    status: str
    cpu_pct: float
    latency_us: float
    eps: int
    version: str
    backend: str


class NodeDetailResponse(BaseModel):
    node_id: str
    ring_buffer_fill_pct: int
    kernel_drops: int
    hardware: dict


class NodeRestartRequest(BaseModel):
    reason: str


class NodeActionResponse(BaseModel):
    status: str
    node_id: str


class EnclaveCreate(BaseModel):
    enclave_id: str
    max_latency_us: int = 1000


class EnclaveResponse(BaseModel):
    enclave_id: str
    name: str
    max_latency_us: int
    node_count: int


class EnclaveCreateResponse(BaseModel):
    status: str
    enclave_id: str


class ZTPTokenRequest(BaseModel):
    enclave_id: str
    valid_days: int = 7


class ZTPTokenResponse(BaseModel):
    token: str
    expires_at: datetime


class ZTPEnrollRequest(BaseModel):
    tpm_quote: str
    dmi_uuid: str
    token: str


class ZTPEnrollResponse(BaseModel):
    assigned_node_id: str
    heartbeat_sec: int = 5


class KernelRuleResponse(BaseModel):
    rule_id: str
    ip: str
    expires_at: datetime | None


class KernelPurgeRequest(BaseModel):
    ip: str


class KernelPurgeResponse(BaseModel):
    status: str
    ip: str


class FleetSyncNode(BaseModel):
    """Single edge appliance entry — exact sentinel-nexus shape.

    Nexus sends: node_id, site, status, cpu_pct, ebpf_drops,
    mitigation_latency_us. Legacy dashboard fields (latency_us, eps,
    version, backend) are kept optional for backward compat.
    Extra keys are ignored so sender/backend never 422 on drift.
    """

    model_config = ConfigDict(extra="ignore")

    node_id: str
    site: str | None = None
    status: str | None = None
    cpu_pct: float | None = None
    ebpf_drops: int | None = None
    mitigation_latency_us: float | None = None
    # Legacy / dashboard-simulator fields
    latency_us: float | None = None
    eps: int | None = None
    version: str | None = None
    backend: str | None = None


class FleetSyncRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tenant_id: str
    nodes_count: int
    nodes: list[FleetSyncNode] = []


class FleetSyncResponse(BaseModel):
    status: str
    tenant_id: str
    nodes_count: int
    synced: int
