"""Threat Models inventory — GET /api/v1/models (spec brief)."""

from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.ai import Model
from app.models.user import User
from app.schemas.ai import ModelResponse
from app.services.model_inventory import (
    MODEL_STORAGE_DIR,
    list_models_for_tenant,
    to_metadata_response,
)

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


@router.get("/{filename}", summary="Download ONNX model binary")
async def download_threat_model(
    filename: str,
    x_tenant_id: str = Header(alias="X-Tenant-ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download the binary for one inventory model.

    Serves the mirrored file from local storage when present; otherwise
    follows the absolute upstream URL (large Hugging Face artifacts).
    Path traversal is rejected — only the exact registered filename.
    """
    _ = x_tenant_id
    if (
        not filename.endswith(".onnx")
        or "/" in filename
        or "\\" in filename
        or filename.startswith(".")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )
    result = await db.execute(
        select(Model).where(
            Model.tenant_id == user.tenant_id,
            Model.filename == filename,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )
    local: Path = MODEL_STORAGE_DIR / filename
    if local.is_file():
        return FileResponse(
            path=str(local),
            media_type="application/octet-stream",
            filename=filename,
        )
    if row.download_url and row.download_url.startswith("http"):
        return RedirectResponse(url=row.download_url, status_code=status.HTTP_302_FOUND)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Binary not stored for this model",
    )
