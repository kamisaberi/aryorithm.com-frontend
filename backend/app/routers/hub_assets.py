"""Unified Hub artifact API for all seven asset types.

Public catalog/search/detail endpoints remain backwards compatible but are
now auth-aware and support ``scope=all|public|private|shared``.  The same
module exposes workspace-grade forking, lineage, visibility and sharing.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_optional_current_user
from app.models.hub_shares import HubShareLink
from app.models.user import User
from app.routers.hub import HubIdentity, get_developer_identity
from app.schemas.hub_workspace import (
    ForkRequest,
    ShareCreate,
    ShareLinkCreate,
    VisibilityUpdate,
)
from app.services import artifact_sanitize
from app.services import hub_access as access
from app.services import hub_assets as assets
from app.services import hub_forking as forking
from app.services import hub_service as hub
from app.services import hub_sharing as sharing

router = APIRouter(prefix="/hub", tags=["Hub — Unified Assets"])
legacy_download_router = APIRouter(tags=["Hub — Legacy Download Aliases"])


def _bad_type(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _check_scope(scope: str) -> str:
    value = (scope or "all").strip().lower()
    if value not in access.SCOPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scope '{scope}'. Use one of: {', '.join(access.SCOPES)}.",
        )
    return value


async def _scope_views(db: AsyncSession, user: User | None, scope: str):
    views = await assets.all_views(db)
    share_map = await access.share_map_for_user(db, user)
    filtered = access.scope_views(views, user, scope, share_map)
    access.decorate_views(filtered, user, share_map)
    return filtered, share_map


async def _authorized_view(
    db: AsyncSession,
    asset_type: str,
    slug: str,
    *,
    user: User | None = None,
    permission: str = "VIEW",
    share_token: str | None = None,
    allow_deprecated: bool = False,
    with_signature: bool = False,
    hide: bool = True,
):
    try:
        view = await assets.get_view(
            db, asset_type, slug, allow_deprecated=allow_deprecated
        )
    except ValueError as exc:
        raise _bad_type(exc)
    if view is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{asset_type}/{slug} not found",
        )

    share_map = await access.share_map_for_user(db, user) if user is not None else {}
    shares = access.shares_for_view(view, share_map)
    permissions = access.permissions_for(view, user, shares)
    link = None
    if permission.upper() not in permissions and share_token:
        link = await sharing.resolve_link(db, share_token)
        if (
            link is not None
            and link.asset_type == view.asset_type
            and link.slug == view.slug
            and sharing.link_grants(link, permission)
        ):
            permissions = list(
                dict.fromkeys(
                    permissions
                    + sorted(
                        access._PERMISSION_IMPLIES.get(
                            (link.permission or "").upper(), set()
                        )
                    )
                )
            )
        else:
            link = None
    if permission.upper() not in permissions:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND if hide else status.HTTP_403_FORBIDDEN
            ),
            detail=(
                f"{asset_type}/{slug} not found"
                if hide
                else f"{permission.upper()} permission is required for this artifact"
            ),
        )
    view.permissions = permissions
    if with_signature:
        await assets.ensure_asset_signature(db, view)
    return view, link, permissions


async def _search_response(
    db: AsyncSession,
    *,
    user: User | None,
    scope: str,
    q: str,
    asset_type: str,
    industry: str | None,
    page: int,
    limit: int,
    sort: str,
) -> dict:
    try:
        views, _share_map = await _scope_views(db, user, scope)
        views = assets.filter_views(
            views,
            query=q,
            asset_type=asset_type,
            industry=industry,
        )
        ordered = assets.sort_views(views, sort)
    except ValueError as exc:
        raise _bad_type(exc)
    return assets.paginate(ordered, page, limit)


@router.get("/catalog")
async def catalog(
    type: str = Query(default="all", description="package | model | dataset | pcap | scenario | blueprint | appliance | all"),
    industry: str | None = Query(default=None, description="sector / industry substring"),
    scope: str = Query(default="all", description="all | public | private | shared"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="downloads", description="downloads | latest | name | sla"),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Auth-aware catalog with public/private/shared scoping."""
    return await _search_response(
        db,
        user=user,
        scope=_check_scope(scope),
        q="",
        asset_type=type,
        industry=industry,
        page=page,
        limit=limit,
        sort=sort,
    )


