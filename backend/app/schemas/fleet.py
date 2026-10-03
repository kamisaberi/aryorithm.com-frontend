"""Fleet management schemas."""

from pydantic import BaseModel, ConfigDict
from datetime import datetime


class NodeResponse(BaseModel):
    node_id: str
    site: str
    hostname: str | None = None
    kernel_version: str | None = None
    status: str
    cpu_pct: float
    ram_mb: float = 0.0
    npu_temp_c: float = 0.0
    packets_inspected: int = 0
    ebpf_drops: int = 0
    mitigation_latency_us: float = 0.0
    latency_us: float = 0.0
    eps: int = 0
    version: str = ""
    backend: str = ""
    last_heartbeat_timestamp: int | None = None
    sensors_count: int = 0


class NodeDetailResponse(BaseModel):
    node_id: str
    ring_buffer_fill_pct: int
    kernel_drops: int
    hardware: dict
    site: str | None = None
    status: str | None = None
    sensors: list["TopologySensor"] = []


class GroupCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    group_id: str
    description: str = ""
    scada_mode: bool = False
    max_latency_us: int = 1000
    max_allowed_latency_us: int | None = None


class GroupResponse(BaseModel):
    group_id: str
    description: str = ""
    scada_mode: bool
    max_latency_us: int
    node_count: int
    active_threats: int = 0


class GroupCreateResponse(BaseModel):
    status: str
    group_id: str


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


class FleetSyncSensor(BaseModel):
    """Single monitored asset — exact sentinel-nexus shape (Tier 3).

    sensor_id is the deterministic identifier from blackbox-sentinel
    (MAC + IP + protocol address). All metadata is optional so sender
    drift never 422s; extra keys are ignored.
    """

    model_config = ConfigDict(extra="ignore")

    sensor_id: str
    name: str | None = None
    type: str | None = None
    protocol: str | None = None
    ip_address: str | None = None
    status: str | None = None
    last_packet_seen_sec_ago: float | None = None


class FleetSyncNode(BaseModel):
    """Single edge appliance entry — exact sentinel-nexus shape.

    Nexus sends: node_id, site, status, cpu_pct, ebpf_drops,
    mitigation_latency_us. Legacy dashboard fields (latency_us, eps,
    version, backend) are kept optional for backward compat.
    Tier-3 sensors ride along as an embedded list.
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
    # 4-tier topology extensions
    hostname: str | None = None
    kernel_version: str | None = None
    ram_mb: float | None = None
    npu_temp_c: float | None = None
    packets_inspected: int | None = None
    sensors_count: int | None = None
    sensors: list[FleetSyncSensor] = []


class FleetSyncRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tenant_id: str
    nodes_count: int
    nodes: list[FleetSyncNode] = []
    # Tier-1 nexus identity (absent in legacy simulator payloads).
    nexus_id: str | None = None
    nexus_version: str | None = None
    timestamp: int | float | None = None


class FleetSyncResponse(BaseModel):
    status: str
    tenant_id: str
    nodes_count: int
    synced: int
    nexus_id: str | None = None
    sensors_synced: int = 0


class TopologySensor(BaseModel):
    sensor_id: str
    name: str
    type: str
    protocol: str
    ip_address: str | None = None
    reported_status: str
    status: str  # effective status from the cascading health engine
    last_packet_seen_sec_ago: float | None = None


class TopologyNode(BaseModel):
    node_id: str
    site: str
    hostname: str | None = None
    reported_status: str
    status: str  # effective status (UNREACHABLE when parent nexus is down)
    cpu_pct: float
    ebpf_drops: int
    mitigation_latency_us: float
    last_heartbeat_sec_ago: float | None = None
    sensors: list[TopologySensor] = []


class TopologyNexus(BaseModel):
    nexus_id: str
    version: str
    status: str  # ONLINE when seen within the heartbeat window
    last_seen_sec_ago: float | None = None
    nodes: list[TopologyNode] = []


class TopologySummary(BaseModel):
    nexus_online: int = 0
    nexus_offline: int = 0
    nodes_online: int = 0
    nodes_degraded: int = 0
    nodes_offline: int = 0
    nodes_unreachable: int = 0
    sensors_active: int = 0
    sensors_fault: int = 0
    sensors_silent: int = 0


class TopologyResponse(BaseModel):
    tenant_id: str
    nexus: list[TopologyNexus] = []
    summary: TopologySummary = TopologySummary()
