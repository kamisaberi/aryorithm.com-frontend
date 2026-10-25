"""Unified Hub asset API (catalog, search, inspect, download, revoke).

Implements the cloud-registry surface that spans all five asset types:

    GET    /hub/catalog
    GET    /hub/search
    GET    /hub/categories
    GET    /hub/assets/{asset_type}/{slug}
    GET    /hub/assets/{asset_type}/{slug}/sla
    GET    /hub/assets/{asset_type}/{slug}/readme
    GET    /hub/assets/{asset_type}/{slug}/download
    GET    /hub/assets/{asset_type}/{slug}/signature
    DELETE /hub/assets/{asset_type}/{slug}

The legacy per-type endpoints (``/hub/packages``, ``/hub/pcaps``,
``/hub/datasets``, ``/hub/scenarios``, ``/hub/models``) remain unchanged.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.hub import HubIdentity, get_developer_identity
from app.services import hub_assets as assets
from app.services import hub_service as hub

router = APIRouter(prefix="/hub", tags=["Hub — Unified Assets"])
legacy_download_router = APIRouter(tags=["Hub — Legacy Download Aliases"])


def _bad_type(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


async def _search_response(
    db: AsyncSession,
    *,
    q: str,
    asset_type: str,
    industry: str | None,
    page: int,
    limit: int,
    sort: str,
) -> dict:
    try:
        views = assets.filter_views(
            await assets.all_views(db),
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
    type: str = Query(default="all", description="package | model | dataset | pcap | scenario | all"),
    industry: str | None = Query(default=None, description="sector / industry substring"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="downloads", description="downloads | latest | name | sla"),
    db: AsyncSession = Depends(get_db),
):
    """List every published asset with pagination and filters (public)."""
    return await _search_response(
        db,
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
    type: str = Query(default="all", description="package | model | dataset | pcap | scenario | all"),
    industry: str | None = Query(default=None, description="sector / industry substring"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="downloads", description="downloads | latest | name | sla"),
    db: AsyncSession = Depends(get_db),
):
    """Full-text/fuzzy search across all five asset catalogs (public)."""
    return await _search_response(
        db,
        q=q,
        asset_type=type,
        industry=industry,
        page=page,
        limit=limit,
        sort=sort,
    )


@router.get("/categories")
async def categories(db: AsyncSession = Depends(get_db)):
    """Available categories, industries, protocols and per-type asset counts."""
    return await assets.categories(db)


async def _view_or_404(db: AsyncSession, asset_type: str, slug: str, **kwargs):
    try:
        view = await assets.get_view(db, asset_type, slug, **kwargs)
    except ValueError as exc:
        raise _bad_type(exc)
    if view is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{asset_type}/{slug} not found",
        )
    return view


@router.get("/assets/{asset_type}/{slug}")
async def asset_detail(asset_type: str, slug: str, db: AsyncSession = Depends(get_db)):
    """Full metadata, manifest, author key and signature status (public)."""
    view = await _view_or_404(db, asset_type, slug, with_signature=True)
    return view.detail()


@router.get("/assets/{asset_type}/{slug}/sla")
async def asset_sla(asset_type: str, slug: str, db: AsyncSession = Depends(get_db)):
    """Verified latency SLA and benchmark metrics (public)."""
    view = await _view_or_404(db, asset_type, slug, with_signature=True)
    return {
        "slug": view.slug,
        "asset_type": view.asset_type,
        "verified": view.verified_signature,
        "latency_sla_ns": view.latency_sla_ns or None,
        "latency_display": view.latency_display,
        "compliance": list(view.compliance),
        "benchmark": dict(view.benchmark or {}),
        "published_at": hub.to_zulu(view.published_at),
    }


@router.get("/assets/{asset_type}/{slug}/readme")
async def asset_readme(
    asset_type: str,
    slug: str,
    raw: bool = Query(default=False, description="Return text/markdown instead of JSON"),
    db: AsyncSession = Depends(get_db),
):
    """Rendered Markdown documentation (public)."""
    view = await _view_or_404(db, asset_type, slug)
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
async def asset_signature(asset_type: str, slug: str, db: AsyncSession = Depends(get_db)):
    """Standalone 64-byte Ed25519 signature over the raw asset bytes (public)."""
    view = await _view_or_404(db, asset_type, slug, with_signature=True)
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
async def asset_download(asset_type: str, slug: str, db: AsyncSession = Depends(get_db)):
    """Stream the raw binary with ETag, SHA-256 and Ed25519 headers (public)."""
    view = await _view_or_404(db, asset_type, slug, with_signature=True)
    return await _stream_asset_download(view, db)


async def _stream_asset_download(view: assets.AssetView, db: AsyncSession):
    try:
        blob, path, digest, meta = await assets.resolve_download(db, view)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    headers = {
        "ETag": f'"{digest}"',
        "X-Checksum-SHA256": digest,
        "X-Ed25519-Signature": _signature_hex(meta),
        "X-Ed25519-Public-Key": meta.public_key,
        "X-Asset-Type": view.asset_type,
        "X-Asset-Slug": view.slug,
        "Cache-Control": "public, max-age=300",
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


async def _legacy_download(asset_type: str, filename: str, db: AsyncSession):
    """Resolve a filename/slug from the old client download path."""
    try:
        view = await assets.get_view_by_reference(db, asset_type, filename)
    except ValueError as exc:
        raise _bad_type(exc)
    if view is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{asset_type}/{filename} not found",
        )
    return await _stream_asset_download(view, db)


# Backwards-compatible root download aliases used by sentinel-ctl. The
# official surface is /api/v1/hub/assets/{type}/{slug}/download; these paths
# accept either the published slug or the uploaded filename (extension
# included) and serve the identical bytes and integrity headers.
@legacy_download_router.get("/packages/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/package/{filename}/download", include_in_schema=False)
async def legacy_package_download(filename: str, db: AsyncSession = Depends(get_db)):
    return await _legacy_download("package", filename, db)


@legacy_download_router.get("/models/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/model/{filename}/download", include_in_schema=False)
async def legacy_model_download(filename: str, db: AsyncSession = Depends(get_db)):
    return await _legacy_download("model", filename, db)


@legacy_download_router.get("/datasets/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/dataset/{filename}/download", include_in_schema=False)
async def legacy_dataset_download(filename: str, db: AsyncSession = Depends(get_db)):
    return await _legacy_download("dataset", filename, db)


@legacy_download_router.get("/pcaps/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/pcap/{filename}/download", include_in_schema=False)
async def legacy_pcap_download(filename: str, db: AsyncSession = Depends(get_db)):
    return await _legacy_download("pcap", filename, db)


@legacy_download_router.get("/scenarios/{filename}/download", include_in_schema=True)
@legacy_download_router.get("/scenario/{filename}/download", include_in_schema=False)
async def legacy_scenario_download(filename: str, db: AsyncSession = Depends(get_db)):
    return await _legacy_download("scenario", filename, db)


@router.delete("/assets/{asset_type}/{slug}")
async def revoke_asset(
    asset_type: str,
    slug: str,
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Revoke/yank a published asset from the catalog (owner or admin)."""
    view = await _view_or_404(db, asset_type, slug, allow_deprecated=True)
    owner = view.meta.owner_user_id if view.meta is not None else None
    is_admin = ident.user.role in ("super_admin", "tenant_admin", "admin")
    if owner != ident.user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the asset owner or an admin can revoke this asset",
        )
    await assets.revoke_asset(db, view)
    return {"status": "revoked", "asset_type": view.asset_type, "slug": view.slug}
