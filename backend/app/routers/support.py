"""Emergency dispatch + SLA history (Service 28)."""

import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.range import EmergencyDispatch
from app.models.user import User
from app.schemas.soc import (
    EmergencyDispatchRequest,
    EmergencyDispatchResponse,
    SLADispatchRecord,
)

router = APIRouter(prefix="/support", tags=["Emergency Support"])

RESPONDERS = [
    "Bram Visser (Principal SCADA Architect)",
    "Sofia Kallas (Hardware Trust Lead)",
]


@router.post("/emergency-dispatch", response_model=EmergencyDispatchResponse)
async def trigger_dispatch(
    body: EmergencyDispatchRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Page on-call kernel + SCADA leads (15-minute SLA window)."""
    from app.database import engine as _engine
    from app.database import Base as _Base

    async with _engine.begin() as _conn:
        await _conn.run_sync(_Base.metadata.create_all)
    if not body.affected_enclave.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="affected_enclave is required",
        )
    now = datetime.now(timezone.utc)
    dispatch_id = f"DISPATCH-RED-{random.randint(1000, 9999)}"
    deadline = now + timedelta(minutes=15)
    db.add(EmergencyDispatch(
        dispatch_id=dispatch_id,
        affected_enclave=body.affected_enclave.strip(),
        urgency=body.urgency,
        notes=body.incident_notes,
        responders=list(RESPONDERS),
        response_time_seconds=None,
        tenant_id=user.tenant_id,
    ))
    await db.flush()
    return EmergencyDispatchResponse(
        dispatch_id=dispatch_id,
        status="ENGINEERS_PAGED",
        sla_window_minutes=15,
        sla_deadline_timestamp=int(deadline.timestamp()),
        assigned_responders=list(RESPONDERS),
        emergency_bridge_link=f"https://bridge.aryorithm.com/incident/{dispatch_id}",
    )


@router.get("/sla-history", response_model=list[SLADispatchRecord])
async def sla_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Historical dispatches with SLA compliance flags."""
    from app.database import engine as _engine
    from app.database import Base as _Base

    async with _engine.begin() as _conn:
        await _conn.run_sync(_Base.metadata.create_all)
    rows = list(
        (await db.execute(
            select(EmergencyDispatch)
            .where(EmergencyDispatch.tenant_id == user.tenant_id)
            .order_by(EmergencyDispatch.created_at.desc())
        )).scalars().all()
    )
    return [
        SLADispatchRecord(
            dispatch_id=r.dispatch_id,
            affected_enclave=r.affected_enclave,
            urgency=r.urgency,
            status="RESPONDED" if r.response_time_seconds is not None else "PAGED",
            response_time_seconds=r.response_time_seconds,
            sla_met=(None if r.response_time_seconds is None else r.response_time_seconds <= 900),
            created_timestamp=int(
                (r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at).timestamp()
            ),
        )
        for r in rows
    ]
