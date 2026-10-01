"""Tenant cloud commands polled by sentinel-nexus."""

import logging

from fastapi import APIRouter, Depends, Header

from app.dependencies import get_nexus_caller
from app.models.user import User

router = APIRouter(prefix="/tenants", tags=["Tenants"])

logger = logging.getLogger("uvicorn.error")


@router.get("/{tenant_id}/commands/pending", response_model=list[dict])
async def get_pending_commands(
    tenant_id: str,
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    caller: User | None = Depends(get_nexus_caller),
):
    """Remote cloud commands — Nexus GETs this every ~10s.

    Sender headers: `Authorization: Bearer <JWT>`, `X-Tenant-ID`.
    Returns `[]` when no emergency rollback / model advance is queued.
    """
    effective_tenant = x_tenant_id or tenant_id
    logger.info(
        "GET /api/v1/tenants/%s/commands/pending tenant=%s user=%s",
        tenant_id,
        effective_tenant,
        getattr(caller, "id", "api-key"),
    )
    print(
        f"[tenants/commands/pending] tenant={effective_tenant} "
        f"path_tenant={tenant_id} count=0",
        flush=True,
    )
    return []
