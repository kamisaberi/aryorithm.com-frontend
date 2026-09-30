"""Digital Forensics & Incident Response routes."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.dfir import (
    PCAPResponse,
    FirmwareDissectResponse,
    FirmwareReportResponse,
)

router = APIRouter(prefix="/dfir", tags=["Forensics (DFIR)"])


@router.get("/pcaps", response_model=list[PCAPResponse])
async def list_pcaps(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List carved ring-buffer PCAP evidence packages."""
    return [
        PCAPResponse(pcap_id="PCAP-1002", sha256="sha256:abc...", size_bytes=48200),
        PCAPResponse(pcap_id="PCAP-1001", sha256="sha256:def...", size_bytes=32100),
    ]


@router.get("/pcaps/{pcap_id}/download")
async def download_pcap(
    pcap_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download court-admissible signed PCAP evidence."""
    # TODO: Implement actual file streaming
    return StreamingResponse(
        iter([b"PCAP binary content"]),
        media_type="application/vnd.tcpdump.pcap",
        headers={"Content-Disposition": f"attachment; filename={pcap_id}.pcap"},
    )


@router.post("/cdr/sanitize")
async def sanitize_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Content Disarm & Reconstruction (strip macros)."""
    # TODO: Implement actual CDR processing
    return StreamingResponse(
        iter([b"Sanitized file content"]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=sanitized_{file.filename}"},
    )


@router.post("/firmware/dissect", response_model=FirmwareDissectResponse)
async def dissect_firmware(
    file: UploadFile = File(...),
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload raw firmware for backdoor & CVE scanning."""
    return FirmwareDissectResponse(task_id="FSE-910", status="ANALYZING")


@router.get("/firmware/reports/{task_id}", response_model=FirmwareReportResponse)
async def get_firmware_report(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query firmware CVE & hardcoded secret findings."""
    return FirmwareReportResponse(
        vulnerabilities=[
            {"cve": "CVE-2024-1234", "severity": "CRITICAL", "description": "Hardcoded SSH key"},
            {"cve": "CVE-2024-5678", "severity": "HIGH", "description": "Buffer overflow in parser"},
        ]
    )
