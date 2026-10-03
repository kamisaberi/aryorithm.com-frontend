"""Digital forensics schemas."""

from pydantic import BaseModel
from datetime import datetime


class PCAPResponse(BaseModel):
    pcap_id: str
    sha256: str
    size_bytes: int


class FirmwareDissectResponse(BaseModel):
    task_id: str
    status: str


class FirmwareFinding(BaseModel):
    severity: str
    category: str
    description: str


class FirmwareReportResponse(BaseModel):
    task_id: str
    filename: str = ""
    sha256: str = ""
    cpu_architecture: str = "UNKNOWN"
    extracted_filesystem: str = "UNKNOWN"
    security_score: str = "UNKNOWN"
    findings: list[FirmwareFinding] = []
    # Legacy alias kept for older dashboard builds.
    vulnerabilities: list[dict] = []
