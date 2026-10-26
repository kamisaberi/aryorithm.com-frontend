"""Production site Blueprints API (``/api/v1/hub/blueprints``).

Blueprints are signed, sandboxed DAG configuration bundles.  Publishing uses
the same developer identity as the rest of the Hub (JWT or API key with the
``packages:publish`` scope).  Only the author or an admin may yank one.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.hub import HubAuthor
from app.models.hub_blueprints import HubBlueprint
from app.routers.hub import HubIdentity, get_developer_identity, require_publish_scope
from app.schemas.hub_marketplace import (
    BlueprintDetailOut,
    BlueprintListItem,
    BlueprintListOut,
    BlueprintPublishOut,
)
from app.services import hub_marketplace as marketplace
from app.services import hub_service as hub

router = APIRouter(prefix="/hub/blueprints", tags=["Hub — Production Blueprints"])

_SORTS = ("downloads", "latest", "name", "sla")
_ARCHITECTURES = ("all", "x86_64", "aarch64")


def _role_value(user) -> str:
    role = getattr(user, "role", "")
    return str(getattr(role, "value", role))


def _is_admin(user) -> bool:
    return _role_value(user) in ("super_admin", "tenant_admin", "admin")


def _download_url(slug: str) -> str:
    return f"/api/v1/hub/blueprints/{slug}/download"


def _raw_dag_url(slug: str) -> str:
    return f"/api/v1/hub/blueprints/{slug}/raw-dag"


def _dependencies(row: HubBlueprint) -> dict:
    return marketplace.normalize_dependencies(row.dependencies_json or {})


def _sla_guarantees(row: HubBlueprint) -> dict:
    sla, _ = marketplace.normalize_sla(
        row.sla_guarantees_json or {},
        float(row.max_pipeline_latency_us or 0.0),
    )
    return sla


def _item(row: HubBlueprint) -> dict:
    return BlueprintListItem(
        slug=row.slug,
        name=row.name,
        version=row.version,
        target_site=row.target_site,
        industry=row.industry,
        target_architecture=row.target_architecture,
        primary_interface=row.primary_interface,
        max_pipeline_latency_us=row.max_pipeline_latency_us,
        downloads=row.downloads,
        verified_signature=row.verified_signature,
        author=row.author,
        author_public_key=row.author_public_key,
        dependencies=_dependencies(row),
        download_url=_download_url(row.slug),
        published_at=hub.to_zulu(row.created_at),
    ).model_dump()


def _detail(row: HubBlueprint) -> dict:
    item = _item(row)
    item.update(
        {
            "description": row.description or "",
            "file_size_bytes": row.file_size_bytes,
            "sha256": row.sha256,
            "hardware_binding": dict(row.hardware_binding_json or {}),
            "sla_guarantees": _sla_guarantees(row),
            "raw_dag_url": _raw_dag_url(row.slug),
        }
    )
    return BlueprintDetailOut(**item).model_dump()


async def _get_blueprint_or_404(db: AsyncSession, slug: str) -> HubBlueprint:
    row = (
        await db.execute(select(HubBlueprint).where(HubBlueprint.slug == slug))
    ).scalar_one_or_none()
    if row is None or row.is_yanked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blueprint '{slug}' not found",
        )
    return row


async def _author_for_identity(db: AsyncSession, ident: HubIdentity) -> HubAuthor:
    author = (
        await db.execute(select(HubAuthor).where(HubAuthor.user_id == ident.user.id))
    ).scalar_one_or_none()
    if author is None:
        author = HubAuthor(
            name=ident.user.name or ident.user.email,
            user_id=ident.user.id,
        )
        db.add(author)
        await db.flush()
    return author


async def _enroll_author_key(
    db: AsyncSession, ident: HubIdentity, presented_key: str
) -> tuple[HubAuthor, str]:
    author = await _author_for_identity(db, ident)
    normalized = (
        marketplace.normalize_public_key(presented_key) if (presented_key or "").strip() else ""
    )
    if author.public_key:
        existing = marketplace.normalize_public_key(author.public_key)
        if normalized and normalized != existing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Presented public key does not match the author's enrolled key",
            )
        return author, existing
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No enrolled public key - include author_public_key in the manifest once to enroll it",
        )
    author.public_key = normalized
    await db.flush()
    return author, normalized


def _manifest_fields(meta: dict, ident: HubIdentity) -> dict:
    slug_raw = marketplace.manifest_value(meta, "slug", default="")
    name = str(marketplace.manifest_value(meta, "name", "title", default="") or "").strip()
    if not name:
        name = str(slug_raw or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="manifest.name (or manifest.slug) is required",
        )
    slug = marketplace.validate_slug(
        str(slug_raw).strip() if str(slug_raw).strip() else marketplace.slugify(name)
    )
    version = str(marketplace.manifest_value(meta, "version", default="1.0.0") or "1.0.0").strip()

    hardware = marketplace.normalize_hardware_binding(
        marketplace.manifest_value(meta, "hardware_binding", "hardware", default={})
    )
    primary_interface = str(
        marketplace.manifest_value(
            meta,
            "primary_interface",
            default=hardware.get("primary_interface") or "ens160",
        )
        or "ens160"
    )
    hardware.setdefault("primary_interface", primary_interface)

    fallback_latency = marketplace.as_float(
        marketplace.manifest_value(meta, "max_pipeline_latency_us", default=100.0),
        100.0,
        "max_pipeline_latency_us",
    )
    sla, max_latency = marketplace.normalize_sla(
        marketplace.manifest_value(meta, "sla_guarantees", "sla", default={}),
        fallback_latency,
    )

    author_raw = marketplace.manifest_value(meta, "author", default="")
    if isinstance(author_raw, dict):
        author_name = str(author_raw.get("name") or author_raw.get("display_name") or "").strip()
        key_raw = str(author_raw.get("public_key") or "").strip()
    else:
        author_name = str(author_raw or "").strip()
        key_raw = ""
    key_raw = str(
        marketplace.manifest_value(
            meta,
            "author_public_key",
            "public_key",
            "signing_public_key",
            default=key_raw,
        )
        or key_raw
    ).strip()

    return {
        "slug": slug,
        "name": name,
        "version": version,
        "target_site": str(
            marketplace.manifest_value(meta, "target_site", "site", default="") or ""
        ).strip()
        or None,
        "industry": str(
            marketplace.manifest_value(
                meta, "industry", "sector", default="CRITICAL_INFRASTRUCTURE"
            )
            or "CRITICAL_INFRASTRUCTURE"
        ).strip(),
        "target_architecture": str(
            marketplace.manifest_value(
                meta, "target_architecture", "target_arch", default="x86_64"
            )
            or "x86_64"
        ).strip(),
        "description": str(marketplace.manifest_value(meta, "description", default="") or ""),
        "primary_interface": primary_interface,
        "max_pipeline_latency_us": max_latency,
        "dependencies": marketplace.normalize_dependencies(
            marketplace.manifest_value(meta, "dependencies", default={})
        ),
        "hardware_binding": hardware,
        "sla_guarantees": sla,
        "author": author_name or ident.user.name or ident.user.email,
        "author_public_key": key_raw,
        "raw_dag_yaml": marketplace.raw_dag_from_manifest(meta),
    }


# ---------------------------------------------------------------------------
# catalog (public)
# ---------------------------------------------------------------------------
@router.get("", response_model=BlueprintListOut)
@router.get("/", response_model=BlueprintListOut, include_in_schema=False)
async def list_blueprints(
    q: str = Query(default=""),
    industry: str | None = Query(default=None),
    target_arch: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="downloads"),
    db: AsyncSession = Depends(get_db),
):
    """Paginated public catalog of production-site blueprints."""
    if sort not in _SORTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown sort '{sort}'. Use one of: {', '.join(_SORTS)}.",
        )
    if target_arch and target_arch not in _ARCHITECTURES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown target_arch '{target_arch}'. Use one of: {', '.join(_ARCHITECTURES)}.",
        )

    conditions = [HubBlueprint.is_yanked.is_(False)]
    if q.strip():
        needle = f"%{hub.like_escape(q.strip().lower())}%"
        conditions.append(
            or_(
                func.lower(HubBlueprint.name).like(needle, escape="\\"),
                func.lower(HubBlueprint.slug).like(needle, escape="\\"),
                func.lower(HubBlueprint.description).like(needle, escape="\\"),
                func.lower(func.coalesce(HubBlueprint.target_site, "")).like(
                    needle, escape="\\"
                ),
            )
        )
    if industry and industry.strip():
        conditions.append(func.lower(HubBlueprint.industry) == industry.strip().lower())
    if target_arch and target_arch != "all":
        conditions.append(
            func.lower(HubBlueprint.target_architecture) == target_arch.strip().lower()
        )

    total = int(
        (
            await db.execute(
                select(func.count()).select_from(HubBlueprint).where(*conditions)
            )
        ).scalar_one()
    )
    total_pages = max((total + limit - 1) // limit, 1)
    page = min(page, total_pages)

    stmt = select(HubBlueprint).where(*conditions)
    if sort == "downloads":
        stmt = stmt.order_by(HubBlueprint.downloads.desc(), HubBlueprint.name.asc())
    elif sort == "latest":
        stmt = stmt.order_by(HubBlueprint.created_at.desc())
    elif sort == "name":
        stmt = stmt.order_by(HubBlueprint.name.asc())
    else:  # sla
        stmt = stmt.order_by(HubBlueprint.max_pipeline_latency_us.asc(), HubBlueprint.name.asc())

    rows = (
        await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    ).scalars().all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "results": [_item(row) for row in rows],
    }


@router.get("/{slug}", response_model=BlueprintDetailOut)
async def get_blueprint(slug: str, db: AsyncSession = Depends(get_db)):
    """Full metadata, hardware bindings, dependencies and SLA for one blueprint."""
    return _detail(await _get_blueprint_or_404(db, slug))


@router.get("/{slug}/raw-dag")
async def get_raw_dag(slug: str, db: AsyncSession = Depends(get_db)):
    """Return the raw ``model_routes.yaml`` for pre-install inspection."""
    row = await _get_blueprint_or_404(db, slug)
    if not (row.raw_dag_yaml or "").strip():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Raw DAG for blueprint '{slug}' is not available",
        )
    return Response(
        content=row.raw_dag_yaml,
        media_type="application/yaml",
        headers={"X-Checksum-SHA256": row.sha256},
    )


@router.get("/{slug}/download")
async def download_blueprint(slug: str, db: AsyncSession = Depends(get_db)):
    """Stream the signed ``.blueprint`` archive (public)."""
    row = await _get_blueprint_or_404(db, slug)
    path = marketplace.artifact_path(marketplace.blueprint_root(), row.file_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact for blueprint '{slug}' not found",
        )
    row.downloads += 1
    await db.flush()
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=row.file_name,
        headers={
            "X-Checksum-SHA256": row.sha256,
            "X-Signature-Ed25519": row.signature,
        },
    )


# ---------------------------------------------------------------------------
# publish / yank
# ---------------------------------------------------------------------------
@router.post("/publish", response_model=BlueprintPublishOut, status_code=status.HTTP_201_CREATED)
@router.post(
    "/publish/",
    response_model=BlueprintPublishOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def publish_blueprint(
    file: UploadFile = File(...),
    manifest: str = Form(...),
    signature: str = Form(...),
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Publish & sign a ``.blueprint`` bundle (JWT or API key + publish scope)."""
    require_publish_scope(ident)
    meta = marketplace.parse_manifest(manifest)
    fields = _manifest_fields(meta, ident)
    slug = fields["slug"]
    sig = marketplace.normalize_signature(signature)
    filename = marketplace.safe_filename(
        file.filename, slug, ".blueprint", marketplace.BLUEPRINT_EXTENSIONS
    )

    existing = (
        await db.execute(select(HubBlueprint).where(HubBlueprint.slug == slug))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Blueprint '{slug}' already exists",
        )

    author, public_key = await _enroll_author_key(db, ident, fields["author_public_key"])

    root = marketplace.blueprint_root()
    temp_path = marketplace.temp_upload_path(root, slug)
    size, digest = await marketplace.save_upload(file, temp_path, settings.HUB_MAX_UPLOAD_BYTES)
    final_path: Path | None = None
    try:
        if not marketplace.verify_file_signature(public_key, sig, temp_path):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Ed25519 signature does not verify against the author's enrolled public key",
            )
        raw_dag = fields["raw_dag_yaml"] or marketplace.extract_raw_dag_from_path(
            temp_path, filename
        )
        final_dir = root / slug
        final_dir.mkdir(parents=True, exist_ok=True)
        final_path = final_dir / filename
        temp_path.replace(final_path)
    finally:
        temp_path.unlink(missing_ok=True)

    row = HubBlueprint(
        slug=slug,
        name=fields["name"],
        version=fields["version"],
        target_site=fields["target_site"],
        industry=fields["industry"],
        target_architecture=fields["target_architecture"],
        description=fields["description"],
        primary_interface=fields["primary_interface"],
        max_pipeline_latency_us=fields["max_pipeline_latency_us"],
        dependencies_json=fields["dependencies"],
        hardware_binding_json=fields["hardware_binding"],
        sla_guarantees_json=fields["sla_guarantees"],
        raw_dag_yaml=raw_dag,
        sha256=digest,
        author=fields["author"],
        author_public_key=public_key,
        signature=sig,
        owner_user_id=ident.user.id,
        file_name=filename,
        file_path=str(final_path.relative_to(root)),
        file_size_bytes=size,
        downloads=0,
        verified_signature=True,
        is_yanked=False,
        created_at=hub.utcnow(),
    )
    db.add(row)
    await db.flush()

    return {
        "status": "published",
        "slug": row.slug,
        "asset_type": "blueprint",
        "version": row.version,
        "download_url": _download_url(row.slug),
        "verification": {
            "sha256": row.sha256,
            "signature_verified": True,
            "signer_public_key": row.author_public_key,
        },
    }


@router.delete("/{slug}")
async def yank_blueprint(
    slug: str,
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Yank a blueprint from the public catalog (author or admin)."""
    require_publish_scope(ident)
    row = await _get_blueprint_or_404(db, slug)
    if row.owner_user_id != ident.user.id and not _is_admin(ident.user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the blueprint author or an admin can yank this blueprint",
        )
    row.is_yanked = True
    await db.flush()
    return {"status": "yanked", "slug": row.slug, "asset_type": "blueprint"}
