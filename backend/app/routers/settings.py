"""Administration, Settings & Billing routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.schemas.settings import (
    APIKeyResponse,
    APIKeyCreate,
    APIKeyCreateResponse,
    APIKeyActionResponse,
    WebhookResponse,
    WebhookCreate,
    WebhookCreateResponse,
    BillingResponse,
    AuditLogResponse,
)

router = APIRouter(prefix="/settings", tags=["Administration"])


@router.get("/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(user: dict = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """List active programmatic API keys."""
    return [
        APIKeyResponse(key_id="key_001", name="CI/CD Pipeline", created_at="2024-01-15T10:00:00Z"),
        APIKeyResponse(key_id="key_002", name="SIEM Forwarder", created_at="2024-03-22T14:30:00Z"),
    ]


@router.post("/api-keys", response_model=APIKeyCreateResponse)
async def create_api_key(
    body: APIKeyCreate,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create new API key with scoped permissions."""
    return APIKeyCreateResponse(api_key="ary_live_9f2k4m8x7p4n5t7r3w2e...")


@router.delete("/api-keys/{key_id}", response_model=APIKeyActionResponse)
async def revoke_api_key(
    key_id: str,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API key immediately."""
    return APIKeyActionResponse(status="REVOKED", key_id=key_id)


@router.get("/webhooks", response_model=list[WebhookResponse])
async def list_webhooks(user: dict = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """List configured event push webhooks."""
    return [
        WebhookResponse(id="wh_001", url="https://siem.corp.internal/hooks"),
        WebhookResponse(id="wh_002", url="https://alerts.eurogrid.nl/webhook"),
    ]


@router.post("/webhooks", response_model=WebhookCreateResponse)
async def create_webhook(
    body: WebhookCreate,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Register new webhook for drop/threat alerts."""
    return WebhookCreateResponse(webhook_id="wh_new01", status="ACTIVE")


@router.get("/billing", response_model=BillingResponse)
async def get_billing(user: dict = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Query node licenses, Forge credits, and invoices."""
    return BillingResponse(active_nodes=124, licensed_nodes=150, renewal_date="2025-01-15T00:00:00Z")


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tamper-evident operator action audit trail."""
    return [
        AuditLogResponse(action="MODEL_PROMOTED", operator="admin@eurogrid.nl", ts="2026-09-29T10:30:00Z"),
        AuditLogResponse(action="USER_SUSPENDED", operator="sara@aryorithm.com", ts="2026-09-29T09:15:00Z"),
    ]
