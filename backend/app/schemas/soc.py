"""MDR SOC + emergency dispatch schemas (Services 27, 28)."""

from pydantic import BaseModel, ConfigDict


class MDRIncidentSummary(BaseModel):
    incident_id: str
    severity: str
    target_site: str
    protocol: str
    threat_summary: str
    in_kernel_drop_verified: bool
    aryorithm_analyst_assigned: str
    analyst_verdict: str
    status: str
    created_timestamp: int
    contained_timestamp: int | None = None


class MDRMessageItem(BaseModel):
    author: str
    author_role: str
    body: str
    created_timestamp: int


class MDRIncidentDetail(MDRIncidentSummary):
    messages: list[MDRMessageItem] = []
    pcap_links: list[str] = []


class MDRMessageRequest(BaseModel):
    author: str = "customer"
    author_role: str = "customer"
    body: str


class EmergencyDispatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    affected_enclave: str
    urgency: str = "PHYSICAL_SAFETY_RISK"
    incident_notes: str = ""


class EmergencyDispatchResponse(BaseModel):
    dispatch_id: str
    status: str
    sla_window_minutes: int
    sla_deadline_timestamp: int
    assigned_responders: list[str] = []
    emergency_bridge_link: str


class SLADispatchRecord(BaseModel):
    dispatch_id: str
    affected_enclave: str
    urgency: str
    status: str
    response_time_seconds: int | None = None
    sla_met: bool | None = None
    created_timestamp: int