@router.get("/search")
async def search(
    q: str = Query(default="", description="Keyword or fuzzy phrase"),
    type: str = Query(default="all", description="package | model | dataset | pcap | scenario | blueprint | appliance | all"),
    industry: str | None = Query(default=None, description="sector / industry substring"),
    scope: str = Query(default="all", description="all | public | private | shared"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="downloads", description="downloads | latest | name | sla"),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fuzzy search across all authorized artifacts."""
    return await _search_response(
        db,
        user=user,
        scope=_check_scope(scope),
        q=q,
        asset_type=type,
        industry=industry,
        page=page,
        limit=limit,
        sort=sort,
    )


@router.get("/categories")
async def categories(
    scope: str = Query(default="all", description="all | public | private | shared"),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Available categories and per-type counts within the selected scope."""
    views, _ = await _scope_views(db, user, _check_scope(scope))
    return await assets.categories(db, views=views)


@router.get("/assets/{asset_type}/{slug}")
async def asset_detail(
    asset_type: str,
    slug: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full metadata, visibility, lineage, permissions and signature status."""
    view, _link, _ = await _authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        share_token=share_token,
        with_signature=True,
    )
    return view.detail()


@router.get("/assets/{asset_type}/{slug}/sla")
async def asset_sla(
    asset_type: str,
    slug: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verified latency SLA and benchmark metrics."""
    view, _link, _ = await _authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        share_token=share_token,
        with_signature=True,
    )
    return {
        "slug": view.slug,
        "asset_type": view.asset_type,
        "verified": view.verified_signature,
        "latency_sla_ns": view.latency_sla_ns or None,
        "latency_display": view.latency_display,
        "compliance": list(view.compliance),
        "benchmark": dict(view.benchmark or {}),
        "published_at": hub.to_zulu(view.published_at),
        "visibility": view.visibility,
        "permissions": list(view.permissions),
    }


@router.get("/assets/{asset_type}/{slug}/readme")
async def asset_readme(
    asset_type: str,
    slug: str,
    raw: bool = Query(default=False, description="Return text/markdown instead of JSON"),
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rendered Markdown documentation."""
    view, _link, _ = await _authorized_view(
        db, asset_type, slug, user=user, share_token=share_token
    )
    markdown = view.readme_markdown or f"# {view.name}\n\n{view.description}\n"
    if raw:
        return Response(content=markdown, media_type="text/markdown; charset=utf-8")
    return {
        "slug": view.slug,
        "asset_type": view.asset_type,
        "name": view.name,
        "version": view.version,
        "format": "markdown",
        "content_markdown": markdown,
    }


def _signature_hex(meta) -> str:
    try:
        return hub.decode_key_material(meta.signature, 64, "signature").hex()
    except ValueError:
        return meta.signature or ""


@router.get("/assets/{asset_type}/{slug}/signature")
async def asset_signature(
    asset_type: str,
    slug: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Standalone 64-byte Ed25519 signature over the raw asset bytes."""
    view, _link, _ = await _authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        share_token=share_token,
        with_signature=True,
    )
    raw, public_key = await assets.signature_bytes(db, view)
    if len(raw) != 64:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Ed25519 signature is recorded for this asset",
        )
    return Response(
        content=raw,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{view.slug}.sig"',
            "Content-Length": str(len(raw)),
            "X-Ed25519-Public-Key": public_key,
            "X-Ed25519-Signature": raw.hex(),
        },
    )


