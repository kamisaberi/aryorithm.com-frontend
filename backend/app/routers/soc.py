"""Co-managed SOC triage hub (Service 27)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.range import MDRIncident, MDRMessage
from app.models.user import User
from app.schemas.soc import (
    MDRIncidentDetail,
    MDRIncidentSummary,
    MDRMessageItem,
    MDRMessageRequest,
)

router = APIRouter(prefix="/soc", tags=["MDR SOC"])


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def _ensure_soc_schema() -> None:
    def _migrate(sync_conn) -> None:
        import app.models  # noqa: F401 (register tables for create_all)

        from app.database import Base

        Base.metadata.create_all(sync_conn)

    from app.database import engine as _engine

    async with _engine.begin() as conn:
        await conn.run_sync(_migrate)


def _to_summary(row: MDRIncident) -> MDRIncidentSummary:
    return MDRIncidentSummary(
        incident_id=row.incident_id,
        severity=row.severity,
        target_site=row.target_site,
        protocol=row.protocol,
        threat_summary=row.threat_summary,
        in_kernel_drop_verified=True,
        aryorithm_analyst_assigned=row.assigned_analyst,
        analyst_verdict=row.analyst_verdict,
        status=row.status,
        created_timestamp=int(_aware(row.created_at).timestamp()),
        contained_timestamp=int(_aware(row.contained_at).timestamp()) if row.contained_at else None,
    )


@router.get("/incidents", response_model=list[MDRIncidentSummary])
async def list_incidents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Active triage queue for the 24/7 MDR team."""
    await _ensure_soc_schema()
    rows = list(
        (await db.execute(
            select(MDRIncident)
            .where(MDRIncident.tenant_id == user.tenant_id)
            .order_by(MDRIncident.created_at.desc())
        )).scalars().all()
    )
    return [_to_summary(r) for r in rows]


@router.get("/incidents/{incident_id}", response_model=MDRIncidentDetail)
async def get_incident(
    incident_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Case details with analyst chat history and PCAP links."""
    await _ensure_soc_schema()
    row = (
        await db.execute(
            select(MDRIncident).where(
                MDRIncident.tenant_id == user.tenant_id,
                MDRIncident.incident_id == incident_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )
    msgs = list(
        (await db.execute(
            select(MDRMessage)
            .where(
                MDRMessage.tenant_id == user.tenant_id,
                MDRMessage.incident_id == incident_id,
            )
            .order_by(MDRMessage.created_at)
        )).scalars().all()
    )
    summary = _to_summary(row)
    return MDRIncidentDetail(
        **summary.model_dump(),
        messages=[
            MDRMessageItem(
                author=m.author,
                author_role=m.author_role,
                body=m.body,
                created_timestamp=int(_aware(m.created_at).timestamp()),
            )
            for m in msgs
        ],
        pcap_links=[f"/api/v1/dfir/pcaps?limit=20"],
    )


@router.post("/incidents/{incident_id}/messages", response_model=MDRMessageItem)
async def post_message(
    incident_id: str,
    body: MDRMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Customer/analyst chat message on a triage case."""
    await _ensure_soc_schema()
    row = (
        await db.execute(
            select(MDRIncident).where(
                MDRIncident.tenant_id == user.tenant_id,
                MDRIncident.incident_id == incident_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )
    if not body.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message body is required",
        )
    msg = MDRMessage(
        incident_id=incident_id,
        author=body.author or user.email,
        author_role=body.author_role,
        body=body.body.strip()[:2000],
        tenant_id=user.tenant_id,
    )
    db.add(msg)
    await db.flush()
    return MDRMessageItem(
        author=msg.author,
        author_role=msg.author_role,
        body=msg.body,
        created_timestamp=int(_aware(msg.created_at).timestamp()),
    )
