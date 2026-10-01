"""Threat Models inventory — GET /api/v1/models (spec brief)."""

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.ai import ModelResponse
from app.services.model_inventory import list_models_for_tenant, to_metadata_response

router = APIRouter(prefix="/models", tags=["Threat Models"])


@router.get("", response_model=list[ModelResponse], summary="List versioned ONNX threat models")
@router.get("/", response_model=list[ModelResponse], include_in_schema=False)
async def list_threat_models(
    # Required multi-tenant scope (spec: X-Tenant-ID Yes). FastAPI returns
    # 422 when absent; presence is enforced, scoping uses the JWT tenant.
    x_tenant_id: str = Header(alias="X-Tenant-ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inventory of versioned neural threat detection models (.onnx).

    Returns cryptographic hashes + Canary rollout stages for edge
    appliance deployment. Seeds the two baseline records on first call.
    """
    _ = x_tenant_id  # header presence enforced; row scoping via JWT tenant
    rows = await list_models_for_tenant(db, user.tenant_id)
    return [ModelResponse(**to_metadata_response(m)) for m in rows]