@router.get("/assets/{asset_type}/{slug}/download")
async def asset_download(
    asset_type: str,
    slug: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream the raw binary with integrity headers."""
    view, link, _ = await _authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        share_token=share_token,
        with_signature=True,
    )
    response = await _stream_asset_download(view, db)
    if link is not None:
        await sharing.consume_link(db, link)
    return response


async def _stream_asset_download(view: assets.AssetView, db: AsyncSession):
    try:
        blob, path, digest, meta = await assets.resolve_download(db, view)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    cache_control = (
        "public, max-age=300"
        if view.visibility == "public"
        else "private, no-store"
    )
    headers = {
        "ETag": f'"{digest}"',
        "X-Checksum-SHA256": digest,
        "X-Ed25519-Signature": _signature_hex(meta),
        "X-Ed25519-Public-Key": meta.public_key,
        "X-Asset-Type": view.asset_type,
        "X-Asset-Slug": view.slug,
        "X-Asset-Visibility": view.visibility,
        "Cache-Control": cache_control,
    }
    if blob is not None:
        headers["Content-Disposition"] = f'attachment; filename="{view.file_name}"'
        return Response(content=blob, media_type="application/octet-stream", headers=headers)
    return FileResponse(
        path=str(path),
        media_type="application/octet-stream",
        filename=view.file_name,
        headers=headers,
    )


async def _legacy_download(
    asset_type: str,
    filename: str,
    db: AsyncSession,
    *,
    user: User | None = None,
    share_token: str | None = None,
):
    """Resolve a filename/slug from the old client download path."""
    try:
        found = await assets.get_view_by_reference(db, asset_type, filename)
    except ValueError as exc:
        raise _bad_type(exc)
    if found is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{asset_type}/{filename} not found",
        )
    view, link, _ = await _authorized_view(
        db,
        found.asset_type,
        found.slug,
        user=user,
        share_token=share_token,
        with_signature=True,
    )
    response = await _stream_asset_download(view, db)
    if link is not None:
        await sharing.consume_link(db, link)
    return response


@legacy_download_router.get("/packages/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/package/{filename}/download", include_in_schema=False)
async def legacy_package_download(
    filename: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _legacy_download(
        "package", filename, db, user=user, share_token=share_token
    )


@legacy_download_router.get("/models/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/model/{filename}/download", include_in_schema=False)
async def legacy_model_download(
    filename: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _legacy_download("model", filename, db, user=user, share_token=share_token)


@legacy_download_router.get("/datasets/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/dataset/{filename}/download", include_in_schema=False)
async def legacy_dataset_download(
    filename: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _legacy_download(
        "dataset", filename, db, user=user, share_token=share_token
    )


@legacy_download_router.get("/pcaps/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/pcap/{filename}/download", include_in_schema=False)
async def legacy_pcap_download(
    filename: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _legacy_download("pcap", filename, db, user=user, share_token=share_token)


@legacy_download_router.get("/scenarios/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/scenario/{filename}/download", include_in_schema=False)
async def legacy_scenario_download(
    filename: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _legacy_download(
        "scenario", filename, db, user=user, share_token=share_token
    )


# ---------------------------------------------------------------------------
# delete / fork / lineage
# ---------------------------------------------------------------------------
@router.delete("/assets/{asset_type}/{slug}")
async def revoke_asset(
    asset_type: str,
    slug: str,
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Delete an artifact, preserving bytes as an orphan root when forked."""
    view, _link, permissions = await _authorized_view(
        db,
        asset_type,
        slug,
        user=ident.user,
        permission="VIEW",
        allow_deprecated=True,
        hide=False,
    )
    legacy_admin = (
        view.owner_user_id is None
        and view.owner_tenant_id is None
        and access.is_admin(ident.user)
    )
    if "ADMIN" not in permissions and not legacy_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the artifact owner, an admin, or an ADMIN grantee can delete this artifact",
        )
    if view.asset_type == "appliance" and not access.is_super_admin(ident.user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Aryorithm Authority (super_admin) can delete .aryopack bundles.",
        )
    result = await assets.revoke_asset(db, view)
    return {
        "status": result,
        "asset_type": view.asset_type,
        "slug": view.slug,
        "orphaned_root": bool(view.meta.orphaned_root) if view.meta else False,
        "fork_count": view.fork_count,
    }


@router.post(
    "/assets/{asset_type}/{slug}/fork",
    status_code=status.HTTP_201_CREATED,
)
async def fork_asset(
    asset_type: str,
    slug: str,
    body: ForkRequest | None = None,
    share_token: str | None = Query(default=None),
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Fork an accessible artifact into the caller's private workspace."""
    view, _link, _ = await _authorized_view(
        db,
        asset_type,
        slug,
        user=ident.user,
        permission="FORK",
        share_token=share_token,
    )
    try:
        child = await forking.fork_asset(
            db,
            view,
            user=ident.user,
            new_slug=(body.new_slug if body else None),
        )
    except ValueError as exc:
        code = (
            status.HTTP_409_CONFLICT
            if "already exists" in str(exc)
            else status.HTTP_422_UNPROCESSABLE_CONTENT
        )
        raise HTTPException(status_code=code, detail=str(exc))
    if child is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fork was created but could not be read back",
        )
    access.decorate(child, ident.user)
    return child.detail()


