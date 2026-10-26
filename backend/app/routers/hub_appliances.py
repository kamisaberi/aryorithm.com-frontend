"""Official air-gapped appliance API (``/api/v1/hub/appliances``).

Public callers can browse the Matrix Selector and download pre-built
``.aryopack`` releases.  Publishing and deleting are **strictly** reserved for
the Aryorithm Authority (``super_admin``); a compromised community account
must never be able to upload a self-extracting root installer.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.hub_appliances import HubApplianceRelease
from app.models.user import User
from app.schemas.hub_marketplace import (
    ApplianceDetailOut,
    ApplianceListOut,
    ApplianceMatrixOut,
    AppliancePublishOut,
    ApplianceReleaseOut,
)
from app.services import hub_marketplace as marketplace
from app.services import hub_service as hub

router = APIRouter(prefix="/hub/appliances", tags=["Hub — Official Appliances"])


def _role_value(user: User) -> str:
    role = getattr(user, "role", "")
    return str(getattr(role, "value", role))


async def require_super_admin_publish(user: User = Depends(get_current_user)) -> User:
    if _role_value(user) != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Aryorithm Authority (super_admin) can publish .aryopack system bundles.",
        )
    return user


async def require_super_admin_delete(user: User = Depends(get_current_user)) -> User:
    if _role_value(user) != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Aryorithm Authority (super_admin) can delete .aryopack system bundles.",
        )
    return user


def _download_url(slug: str) -> str:
    return f"/api/v1/hub/appliances/{slug}/download"


def _release(row: HubApplianceRelease) -> dict:
    return ApplianceReleaseOut(
        slug=row.slug,
        title=row.title,
        version=row.version,
        architecture=row.architecture,
        industry=row.industry,
        license_tier=row.license_tier,
        file_name=row.file_name,
        file_size_bytes=row.file_size_bytes,
        sha256_checksum=row.sha256_checksum,
        authority_signature=row.authority_signature,
        verified_health_checks=row.verified_health_checks,
        download_url=_download_url(row.slug),
        install_command=f"sudo ./{row.file_name}",
        published_at=hub.to_zulu(row.created_at),
    ).model_dump()


def _detail(row: HubApplianceRelease) -> dict:
    detail = _release(row)
    detail.update({"download_count": row.download_count, "is_active": row.is_active})
    return ApplianceDetailOut(**detail).model_dump()


async def _get_appliance_or_404(db: AsyncSession, slug: str) -> HubApplianceRelease:
    row = (
        await db.execute(
            select(HubApplianceRelease).where(HubApplianceRelease.slug == slug)
        )
    ).scalar_one_or_none()
    if row is None or not row.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appliance release '{slug}' not found",
        )
    return row


# ---------------------------------------------------------------------------
# Matrix selector + catalog (public)
# ---------------------------------------------------------------------------
@router.get("/matrix", response_model=ApplianceMatrixOut)
async def appliance_matrix(db: AsyncSession = Depends(get_db)):
    """Available architectures, industries and license tiers for the selector."""
    return marketplace.matrix_payload(await marketplace.latest_appliance_version(db))


@router.get("", response_model=ApplianceListOut)
@router.get("/", response_model=ApplianceListOut, include_in_schema=False)
async def list_appliances(
    arch: str | None = Query(default=None),
    industry: str | None = Query(default=None),
    license: str | None = Query(default=None),
    version: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List official ``.aryopack`` releases matching the 3-axis selector."""
    filters = [HubApplianceRelease.is_active.is_(True)]
    for field, value, allowed in (
        ("arch", arch, marketplace.MATRIX_ARCHITECTURE_IDS),
        ("industry", industry, marketplace.MATRIX_INDUSTRY_IDS),
        ("license", license, marketplace.MATRIX_LICENSE_IDS),
    ):
        if value is None or not value.strip():
            continue
        normalized = value.strip().lower()
        if normalized not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown {field} '{value}'. Use one of: {', '.join(sorted(allowed))}.",
            )
        column = {
            "arch": HubApplianceRelease.architecture,
            "industry": HubApplianceRelease.industry,
            "license": HubApplianceRelease.license_tier,
        }[field]
        filters.append(func.lower(column) == normalized)

    selected_version = (version or "").strip() or await marketplace.latest_appliance_version(db)
    filters.append(HubApplianceRelease.version == selected_version)

    rows = (
        await db.execute(
            select(HubApplianceRelease)
            .where(*filters)
            .order_by(HubApplianceRelease.created_at.desc(), HubApplianceRelease.title.asc())
        )
    ).scalars().all()
    return {"total": len(rows), "releases": [_release(row) for row in rows]}


@router.get("/{slug}", response_model=ApplianceDetailOut)
async def get_appliance(slug: str, db: AsyncSession = Depends(get_db)):
    """Specific release details, verification hashes and download counter."""
    return _detail(await _get_appliance_or_404(db, slug))


@router.get("/{slug}/download")
async def download_appliance(slug: str, db: AsyncSession = Depends(get_db)):
    """Stream the official self-extracting ``.aryopack`` installer (public)."""
    row = await _get_appliance_or_404(db, slug)
    path = marketplace.artifact_path(marketplace.appliance_root(), row.file_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact for appliance '{slug}' not found",
        )
    row.download_count += 1
    await db.flush()
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=row.file_name,
        headers={
            "X-Checksum-SHA256": row.sha256_checksum,
            "X-Signature-Ed25519": row.authority_signature,
        },
    )


