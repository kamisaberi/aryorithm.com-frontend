"""License manager + generator API (community + commercial).

Canonical routes live under ``/api/v1/licenses`` (plural, like ``/plans``).
The two ``POST /api/v1/license/...`` (singular) endpoints from the original
appliance snippet are kept as thin legacy aliases so already-deployed
Sentinels keep activating without a firmware update.

Every endpoint is tenant-scoped via the caller's JWT except:
- ``GET /licenses/public-key`` — public (appliances verify offline with it);
- ``scope=all`` on list/detail — super_admin only.
"""

import json
import time

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.license import License
from app.models.user import Tenant, User, UserRole
from app.schemas.license import (
    LicenseActivationRequest,
    LicenseDetailOut,
    LicenseEnvelopeResponse,
    LicenseOut,
    LicenseSubscribeRequest,
    LicenseVerifyOut,
)
from app.services import license_service as lic

router = APIRouter(prefix="/licenses", tags=["Licensing"])
legacy_router = APIRouter(prefix="/license", tags=["Licensing (legacy)"])


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _is_super_admin(user: User) -> bool:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    return role == "super_admin"


def _row_status(row: License) -> str:
    return lic.computed_status(row.expires_at or 0, bool(row.revoked))


def _to_out(row: License) -> LicenseOut:
    created = row.created_at.isoformat() if row.created_at else None
    return LicenseOut(
        id=row.id,
        license_id=row.license_id,
        customer_name=row.customer_name,
        plan_slug=row.plan_slug,
        license_kind=row.license_kind,
        hostname=row.hostname,
        max_nodes=row.max_nodes,
        issued_at=row.issued_at,
        expires_at=row.expires_at,
        status=_row_status(row),
        revoked=bool(row.revoked),
        authorized_modules=list(row.authorized_modules or []),
        authorized_plugins=list(row.authorized_plugins or []),
        created_at=created,
    )


def _to_detail(row: License) -> LicenseDetailOut:
    base = _to_out(row)
    return LicenseDetailOut(
        **base.model_dump(),
        hardware_token=row.hardware_token,
        locked_hardware_uuid=row.locked_hardware_uuid,
        days_valid=row.days_valid,
        signature_algorithm=row.signature_algorithm,
        signature=row.signature,
        envelope=dict(row.envelope or {}),
        signature_valid=lic.verify_envelope(dict(row.envelope or {})),
    )


async def _tenant_name(db: AsyncSession, tenant_id: str) -> str:
    tenant = await db.get(Tenant, tenant_id)
    return tenant.name if tenant and tenant.name else "Unnamed Tenant"


