"""Private artifact workspace routes (``/api/v1/workspace/artifacts``)."""

from __future__ import annotations

import hashlib
from types import SimpleNamespace

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.routers import hub as hub_router
from app.routers import hub_assets as hub_assets_router
from app.schemas.hub_workspace import WorkspacePatch
from app.services import artifact_sanitize
from app.services import hub_access as access
from app.services import hub_assets as assets

router = APIRouter(
    prefix="/workspace/artifacts", tags=["Workspace — Artifacts"]
)


async def _workspace_views(db, user, scope):
    views = await assets.all_views(db)
    share_map = await access.share_map_for_user(db, user)
    filtered = access.scope_views(views, user, scope, share_map)
    access.decorate_views(filtered, user, share_map)
    return filtered


@router.get("")
async def list_workspace_artifacts(
    scope: str = Query(default="private", description="private | shared | public | all"),
    type: str = Query(default="all"),
    q: str = Query(default=""),
    industry: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="latest"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the caller's private artifacts, plus explicitly shared/public views."""
    scope = (scope or "private").strip().lower()
    if scope not in access.SCOPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scope '{scope}'. Use one of: {', '.join(access.SCOPES)}.",
        )
    try:
        views = await _workspace_views(db, user, scope)
        views = assets.filter_views(
            views, query=q, asset_type=type, industry=industry
        )
        ordered = assets.sort_views(views, sort)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    return assets.paginate(ordered, page, limit)


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_workspace_artifact(
    asset_type: str = Form(...),
    file: UploadFile = File(...),
    manifest: str = Form(...),
    signature: str = Form(""),
    visibility: str = Form("private"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a new artifact into the caller's private workspace.

    Workspace uploads are server-signed when the browser does not provide an
    Ed25519 signature.  CLI/API-key publishing keeps the stricter author-key
    verification path.
    """
    if (visibility or "private").strip().lower() not in ("public", "private"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="visibility must be 'public' or 'private'",
        )
    try:
        kind = assets.normalize_asset_type(asset_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    meta = hub_router._parse_manifest(manifest)
    if meta.get("slug") is not None:
        meta["slug"] = hub_router._normalize_publish_slug(str(meta["slug"]))
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="file is empty",
        )
    if len(file_bytes) > (
        hub_router.settings.HUB_APPLIANCE_MAX_UPLOAD_BYTES
        if asset_type == "appliance"
        else hub_router.settings.HUB_MAX_UPLOAD_BYTES
    ):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Upload exceeds the configured limit",
        )
    if kind == "appliance":
        # Appliances are authority-signed; delegate to the strict path.
        result = await hub_router.universal_publish(
            asset_type=kind,
            file=file,
            manifest=manifest,
            signature=signature,
            visibility=visibility,
            ident=hub_router.HubIdentity(user=user, token=None),
            db=db,
        )
        return result.model_dump()

    sig = (signature or "").strip()
    public_key = ""
    if sig:
        if len(sig) not in (128, 130):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="signature must be a 64-byte Ed25519 hex string",
            )
        public_key = str(meta.get("author_public_key") or meta.get("public_key") or "")
    else:
        sig = assets.seed_private_key().sign(file_bytes).hex()
        public_key = assets.seed_public_key_hex()
    if public_key:
        try:
            if not hub_router.hub.verify_ed25519(public_key, sig, file_bytes):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Ed25519 signature does not verify against the file bytes",
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="invalid author public key",
            )

    author = SimpleNamespace(
        name=user.name or user.email or "Workspace upload",
        public_key=public_key or assets.seed_public_key_hex(),
    )
    file_name = file.filename or f"{meta.get('slug') or kind}.bin"
    if kind == "package":
        asset_id, dl_path = await hub_router._publish_package(
            db, author, file, file_bytes, meta
        )
        default_version, tier = "1.0.0", str(meta.get("tier") or "lua")
    elif kind == "pcap":
        asset_id, dl_path = await hub_router._publish_pcap(db, file, file_bytes, meta)
        default_version, tier = "1.0.0", str(meta.get("category") or "pcap")
    elif kind == "dataset":
        asset_id, dl_path = await hub_router._publish_dataset(db, file, file_bytes, meta)
        default_version, tier = "1.0.0", str(meta.get("format") or "dataset")
    elif kind == "scenario":
        asset_id, dl_path = await hub_router._publish_scenario(db, file, file_bytes, meta)
        default_version, tier = "1.0.0", "scenario"
    elif kind == "blueprint":
        asset_id, dl_path, file_name = await hub_router._publish_blueprint_unified(
            db,
            hub_router.HubIdentity(user=user, token=None),
            author,
            file,
            file_bytes,
            meta,
            sig,
        )
        default_version, tier = "1.0.0", "blueprint"
    elif kind == "model":
        asset_id, dl_path = await hub_router._publish_model(db, file, file_bytes, meta, sig)
        default_version, tier = "v0.1.0", str(meta.get("tier") or "COMMUNITY")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported asset type"
        )

    slug = str(meta.get("slug") or "").strip()
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="manifest.slug is required",
        )
    if visibility == "public" and kind in ("pcap", "blueprint"):
        view = await assets.get_view(db, kind, slug, allow_deprecated=True)
        if view is not None:
            try:
                await artifact_sanitize.validate_public_artifact(db, view)
            except artifact_sanitize.SanitizationError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={"error": "artifact failed public sanitization", "issues": exc.issues},
                )
    version = str(meta.get("version") or default_version)
    compliance = meta.get("compliance") or meta.get("compliance_tags") or []
    if not isinstance(compliance, list):
        compliance = []
    await assets.record_publish(
        db,
        asset_type=kind,
        slug=slug,
        signature=hub_router.hub.decode_key_material(sig, 64, "signature").hex()
        if len(sig) in (128, 130)
        else sig,
        public_key=author.public_key,
        author=author.name,
        owner_user_id=user.id,
        version=version,
        tier=tier,
        industry=str(
            meta.get("industry")
            or meta.get("sector")
            or meta.get("target_sector")
            or meta.get("domain")
            or meta.get("category")
            or ""
        ),
        compliance=compliance,
        manifest=meta,
        readme_markdown=str(meta.get("readme_markdown") or ""),
        file_name=file_name,
        sha256=hashlib.sha256(file_bytes).hexdigest(),
        tenant_id=user.tenant_id,
        visibility=(visibility or "private").strip().lower(),
    )
    view = await assets.get_view(db, kind, slug)
    if view is not None:
        access.decorate(view, user)
    return {
        "status": "created",
        "asset_type": kind,
        "slug": slug,
        "asset_id": asset_id,
        "visibility": (visibility or "private").strip().lower(),
        "download_url": dl_path,
        "detail": view.detail() if view is not None else None,
    }


@router.get("/{asset_type}/{slug}")
async def workspace_artifact_detail(
    asset_type: str,
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view, _link, _ = await hub_assets_router._authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        permission="VIEW",
        with_signature=True,
        hide=False,
    )
    return view.detail()


def _source_name_field(kind: str) -> str:
    return "title" if kind in ("pcap", "appliance") else "name"


@router.patch("/{asset_type}/{slug}")
async def update_workspace_artifact(
    asset_type: str,
    slug: str,
    body: WorkspacePatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view, _link, _ = await hub_assets_router._authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        permission="VIEW",
        allow_deprecated=True,
        hide=False,
    )
    legacy_admin = (
        view.owner_user_id is None
        and view.owner_tenant_id is None
        and access.is_admin(user)
    )
    if "ADMIN" not in view.permissions and not legacy_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN permission is required to edit this artifact",
        )
    if body.visibility == "public" and view.asset_type in ("pcap", "blueprint"):
        try:
            await artifact_sanitize.validate_public_artifact(db, view)
        except artifact_sanitize.SanitizationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"error": "artifact failed public sanitization", "issues": exc.issues},
            )
    meta = await assets._ensure_meta_for_asset(db, view)
    manifest = dict(meta.manifest or view.manifest or {})
    if body.manifest is not None:
        manifest.update(body.manifest)
    if body.name is not None:
        manifest["name"] = body.name
        field_name = _source_name_field(view.asset_type)
        if hasattr(view.source, field_name):
            setattr(view.source, field_name, body.name)
    if body.description is not None:
        manifest["description"] = body.description
        if hasattr(view.source, "short_description"):
            view.source.short_description = body.description
        elif hasattr(view.source, "description"):
            view.source.description = body.description
    if body.readme_markdown is not None:
        meta.readme_markdown = body.readme_markdown
    if body.visibility is not None:
        meta.visibility = body.visibility
    meta.manifest = manifest
    await db.flush()
    refreshed = await assets.get_view(
        db, view.asset_type, view.slug, allow_deprecated=True
    )
    if refreshed is not None:
        access.decorate(refreshed, user)
        return refreshed.detail()
    access.decorate(view, user)
    return view.detail()


@router.delete("/{asset_type}/{slug}")
async def delete_workspace_artifact(
    asset_type: str,
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await hub_assets_router.revoke_asset(
        asset_type=asset_type,
        slug=slug,
        ident=hub_router.HubIdentity(user=user, token=None),
        db=db,
    )
    return result