# ---------------------------------------------------------------------------
# Authority-root publish / deprecate
# ---------------------------------------------------------------------------
@router.post("/publish", response_model=AppliancePublishOut, status_code=status.HTTP_201_CREATED)
@router.post(
    "/publish/",
    response_model=AppliancePublishOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def publish_appliance(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    authority_signature: str = Form(...),
    user: User = Depends(require_super_admin_publish),
    db: AsyncSession = Depends(get_db),
):
    """Publish an official ``.aryopack`` release (super_admin only)."""
    meta = marketplace.parse_manifest(metadata, field="metadata")
    slug_raw = str(marketplace.manifest_value(meta, "slug", default="") or "").strip()
    title = str(
        marketplace.manifest_value(meta, "title", "name", default="") or ""
    ).strip()
    if not title:
        title = slug_raw
    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="metadata.title (or metadata.slug) is required",
        )
    slug = marketplace.validate_slug(
        slug_raw if slug_raw else marketplace.slugify(title)
    )
    version = str(
        marketplace.manifest_value(
            meta, "version", default=marketplace.DEFAULT_APPLIANCE_VERSION
        )
        or marketplace.DEFAULT_APPLIANCE_VERSION
    ).strip()
    architecture = str(
        marketplace.manifest_value(meta, "architecture", "arch", default="") or ""
    ).strip().lower()
    industry = str(
        marketplace.manifest_value(meta, "industry", default="") or ""
    ).strip().lower()
    license_tier = str(
        marketplace.manifest_value(meta, "license_tier", "license", default="community")
        or "community"
    ).strip().lower()

    if architecture not in marketplace.MATRIX_ARCHITECTURE_IDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"metadata.architecture must be one of: {', '.join(sorted(marketplace.MATRIX_ARCHITECTURE_IDS))}",
        )
    if industry not in marketplace.MATRIX_INDUSTRY_IDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"metadata.industry must be one of: {', '.join(sorted(marketplace.MATRIX_INDUSTRY_IDS))}",
        )
    if license_tier not in marketplace.MATRIX_LICENSE_IDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"metadata.license_tier must be one of: {', '.join(sorted(marketplace.MATRIX_LICENSE_IDS))}",
        )

    sig = marketplace.normalize_signature(authority_signature, field="authority_signature")
    filename = marketplace.safe_filename(
        file.filename, slug, ".aryopack", marketplace.APPLIANCE_EXTENSIONS
    )

    existing = (
        await db.execute(
            select(HubApplianceRelease).where(HubApplianceRelease.slug == slug)
        )
    ).scalar_one_or_none()
    if existing is not None and existing.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Appliance release '{slug}' already exists",
        )

    authority_key = marketplace.authority_public_key()
    root = marketplace.appliance_root()
    temp_path = marketplace.temp_upload_path(root, slug)
    size, digest = await marketplace.save_upload(
        file, temp_path, settings.HUB_APPLIANCE_MAX_UPLOAD_BYTES
    )
    try:
        if not marketplace.verify_file_signature(authority_key, sig, temp_path):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Ed25519 signature does not verify against the Aryorithm Authority Root",
            )
        final_dir = root / slug
        final_dir.mkdir(parents=True, exist_ok=True)
        final_path = final_dir / filename
        temp_path.replace(final_path)
    finally:
        temp_path.unlink(missing_ok=True)

    if existing is None:
        row = HubApplianceRelease(
            slug=slug,
            title=title,
            version=version,
            architecture=architecture,
            industry=industry,
            license_tier=license_tier,
            file_name=filename,
            file_path=str(final_path.relative_to(root)),
            file_size_bytes=size,
            sha256_checksum=digest,
            authority_signature=sig,
            verified_health_checks=str(
                marketplace.manifest_value(meta, "verified_health_checks", default="21/21")
                or "21/21"
            ),
            download_count=0,
            is_active=True,
            published_by=user.id,
            created_at=hub.utcnow(),
        )
        db.add(row)
    else:
        # Re-release a previously deprecated slug after full signature checks.
        row = existing
        row.title = title
        row.version = version
        row.architecture = architecture
        row.industry = industry
        row.license_tier = license_tier
        row.file_name = filename
        row.file_path = str(final_path.relative_to(root))
        row.file_size_bytes = size
        row.sha256_checksum = digest
        row.authority_signature = sig
        row.verified_health_checks = str(
            marketplace.manifest_value(meta, "verified_health_checks", default="21/21")
            or "21/21"
        )
        row.is_active = True
        row.published_by = user.id
        row.created_at = hub.utcnow()
    await db.flush()

    return {
        "status": "published",
        "slug": row.slug,
        "asset_type": "appliance",
        "download_url": _download_url(row.slug),
        "size_mb": round(size / (1024 * 1024), 1),
        "authority_root_verified": True,
    }


@router.delete("/{slug}")
async def deprecate_appliance(
    slug: str,
    user: User = Depends(require_super_admin_delete),
    db: AsyncSession = Depends(get_db),
):
    """Deprecate/yank an official appliance release (super_admin only)."""
    _ = user
    row = await _get_appliance_or_404(db, slug)
    row.is_active = False
    await db.flush()
    return {"status": "deprecated", "slug": row.slug, "asset_type": "appliance"}