async def _find_license(
    db: AsyncSession,
    tenant_id: str,
    ref: str,
    *,
    cross_tenant: bool = False,
) -> License | None:
    stmt = select(License).where(
        (License.id == ref) | (License.license_id == ref),
    )
    if not cross_tenant:
        stmt = stmt.where(License.tenant_id == tenant_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def _latest_for_hardware(
    db: AsyncSession, tenant_id: str, hw_uuid: str
) -> License | None:
    stmt = (
        select(License)
        .where(
            License.tenant_id == tenant_id,
            License.locked_hardware_uuid == hw_uuid,
            License.revoked.is_(False),
        )
        .order_by(License.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().first()


def _resolve_lease(plan_slug: str, days_valid: int | None, max_nodes: int | None) -> tuple[int, int]:
    defaults = lic.TIER_DEFAULTS[plan_slug]
    days = defaults["days_valid"] if days_valid is None else max(int(days_valid), 0)
    nodes = defaults["max_nodes"] if max_nodes is None else max(int(max_nodes), 1)
    if plan_slug == "community":
        days = 0  # community never expires
        nodes = min(nodes, 3)  # lab allowance: up to 3 nodes
    else:
        nodes = min(nodes, 500)
    return days, nodes


async def _issue_row(
    db: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    customer_name: str,
    plan_slug: str,
    hardware_token: str,
    hostname: str,
    days_valid: int,
    max_nodes: int,
) -> License:
    try:
        envelope = lic.generate_signed_envelope(
            customer_name=customer_name,
            tier=plan_slug,
            hw_uuid=hardware_token,
            days_valid=days_valid,
            max_nodes=max_nodes,
        )
    except LicenseKeyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    claims = envelope["claims"]
    row = License(
        license_id=claims["license_id"],
        tenant_id=tenant_id,
        user_id=user_id,
        customer_name=customer_name,
        plan_slug=plan_slug,
        license_kind=lic.license_kind(plan_slug),
        hardware_token=hardware_token,
        locked_hardware_uuid=claims["locked_hardware_uuid"],
        hostname=hostname or "sentinel-node",
        max_nodes=max_nodes,
        days_valid=days_valid,
        issued_at=claims["issued_at"],
        expires_at=claims["expires_at"],
        revoked=False,
        authorized_modules=claims["authorized_modules"],
        authorized_plugins=claims["authorized_plugins"],
        signature_algorithm="ED25519",
        signature=envelope["signature"],
        envelope=envelope,
    )
    db.add(row)
    await db.flush()
    return row


async def _renew_row(db: AsyncSession, row: License, *, days_valid: int, hostname: str | None) -> License:
    if hostname:
        row.hostname = hostname
    row.days_valid = days_valid
    try:
        envelope = lic.generate_signed_envelope(
            customer_name=row.customer_name,
            tier=row.plan_slug,
            hw_uuid=row.hardware_token,
            days_valid=days_valid,
            max_nodes=row.max_nodes,
        )
    except LicenseKeyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    claims = envelope["claims"]
    row.license_id = claims["license_id"]
    row.issued_at = claims["issued_at"]
    row.expires_at = claims["expires_at"]
    row.authorized_modules = claims["authorized_modules"]
    row.authorized_plugins = claims["authorized_plugins"]
    row.signature = envelope["signature"]
    row.envelope = envelope
    await db.flush()
    return row


# ---------------------------------------------------------------------------
# 1. Self-service subscribe — any member, free (community) or commercial
# ---------------------------------------------------------------------------
@router.post("/subscribe", response_model=LicenseEnvelopeResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_license(
    body: LicenseSubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Subscribe the caller's tenant for a community or commercial license."""
    try:
        plan_slug = lic.normalize_plan_slug(body.plan_slug)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not (body.hardware_token or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="hardware_token is required")
    days, nodes = _resolve_lease(plan_slug, body.days_valid, body.max_nodes)
    customer = (body.customer_name or "").strip() or await _tenant_name(db, user.tenant_id)
    row = await _issue_row(
        db,
        tenant_id=user.tenant_id,
        user_id=user.id,
        customer_name=customer,
        plan_slug=plan_slug,
        hardware_token=body.hardware_token.strip(),
        hostname=(body.hostname or "sentinel-node").strip(),
        days_valid=days,
        max_nodes=nodes,
    )
    return LicenseEnvelopeResponse(
        status="SUBSCRIBED",
        plan_slug=plan_slug,
        license_id=row.license_id,
        license_envelope=dict(row.envelope),
    )


# ---------------------------------------------------------------------------
# 2. Zero-touch activation for connected appliances (rolling lease)
# ---------------------------------------------------------------------------
_TENANT_TIER_TO_PLAN = {"STARTER": "community", "PRO": "enterprise", "ENTERPRISE": "critical"}


async def _activate_core(
    body: LicenseActivationRequest,
    user: User,
    db: AsyncSession,
) -> LicenseEnvelopeResponse:
    hw = (body.hardware_token or "").strip()
    if not hw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="hardware_token is required")
    hw_uuid = lic.normalize_hw_uuid(hw)
    row = await _latest_for_hardware(db, user.tenant_id, hw_uuid)
    if row is None:
        # First contact from this hardware — bootstrap from the tenant tier.
        tenant = await db.get(Tenant, user.tenant_id)
        tier_name = ""
        if tenant is not None and tenant.tier is not None:
            tier_name = tenant.tier.value if hasattr(tenant.tier, "value") else str(tenant.tier)
        plan_slug = _TENANT_TIER_TO_PLAN.get((tier_name or "").upper(), "community")
        days, nodes = _resolve_lease(plan_slug, None, None)
        if plan_slug != "community":
            days, nodes = 30, 50  # rolling lease for active subscribers
        row = await _issue_row(
            db,
            tenant_id=user.tenant_id,
            user_id=user.id,
            customer_name=await _tenant_name(db, user.tenant_id),
            plan_slug=plan_slug,
            hardware_token=hw,
            hostname=(body.hostname or "sentinel-node").strip(),
            days_valid=days,
            max_nodes=nodes,
        )
        return LicenseEnvelopeResponse(
            status="ACTIVATED",
            plan_slug=plan_slug,
            license_id=row.license_id,
            license_envelope=dict(row.envelope),
        )
    # Renewal — rolling 30-day lease for paid tiers, never-expire for community.
    days = 0 if row.plan_slug == "community" else 30
    row = await _renew_row(db, row, days_valid=days, hostname=(body.hostname or "").strip() or None)
    return LicenseEnvelopeResponse(
        status="ACTIVATED",
        plan_slug=row.plan_slug,
        license_id=row.license_id,
        license_envelope=dict(row.envelope),
    )


@router.post("/activate", response_model=LicenseEnvelopeResponse)
async def activate_license_online(
    body: LicenseActivationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Called automatically by Sentinel on startup to fetch or renew its license."""
    return await _activate_core(body, user, db)


# ---------------------------------------------------------------------------
# 3. Portal download for air-gapped sites (.lic over USB)
# ---------------------------------------------------------------------------
async def _portal_download_core(
    body: LicenseActivationRequest,
    user: User,
    db: AsyncSession,
    days_valid: int | None = None,
) -> Response:
    hw = (body.hardware_token or "").strip()
    if not hw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="hardware_token is required")
    row = await _latest_for_hardware(db, user.tenant_id, lic.normalize_hw_uuid(hw))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No license for this hardware token. Subscribe first via POST /licenses/subscribe.")
    days = 365 if days_valid is None else max(int(days_valid), 0)
    if row.plan_slug == "community":
        days = 0
    row = await _renew_row(db, row, days_valid=days, hostname=(body.hostname or "").strip() or None)
    payload = json.dumps(dict(row.envelope), indent=2)
    return Response(
        content=payload,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={row.license_id}.lic"},
    )


@router.post("/portal-download")
async def download_airgapped_license(
    body: LicenseActivationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a 1-year offline .lic file from the portal for USB transfer."""
    return await _portal_download_core(body, user, db)


# ---------------------------------------------------------------------------
# 4. License manager — list / detail / revoke / verify
# ---------------------------------------------------------------------------
@router.get("/public-key")
async def get_master_public_key():
    """Master Ed25519 public key (base64) for offline appliance verification."""
    try:
        return {"algorithm": "ED25519", "public_key_b64": lic.public_key_b64()}
    except LicenseKeyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.get("", response_model=list[LicenseOut])
@router.get("/", response_model=list[LicenseOut], include_in_schema=False)
async def list_licenses(
    status_filter: str = Query(default="all", alias="status"),
    kind: str = Query(default="all"),
    plan: str | None = Query(default=None),
    scope: str = Query(default="tenant", description="tenant | all (super_admin only)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List licenses — supports all / active / expired (+revoked) and free / commercial filters.

    Non-admin callers always see their own tenant. ``scope=all`` (super_admin)
    lifts the tenant filter for the dashboard's global view.
    """
    status_filter = (status_filter or "all").lower()
    if status_filter not in ("all", "active", "expired", "revoked"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status must be all | active | expired | revoked")
    kind = (kind or "all").lower()
    if kind not in ("all", "free", "commercial"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="kind must be all | free | commercial")
    want_all = scope == "all"
    if want_all and not _is_super_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="scope=all requires super_admin")

    stmt = select(License).order_by(License.created_at.desc())
    if not want_all:
        stmt = stmt.where(License.tenant_id == user.tenant_id)
    if plan:
        try:
            stmt = stmt.where(License.plan_slug == lic.normalize_plan_slug(plan))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if kind != "all":
        stmt = stmt.where(License.license_kind == kind)
    rows = (await db.execute(stmt)).scalars().all()
    out = [_to_out(r) for r in rows]
    if status_filter != "all":
        out = [o for o in out if o.status == status_filter]
    return out


@router.get("/verify/{license_ref}", response_model=LicenseVerifyOut)
async def verify_license(
    license_ref: str,
    scope: str = Query(default="tenant"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-verify a stored envelope's Ed25519 signature."""
    cross = scope == "all" and _is_super_admin(user)
    row = await _find_license(db, user.tenant_id, license_ref, cross_tenant=cross)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    return LicenseVerifyOut(
        license_id=row.license_id,
        signature_valid=lic.verify_envelope(dict(row.envelope or {})),
        status=_row_status(row),
    )


@router.get("/{license_ref}", response_model=LicenseDetailOut)
async def get_license(
    license_ref: str,
    scope: str = Query(default="tenant"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full license detail incl. the signed envelope (row id or LIC-... accepted)."""
    cross = scope == "all" and _is_super_admin(user)
    row = await _find_license(db, user.tenant_id, license_ref, cross_tenant=cross)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    return _to_detail(row)


@router.post("/{license_ref}/revoke", response_model=LicenseOut)
async def revoke_license(
    license_ref: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a license (admin). Appliances fail closed on revoked envelopes."""
    cross = _is_super_admin(user)
    row = await _find_license(db, user.tenant_id, license_ref, cross_tenant=cross)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    row.revoked = True
    await db.flush()
    return _to_out(row)


# ---------------------------------------------------------------------------
# 5. Legacy singular aliases (/api/v1/license/...) for deployed appliances
# ---------------------------------------------------------------------------
@legacy_router.post("/activate", response_model=LicenseEnvelopeResponse)
async def legacy_activate_license_online(
    body: LicenseActivationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy alias of POST /licenses/activate (firmware compat)."""
    return await _activate_core(body, user, db)


@legacy_router.post("/portal-download")
async def legacy_download_airgapped_license(
    body: LicenseActivationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy alias of POST /licenses/portal-download (firmware compat)."""
    return await _portal_download_core(body, user, db)
