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


class FirmwareReportResponse(BaseModel):
    vulnerabilities: list[dict]
