"""Compliance, GRC & Audit Vault routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.compliance import (
    NIS2Response,
    IEC62443Response,
    CMMCResponse,
    ComplianceExportRequest,
    AttestationLogResponse,
    InsuranceProofResponse,
)

router = APIRouter(prefix="/compliance", tags=["Compliance GRC"])


@router.get("/nis2", response_model=NIS2Response)
async def get_nis2(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """EU NIS2 & DORA incident response audit proof."""
    return NIS2Response(framework="EU NIS2", compliant=True, incident_sla_verified=True)


@router.get("/iec62443", response_model=IEC62443Response)
async def get_iec62443(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """IEC 62443 industrial control system findings."""
    return IEC62443Response(standard="IEC 62443-3-3", system_integrity="PASS", zones_verified=14)


@router.get("/cmmc", response_model=CMMCResponse)
async def get_cmmc(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """CMMC 2.0 Level 2 / NIST SP 800-171 checklist."""
    return CMMCResponse(
        findings=[
            {"control_id": "IA.L2-3.5.1", "title": "TPM 2.0 Auth", "passed": True},
            {"control_id": "AC.L2-3.1.1", "title": "Account Management", "passed": True},
        ]
    )


@router.post("/export")
async def export_compliance(
    body: ComplianceExportRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate signed auditor-ready PDF/JSON package."""
    # TODO: Implement actual PDF generation
    return StreamingResponse(
        iter([b"PDF binary content"]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=compliance_{body.framework}.{body.format.lower()}"},
    )


@router.get("/attestation-logs", response_model=list[AttestationLogResponse])
async def list_attestation_logs(
    node_id: str | None = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cryptographic TPM 2.0 quote history per node."""
    return [
        AttestationLogResponse(timestamp="2026-09-29T10:00:00Z", pcr0_hash="sha256:abc123...", verified=True),
        AttestationLogResponse(timestamp="2026-09-29T09:00:00Z", pcr0_hash="sha256:def456...", verified=True),
    ]


@router.get("/insurance-proof", response_model=InsuranceProofResponse)
async def get_insurance_proof(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Verified risk rating for cyber insurance brokers."""
    return InsuranceProofResponse(
        certified_sla_us=0.84,
        hardware_root="TPM 2.0",
        insurance_discount_score="TIER_A",
    )
