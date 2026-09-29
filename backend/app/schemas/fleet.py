"""Fleet management schemas."""

from pydantic import BaseModel
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
