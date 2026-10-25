"""Live 5G N3 telemetry routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.compliance import FiveGTelemetryResponse
from app.services.frontier import fiveg_telemetry_payload

router = APIRouter(prefix="/telemetry", tags=["5G Telemetry"])


@router.get("/5g-slices", response_model=FiveGTelemetryResponse)
async def get_5g_slices(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Live N3 GTP-U counters per Sentinel node.

    Values are the last ``gtp_stats`` block received from each node on
    ``POST /api/v1/fleet/sync``. The response exposes both the raw edge
    counters and a pre-aggregated ``summary`` for dashboards.
    """
    return await fiveg_telemetry_payload(db, user.tenant_id)