@router.get("/assets/{asset_type}/{slug}/forks")
async def list_asset_forks(
    asset_type: str,
    slug: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List descendants that the caller is allowed to see."""
    view, _link, _ = await _authorized_view(
        db, asset_type, slug, user=user, permission="VIEW", share_token=share_token
    )
    share_map = await access.share_map_for_user(db, user)
    children = await forking.list_forks(db, view)
    children = [
        child
        for child in children
        if access.visible_in_scope(
            child, user, "all", access.shares_for_view(child, share_map)
        )
    ]
    access.decorate_views(children, user, share_map)
    return {
        "asset_type": view.asset_type,
        "slug": view.slug,
        "fork_count": len(children),
        "results": [child.list_item() for child in children],
    }


def _lineage_visible(meta, user, share_map) -> bool:
    visibility = (meta.visibility or "public").lower()
    if visibility == "public":
        return True
    if user is None:
        return False
    if access.is_super_admin(user):
        return True
    if meta.owner_user_id == user.id or meta.tenant_id == user.tenant_id:
        return True
    return bool(share_map.get((meta.asset_type, meta.slug)))


@router.get("/assets/{asset_type}/{slug}/lineage")
async def asset_lineage(
    asset_type: str,
    slug: str,
    share_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full ancestor chain and visible child forks."""
    view, _link, _ = await _authorized_view(
        db, asset_type, slug, user=user, permission="VIEW", share_token=share_token
    )
    payload = await forking.lineage(db, view)
    share_map = await access.share_map_for_user(db, user)
    payload["ancestors"] = [
        ancestor
        for ancestor in payload["ancestors"]
        if _lineage_visible(
            _LineageMeta.from_ref(ancestor), user, share_map
        )
    ]
    payload["children"] = [
        child
        for child in payload["children"]
        if _lineage_visible(
            # child is already a serialized reference; re-check via metadata
            # by looking up the corresponding row through the payload slug.
            _LineageMeta.from_ref(child),
            user,
            share_map,
        )
    ]
    payload["permissions"] = list(view.permissions)
    return payload


class _LineageMeta:
    """Tiny adapter so lineage filtering stays synchronous and allocation-free."""

    __slots__ = ("asset_type", "slug", "visibility", "owner_user_id", "tenant_id")

    def __init__(self, asset_type, slug, visibility, owner_user_id, tenant_id):
        self.asset_type = asset_type
        self.slug = slug
        self.visibility = visibility
        self.owner_user_id = owner_user_id
        self.tenant_id = tenant_id

    @classmethod
    def from_ref(cls, ref: dict):
        return cls(
            ref.get("asset_type", ""),
            ref.get("slug", ""),
            ref.get("visibility", "public"),
            ref.get("owner_user_id"),
            ref.get("owner_tenant_id"),
        )


# ---------------------------------------------------------------------------
# visibility
# ---------------------------------------------------------------------------
@router.put("/assets/{asset_type}/{slug}/visibility")
async def update_visibility(
    asset_type: str,
    slug: str,
    body: VisibilityUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Promote or demote an artifact, validating public PCAP/blueprint safety."""
    view, _link, permissions = await _authorized_view(
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
    if "ADMIN" not in permissions and not legacy_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN permission is required to change artifact visibility",
        )
    if body.visibility == "public" and view.asset_type in ("pcap", "blueprint"):
        try:
            await artifact_sanitize.validate_public_artifact(db, view)
        except artifact_sanitize.SanitizationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "error": "artifact failed public sanitization",
                    "issues": exc.issues,
                },
            )
    meta = await assets._ensure_meta_for_asset(db, view)
    meta.visibility = body.visibility
    if body.visibility == "private":
        meta.yanked = False
    await db.flush()
    access.decorate(view, user)
    return {
        "status": "updated",
        "asset_type": view.asset_type,
        "slug": view.slug,
        "visibility": meta.visibility,
        "permissions": list(view.permissions),
    }


# ---------------------------------------------------------------------------
# sharing
# ---------------------------------------------------------------------------
async def _manage_view(db, asset_type, slug, user, *, allow_deprecated=True):
    view, _link, permissions = await _authorized_view(
        db,
        asset_type,
        slug,
        user=user,
        permission="VIEW",
        allow_deprecated=allow_deprecated,
        hide=False,
    )
    legacy_admin = (
        view.owner_user_id is None
        and view.owner_tenant_id is None
        and access.is_admin(user)
    )
    if "ADMIN" not in permissions and not legacy_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN permission is required to manage sharing for this artifact",
        )
    return view


@router.get("/assets/{asset_type}/{slug}/shares")
async def list_shares(
    asset_type: str,
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = await _manage_view(db, asset_type, slug, user)
    rows = await sharing.list_shares(db, view.asset_type, view.slug)
    return {
        "asset_type": view.asset_type,
        "slug": view.slug,
        "total": len(rows),
        "results": [sharing.public_share(row) for row in rows],
    }


@router.post(
    "/assets/{asset_type}/{slug}/shares",
    status_code=status.HTTP_201_CREATED,
)
async def create_share(
    asset_type: str,
    slug: str,
    body: ShareCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = await _manage_view(db, asset_type, slug, user)
    try:
        row = await sharing.create_share(
            db,
            asset_type=view.asset_type,
            slug=view.slug,
            grantee_type=body.grantee_type,
            grantee_id=body.grantee_id,
            grantee_email=body.grantee_email,
            permission=body.permission,
            expires_at=body.expires_at,
            created_by=user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )
    return sharing.public_share(row)


@router.delete("/assets/{asset_type}/{slug}/shares/{share_id}")
async def delete_share(
    asset_type: str,
    slug: str,
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = await _manage_view(db, asset_type, slug, user)
    deleted = await sharing.delete_share(db, share_id, view.asset_type, view.slug)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share not found"
        )
    return {"status": "deleted", "share_id": share_id}


@router.get("/assets/{asset_type}/{slug}/share-links")
async def list_share_links(
    asset_type: str,
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = await _manage_view(db, asset_type, slug, user)
    rows = list(
        (
            await db.execute(
                select(HubShareLink)
                .where(
                    HubShareLink.asset_type == view.asset_type,
                    HubShareLink.slug == view.slug,
                )
                .order_by(HubShareLink.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return {
        "asset_type": view.asset_type,
        "slug": view.slug,
        "total": len(rows),
        "results": [sharing.public_link(row) for row in rows],
    }


@router.post(
    "/assets/{asset_type}/{slug}/share-links",
    status_code=status.HTTP_201_CREATED,
)
async def create_share_link(
    asset_type: str,
    slug: str,
    body: ShareLinkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = await _manage_view(db, asset_type, slug, user)
    expires_at = body.expires_at
    if expires_at is None and body.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours)
    try:
        row, token, url = await sharing.create_link(
            db,
            asset_type=view.asset_type,
            slug=view.slug,
            permission=body.permission,
            expires_at=expires_at,
            max_uses=body.max_uses,
            created_by=user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )
    payload = sharing.public_link(row, token=token)
    payload["url"] = url
    return payload


@router.delete("/assets/{asset_type}/{slug}/share-links/{link_id}")
async def revoke_share_link(
    asset_type: str,
    slug: str,
    link_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = await _manage_view(db, asset_type, slug, user)
    row = await db.get(HubShareLink, link_id)
    if row is None or row.asset_type != view.asset_type or row.slug != view.slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found"
        )
    row.revoked = True
    await db.flush()
    return {"status": "revoked", "link_id": link_id}


@router.get("/shares/received")
async def received_shares(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Artifacts explicitly shared with the caller's user, tenant, or email."""
    share_map = await access.share_map_for_user(db, user)
    results = []
    for (asset_type, slug), shares in share_map.items():
        item = await assets.get_view(db, asset_type, slug, allow_deprecated=True)
        if item is None:
            continue
        if not access.permissions_for(item, user, shares):
            continue
        access.decorate(item, user, shares)
        payload = item.list_item()
        payload["shares"] = [sharing.public_share(row, user) for row in shares]
        results.append(payload)
    results.sort(key=lambda item: item.get("published_at") or "", reverse=True)
    return {"total": len(results), "results": results}


@router.get("/shares/links/{token}")
async def resolve_share_link(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Validate a signed share link and return its artifact summary."""
    link = await sharing.resolve_link(db, token)
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link is invalid, expired, revoked, or exhausted",
        )
    view = await assets.get_view(db, link.asset_type, link.slug, allow_deprecated=True)
    if view is None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="The shared artifact is no longer available",
        )
    view.permissions = sorted(
        access._PERMISSION_IMPLIES.get((link.permission or "").upper(), set())
    )
    return {
        "valid": True,
        "link": sharing.public_link(link),
        "asset": view.detail(),
        "download_url": f"{view.download_url}?share_token={token}",
    }
