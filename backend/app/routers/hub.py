"""Aryorithm Hub — online feature store / plugin registry.

Mounts the spec paths verbatim (``/plugins``, ``/registry``, ``/sync``,
``/telemetry`` under ``/api/v1``); the ``hub.aryorithm.com`` domain itself
is a deployment concern (DNS / reverse proxy), not a code concern.

Auth: ``Authorization: Bearer <JWT>`` (repo users) or
``Authorization: ApiKey <key>`` (Hub CLI tokens, see ``POST
/registry/tokens``). Publishing needs ``packages:publish`` scope on tokens;
plain JWT callers are treated as developers with full publish rights.

Catalog + versions are global (not per-tenant). Stars and tokens are per-user.
"""

import hashlib
import io
import re
import secrets
from datetime import datetime, timezone
from typing import NamedTuple

import yaml
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.hub import HubApiToken, HubAuthor, HubPlugin, HubPluginVersion, HubStar, SentinelPackage
from app.models.user import User
from app.schemas.hub import (
    AirgapBundleRequest,
    CheckUpdatesOut,
    CheckUpdatesRequest,
    FacetsOut,
    InstallTelemetryIn,
    ManifestOut,
    PluginActiveVersionOut,
    PluginAuthorOut,
    PluginDetailOut,
    PluginItemOut,
    PluginMetricsOut,
    PublishOut,
    ReadmeOut,
    SecurityOut,
    SentinelPackageOut,
    StarOut,
    TokenCreateOut,
    TokenCreateRequest,
    TokenOut,
    UpdateAvailableOut,
    ValidateOkOut,
    ValidateRequest,
    VersionDetailOut,
    VersionHistoryOut,
    VersionSummaryOut,
    YankOut,
    YankRequest,
    PaginatedPluginsOut,
)
from app.services import hub_service as hub

plugins_router = APIRouter(prefix="/plugins", tags=["Hub — Catalog"])
registry_router = APIRouter(prefix="/registry", tags=["Hub — Registry"])
sync_router = APIRouter(prefix="/sync", tags=["Hub — Sync"])
telemetry_router = APIRouter(prefix="/telemetry", tags=["Hub — Telemetry"])
packages_router = APIRouter(prefix="/hub/packages", tags=["Hub — Sentinel Packages"])

_CAP_JUSTIFICATIONS = {
    "CAP_NET_ADMIN": "Required to attach eBPF/XDP driver hooks for wire-speed drop.",
    "CAP_SYS_NICE": "Required for real-time scheduling of the fast-path threads.",
    "CAP_BPF": "Required to load and pin verified eBPF programs and maps.",
    "CAP_SYS_ADMIN": "Required for privileged device and mount operations.",
}


# ---------------------------------------------------------------------------
# identity (Bearer JWT or ApiKey CLI token)
# ---------------------------------------------------------------------------
class HubIdentity(NamedTuple):
    user: User
    token: HubApiToken | None  # None => plain JWT caller (full developer rights)


async def get_hub_identity(request: Request, db: AsyncSession = Depends(get_db)) -> HubIdentity:
    """Resolve the caller from either supported Authorization scheme."""
    from app.utils.security import decode_token

    raw = request.headers.get("authorization", "")
    scheme, _, credential = raw.partition(" ")
    credential = credential.strip()
    if scheme == "Bearer" and credential:
        user_id = decode_token(credential, expected_type="access")
        if user_id:
            user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            if user is not None and user.is_active:
                return HubIdentity(user=user, token=None)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if scheme == "ApiKey" and credential:
        digest = hashlib.sha256(credential.encode()).hexdigest()
        token = (
            await db.execute(select(HubApiToken).where(HubApiToken.key_hash == digest))
        ).scalar_one_or_none()
        now = datetime.now(timezone.utc)
        exp = token.expires_at if token else None
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if token is None or token.revoked or (exp is not None and exp < now):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired API token")
        user = await db.get(User, token.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token owner inactive")
        token.last_used = now
        await db.flush()
        return HubIdentity(user=user, token=token)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated (expected 'Bearer <JWT>' or 'ApiKey <key>')",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_publish_scope(ident: HubIdentity) -> None:
    if ident.token is not None and "packages:publish" not in (ident.token.scopes or []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token lacks packages:publish scope")


# ---------------------------------------------------------------------------
# shared builders
# ---------------------------------------------------------------------------
def _latest_version(versions: list[HubPluginVersion]) -> HubPluginVersion | None:
    live = [v for v in versions if not v.yanked]
    if not live:
        return None
    return max(live, key=lambda v: hub.semver_key(v.version))


async def _versions_for(db: AsyncSession, plugin_id: str) -> list[HubPluginVersion]:
    return list(
        (await db.execute(select(HubPluginVersion).where(HubPluginVersion.plugin_id == plugin_id)))
        .scalars()
        .all()
    )


def _download_url(slug: str, version: str) -> str:
    return f"/api/v1/plugins/{slug}/versions/{version}/download"


def _active_version_out(plugin: HubPlugin, row: HubPluginVersion | None) -> PluginActiveVersionOut | None:
    if row is None:
        return None
    return PluginActiveVersionOut(
        version=row.version,
        release_date=hub.to_zulu(row.release_date),
        package_size_bytes=row.package_size_bytes,
        sha256=row.sha256,
        min_sentinel_version=row.min_sentinel_version,
        download_url=_download_url(plugin.slug, row.version),
    )


def _item_out(plugin: HubPlugin, author: HubAuthor, latest: HubPluginVersion | None) -> PluginItemOut:
    return PluginItemOut(
        id=plugin.public_id,
        slug=plugin.slug,
        title=plugin.title,
        short_description=plugin.short_description,
        category=plugin.category,
        runtime=plugin.runtime,
        supported_silicon=list(plugin.supported_silicon or []),
        verification_tier=plugin.verification_tier,
        author=PluginAuthorOut(
            name=author.name,
            avatar_url=author.avatar_url,
            verified=author.verified,
            github_handle=author.github_handle,
            website=author.website,
        ),
        metrics=PluginMetricsOut(
            install_count=plugin.install_count,
            stars=plugin.stars_count,
            fast_path_latency_us=plugin.fast_path_latency_us,
        ),
        active_version=_active_version_out(plugin, latest),
        ports=list(plugin.ports or []),
        tags=list(plugin.tags or []),
    )


def _manifest_id(manifest_yaml: str, fallback_slug: str) -> str:
    try:
        import yaml as _yaml

        doc = _yaml.safe_load(manifest_yaml or "") or {}
        mid = ((doc.get("metadata") or {}).get("id") or "").strip()
        if mid:
            return mid
    except Exception:
        pass
    return f"community/{fallback_slug}"


def _detail_out(
    plugin: HubPlugin, author: HubAuthor, latest: HubPluginVersion | None
) -> PluginDetailOut:
    item = _item_out(plugin, author, latest)
    manifest_id = _manifest_id(latest.manifest_yaml if latest else "", plugin.slug)
    version = latest.version if latest else ""
    return PluginDetailOut(
        **item.model_dump(),
        security_envelope=dict((latest.security_envelope if latest else {}) or {}),
        install_commands={
            "sentinel_cli": f"sentinel plugin install {manifest_id}:{version}",
            "nexus_cli": f"nexus-ctl plugin deploy {manifest_id}:{version} --fleet-wide",
        },
        repository_url=plugin.repository_url,
    )


async def _get_plugin_or_404(db: AsyncSession, slug: str) -> HubPlugin:
    await hub.ensure_seed(db)
    row = (await db.execute(select(HubPlugin).where(HubPlugin.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plugin '{slug}' not found")
    return row


async def _get_author(db: AsyncSession, author_id: str) -> HubAuthor:
    author = await db.get(HubAuthor, author_id)
    if author is None:  # defensive; FK should prevent this
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Plugin author missing")
    return author


async def _get_version_or_404(db: AsyncSession, plugin: HubPlugin, version: str) -> HubPluginVersion:
    row = (
        await db.execute(
            select(HubPluginVersion).where(
                HubPluginVersion.plugin_id == plugin.id, HubPluginVersion.version == version
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version '{version}' of '{plugin.slug}' not found",
        )
    return row


def _spec_error(error_code: str, message: str, details: list[dict] | None = None) -> JSONResponse:
    """RFC 7807-style error body exactly as the Hub spec defines it."""
    return JSONResponse(
        status_code=422,
        content={
            "error_code": error_code,
            "message": message,
            "status_code": 422,
            "timestamp_ns": hub.timestamp_ns(),
            "details": details or [],
        },
    )


async def _author_for_identity(db: AsyncSession, ident: HubIdentity) -> HubAuthor:
    row = (
        await db.execute(select(HubAuthor).where(HubAuthor.user_id == ident.user.id))
    ).scalar_one_or_none()
    if row is not None:
        return row
    row = HubAuthor(name=ident.user.name or ident.user.email, user_id=ident.user.id)
    db.add(row)
    await db.flush()
    return row


def _artifact_bytes(plugin: HubPlugin, row: HubPluginVersion) -> bytes:
    """On-disk bytes, or the deterministic seed stand-in for seeded rows."""
    if row.artifact_path:
        try:
            with open(row.artifact_path, "rb") as f:
                return f.read()
        except OSError:
            pass
    return hub.seed_artifact(plugin.slug, row.version, plugin.runtime)


# ---------------------------------------------------------------------------
# catalog
# ---------------------------------------------------------------------------
@plugins_router.get("", response_model=PaginatedPluginsOut)
@plugins_router.get("/", response_model=PaginatedPluginsOut, include_in_schema=False)
async def search_plugins(
    q: str = Query(default=""),
    category: str = Query(default="all"),
    runtime: str = Query(default="all"),
    silicon: str = Query(default="all"),
    tier: str = Query(default="all"),
    sort: str = Query(default="popular"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Faceted catalog search (public)."""
    await hub.ensure_seed(db)
    for name, value, vocab in (
        ("category", category, ("all", *hub.CATEGORIES)),
        ("runtime", runtime, ("all", *hub.RUNTIMES)),
        ("silicon", silicon, ("all", *hub.SILICON_TARGETS)),
        ("tier", tier, ("all", *hub.VERIFICATION_TIERS)),
    ):
        if value not in vocab:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown {name} '{value}'")
    if sort not in hub.SORTS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown sort '{sort}'")

    stmt = select(HubPlugin)
    if category != "all":
        stmt = stmt.where(HubPlugin.category == category)
    if runtime != "all":
        stmt = stmt.where(HubPlugin.runtime == runtime)
    if tier != "all":
        stmt = stmt.where(HubPlugin.verification_tier == tier)
    if q.strip():
        needle = f"%{hub.like_escape(q.strip().lower())}%"
        stmt = stmt.where(HubPlugin.search_text.like(needle, escape="\\"))
    plugins = list((await db.execute(stmt)).scalars().all())
    if silicon != "all":
        plugins = [p for p in plugins if silicon in (p.supported_silicon or [])]

    if sort == "popular":
        plugins.sort(key=lambda p: (-p.install_count, p.title.lower()))
    elif sort == "recent":
        plugins.sort(key=lambda p: (p.created_at is None, p.created_at), reverse=True)
    elif sort == "latency":
        plugins.sort(key=lambda p: (p.fast_path_latency_us is None, p.fast_path_latency_us or 0.0))
    else:  # alpha
        plugins.sort(key=lambda p: p.title.lower())

    total = len(plugins)
    total_pages = max((total + limit - 1) // limit, 1)
    page = min(page, total_pages)
    items = []
    for plugin in plugins[(page - 1) * limit : page * limit]:
        author = await _get_author(db, plugin.author_id)
        items.append(_item_out(plugin, author, _latest_version(await _versions_for(db, plugin.id))))
    return PaginatedPluginsOut(total=total, page=page, limit=limit, total_pages=total_pages, items=items)


@plugins_router.get("/featured", response_model=list[PluginItemOut])
async def featured_plugins(db: AsyncSession = Depends(get_db)):
    """Spotlight carousel (public) — up to 4 flagged plugins."""
    await hub.ensure_seed(db)
    rows = list(
        (await db.execute(select(HubPlugin).where(HubPlugin.is_featured.is_(True)).limit(4)))
        .scalars()
        .all()
    )
    out = []
    for plugin in rows:
        author = await _get_author(db, plugin.author_id)
        out.append(_item_out(plugin, author, _latest_version(await _versions_for(db, plugin.id))))
    return out


@plugins_router.get("/facets", response_model=FacetsOut)
async def plugin_facets(db: AsyncSession = Depends(get_db)):
    """Sidebar aggregate counts (public)."""
    await hub.ensure_seed(db)
    facets = FacetsOut()
    for column, bucket in (
        (HubPlugin.category, facets.categories),
        (HubPlugin.runtime, facets.runtimes),
        (HubPlugin.verification_tier, facets.verification_tiers),
    ):
        for value, count in (await db.execute(select(column, func.count()).group_by(column))).all():
            bucket[value] = count
    for (silicon,) in (await db.execute(select(HubPlugin.supported_silicon))).all():
        for target in silicon or []:
            facets.silicon_targets[target] = facets.silicon_targets.get(target, 0) + 1
    return facets


@plugins_router.get("/{slug}", response_model=PluginDetailOut)
async def plugin_detail(slug: str, db: AsyncSession = Depends(get_db)):
    """Comprehensive extension detail (public)."""
    await hub.ensure_seed(db)
    plugin = await _get_plugin_or_404(db, slug)
    author = await _get_author(db, plugin.author_id)
    return _detail_out(plugin, author, _latest_version(await _versions_for(db, plugin.id)))


@plugins_router.get("/{slug}/readme", response_model=ReadmeOut)
async def plugin_readme(
    slug: str, version: str | None = Query(default=None), db: AsyncSession = Depends(get_db)
):
    """Markdown documentation (public, defaults to latest)."""
    plugin = await _get_plugin_or_404(db, slug)
    versions = await _versions_for(db, plugin.id)
    row = None
    if version:
        row = next((v for v in versions if v.version == version), None)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version '{version}' not found")
    else:
        row = _latest_version(versions)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No versions published yet")
    return ReadmeOut(version=row.version, content_markdown=row.readme_markdown)


@plugins_router.get("/{slug}/manifest", response_model=ManifestOut)
async def plugin_manifest(
    slug: str, version: str | None = Query(default=None), db: AsyncSession = Depends(get_db)
):
    """Raw splugin.yaml + parsed JSON (public, defaults to latest)."""
    plugin = await _get_plugin_or_404(db, slug)
    versions = await _versions_for(db, plugin.id)
    row = None
    if version:
        row = next((v for v in versions if v.version == version), None)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version '{version}' not found")
    else:
        row = _latest_version(versions)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No versions published yet")
    try:
        parsed = yaml.safe_load(row.manifest_yaml or "") or {}
    except yaml.YAMLError:
        parsed = {}
    return ManifestOut(version=row.version, raw_yaml=row.manifest_yaml, parsed_json=parsed)


@plugins_router.get("/{slug}/versions", response_model=VersionHistoryOut)
async def version_history(slug: str, db: AsyncSession = Depends(get_db)):
    """Version history & changelogs (public, newest first)."""
    plugin = await _get_plugin_or_404(db, slug)
    versions = sorted(await _versions_for(db, plugin.id), key=lambda v: hub.semver_key(v.version), reverse=True)
    return VersionHistoryOut(
        slug=slug,
        versions=[
            VersionSummaryOut(
                version=v.version,
                release_date=hub.to_zulu(v.release_date),
                sha256=v.sha256,
                changelog=v.changelog,
                yanked=v.yanked,
            )
            for v in versions
        ],
    )


@plugins_router.get("/{slug}/versions/{version}", response_model=VersionDetailOut)
async def version_detail(slug: str, version: str, db: AsyncSession = Depends(get_db)):
    """Version-specific metadata & dependencies (public)."""
    plugin = await _get_plugin_or_404(db, slug)
    row = await _get_version_or_404(db, plugin, version)
    return VersionDetailOut(
        slug=slug,
        version=row.version,
        release_date=hub.to_zulu(row.release_date),
        sha256=row.sha256,
        min_sentinel_version=row.min_sentinel_version,
        package_size_bytes=row.package_size_bytes,
        changelog=row.changelog,
        yanked=row.yanked,
        dependencies=list(row.dependencies or []),
        download_url=_download_url(slug, row.version),
    )


@plugins_router.get("/{slug}/versions/{version}/download")
async def download_version(slug: str, version: str, db: AsyncSession = Depends(get_db)):
    """Stream the signed .splugin package (yanked stays available for history)."""
    plugin = await _get_plugin_or_404(db, slug)
    row = await _get_version_or_404(db, plugin, version)
    data = _artifact_bytes(plugin, row)

    def _chunks():
        for off in range(0, len(data), 65536):
            yield data[off : off + 65536]

    return StreamingResponse(
        _chunks(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{slug}-{version}.splugin"',
            "X-Checksum-SHA256": row.sha256,
            "X-Signature-Ed25519": row.signature,
        },
    )


@plugins_router.get("/{slug}/versions/{version}/security", response_model=SecurityOut)
async def version_security(slug: str, version: str, db: AsyncSession = Depends(get_db)):
    """Audit privileges, eBPF maps and provenance (public)."""
    plugin = await _get_plugin_or_404(db, slug)
    row = await _get_version_or_404(db, plugin, version)
    author = await _get_author(db, plugin.author_id)
    env = dict(row.security_envelope or {})
    caps = [
        {"name": name, "justification": _CAP_JUSTIFICATIONS.get(name, f"Declared by {author.name} in splugin.yaml.")}
        for name in (env.get("required_capabilities") or [])
    ]
    return SecurityOut(
        slug=slug,
        version=row.version,
        provenance={
            "signer_public_key": author.public_key,
            "signature_algorithm": "Ed25519",
            "verified_by_aryorithm": bool(author.verified),
            "build_reproducibility": "UNVERIFIED",
        },
        runtime_privileges={
            "linux_capabilities": caps,
            "ebpf_maps_requested": env.get("ebpf_maps_requested") or [],
            "zero_cloud_egress_verified": not env.get("network_egress_allowed", False),
            "max_memory_allocated_mb": env.get("max_memory_mb", 32),
            "tpm_compatibility": env.get("tpm_compatibility") or [],
        },
    )


@plugins_router.post("/{slug}/star", response_model=StarOut)
async def toggle_star(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Star / unstar toggle (JWT users)."""
    plugin = await _get_plugin_or_404(db, slug)
    existing = (
        await db.execute(select(HubStar).where(HubStar.plugin_id == plugin.id, HubStar.user_id == user.id))
    ).scalar_one_or_none()
    if existing is None:
        db.add(HubStar(plugin_id=plugin.id, user_id=user.id))
        plugin.stars_count += 1
        starred = True
    else:
        await db.delete(existing)
        plugin.stars_count = max(plugin.stars_count - 1, 0)
        starred = False
    await db.flush()
    return StarOut(starred=starred, total_stars=plugin.stars_count)


# ---------------------------------------------------------------------------
# registry (publish / validate / yank / tokens)
# ---------------------------------------------------------------------------
def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug or f"plugin-{secrets.token_hex(3)}"


@registry_router.post("/validate")
async def validate_manifest(body: ValidateRequest):
    """Pre-flight splugin.yaml linter — 200 when valid, spec-shaped 422 when not."""
    result = hub.lint_manifest(body.manifest_yaml)
    if result["valid"]:
        return JSONResponse(
            status_code=200,
            content={
                "valid": True,
                "warnings": result["warnings"],
                "parsed_metadata": result["parsed_metadata"],
            },
        )
    return JSONResponse(
        status_code=422,
        content={
            "valid": False,
            "errors": [{"field": e["field"], "message": e["message"]} for e in result["errors"]],
        },
    )


@registry_router.post("/publish", response_model=PublishOut, status_code=status.HTTP_201_CREATED)
async def publish_plugin(
    package_file: UploadFile = File(...),
    manifest_file: UploadFile = File(...),
    signature_file: UploadFile = File(...),
    title: str | None = Form(None),
    short_description: str | None = Form(None),
    category: str | None = Form(None),
    tags: str | None = Form(None, description="Comma-separated"),
    ports: str | None = Form(None, description="Comma-separated TCP/UDP ports"),
    silicon: str | None = Form(None, description="Comma-separated silicon targets"),
    min_sentinel_version: str = Form(">= 2.0.0"),
    changelog: str = Form(""),
    readme_markdown: str = Form(""),
    security_update: bool = Form(False),
    author_public_key: str | None = Form(None, description="Enrolled on first publish if the author has none yet"),
    ident: HubIdentity = Depends(get_hub_identity),
    db: AsyncSession = Depends(get_db),
):
    """Upload, verify & publish a .splugin bundle (JWT or ApiKey+publish scope)."""
    require_publish_scope(ident)

    package_bytes = await package_file.read()
    manifest_raw = (await manifest_file.read()).decode("utf-8", errors="replace")
    signature_raw = (await signature_file.read()).decode("utf-8", errors="replace").strip()
    if len(package_bytes) > settings.HUB_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Package exceeds HUB_MAX_UPLOAD_BYTES ({settings.HUB_MAX_UPLOAD_BYTES})",
        )
    if not package_bytes:
        return _spec_error("PLUGIN_EMPTY_PACKAGE", "package_file is empty.", [{"field": "package_file", "issue": "Empty upload"}])

    result = hub.lint_manifest(manifest_raw)
    if not result["valid"]:
        return JSONResponse(
            status_code=422,
            content={
                "error_code": "PLUGIN_MANIFEST_INVALID",
                "message": result["errors"][0]["message"],
                "status_code": 422,
                "timestamp_ns": hub.timestamp_ns(),
                "details": [{"field": e["field"], "issue": e["message"]} for e in result["errors"]],
            },
        )
    meta = result["parsed_metadata"]
    runtime = meta["runtime"]
    # Lightweight arch assertion (magic bytes) instead of a sandboxed runner.
    magic_ok = (
        (runtime == "NATIVE_CPP20" and package_bytes[:4] == b"\x7fELF")
        or (runtime == "WASM_SANDBOX" and package_bytes[:4] == b"\x00asm")
        or runtime in ("LUAJIT", "ONNX_NEURAL_WEIGHTS")
    )
    if not magic_ok:
        return _spec_error(
            "PLUGIN_ARCH_MISMATCH",
            f"Package magic does not match runtime {runtime} (expected ELF or Wasm header).",
            [{"field": "package_file", "issue": "Architecture mismatch"}],
        )

    author = await _author_for_identity(db, ident)
    presented_key = (author_public_key or "").strip()
    if author.public_key and presented_key and presented_key != author.public_key:
        return _spec_error(
            "PLUGIN_SIGNER_MISMATCH",
            "Presented public key does not match the author's enrolled key.",
            [{"field": "author_public_key", "issue": "Key mismatch"}],
        )
    if not author.public_key:
        if not presented_key:
            return _spec_error(
                "PLUGIN_SIGNER_UNKNOWN",
                "No enrolled public key for this author — resubmit with author_public_key once to enroll it.",
                [{"field": "author_public_key", "issue": "Missing enrolled key"}],
            )
        try:
            hub.decode_key_material(presented_key, 32, "author public key")
        except ValueError as exc:
            return _spec_error("PLUGIN_SIGNER_UNKNOWN", str(exc), [{"field": "author_public_key", "issue": "Undecodable key"}])
        author.public_key = presented_key
    if not hub.verify_ed25519(author.public_key, signature_raw, package_bytes):
        return _spec_error(
            "PLUGIN_SIGNATURE_INVALID",
            "Ed25519 signature does not verify against the author's enrolled public key.",
            [{"field": "signature_file", "issue": "Bad signature"}],
        )

    try:
        manifest_doc = yaml.safe_load(manifest_raw) or {}
    except yaml.YAMLError:  # unreachable (lint passed) — defensive
        manifest_doc = {}
    manifest_meta = manifest_doc.get("metadata") or {}
    manifest_net = manifest_doc.get("network") or {}
    manifest_sil = manifest_doc.get("silicon") or {}
    manifest_sec = manifest_doc.get("security") or {}

    slug = _slugify(str(meta["id"]).split("/")[-1])
    plugin = (await db.execute(select(HubPlugin).where(HubPlugin.slug == slug))).scalar_one_or_none()
    if plugin is not None and plugin.author_id != author.id:
        requester_is_admin = ident.user.role in ("super_admin", "tenant_admin", "admin")
        if not requester_is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Slug owned by another author")

    version = meta["version"]
    if plugin is not None:
        dup = (
            await db.execute(
                select(HubPluginVersion).where(HubPluginVersion.plugin_id == plugin.id, HubPluginVersion.version == version)
            )
        ).scalar_one_or_none()
        if dup is not None and not dup.yanked:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Version {version} already published")

    form_tags = [t.strip() for t in (tags or "").split(",") if t.strip()]
    manifest_tags = [str(t) for t in (manifest_meta.get("tags") or [])]
    form_ports: list[int] = []
    for chunk in (ports or "").split(","):
        chunk = chunk.strip()
        if chunk:
            try:
                form_ports.append(int(chunk))
            except ValueError:
                return _spec_error("PLUGIN_MANIFEST_INVALID", f"Form port {chunk!r} is not an integer.",
                                   [{"field": "ports", "issue": "Not an integer"}])
    manifest_ports = [p for p in (manifest_net.get("default_ports") or []) if isinstance(p, int)]
    form_silicon = [s.strip() for s in (silicon or "").split(",") if s.strip()]
    manifest_silicon = [str(s) for s in (manifest_sil.get("supported") or [])]
    supported = manifest_silicon or form_silicon or ["UNIVERSAL"]
    bad_silicon = [s for s in supported if s not in hub.SILICON_TARGETS]
    if bad_silicon:
        return _spec_error("PLUGIN_MANIFEST_INVALID", f"Unknown silicon target(s): {', '.join(bad_silicon)}.",
                           [{"field": "silicon", "issue": "Unknown target"}])
    chosen_category = (manifest_doc.get("category") or category or "industrial-ot").strip()
    if chosen_category not in hub.CATEGORIES:
        return _spec_error("PLUGIN_MANIFEST_INVALID", f"Unknown category '{chosen_category}'.",
                           [{"field": "category", "issue": "Unknown category"}])
    resolved_title = str(manifest_meta.get("title") or (title or "")).strip()
    if not resolved_title:
        return _spec_error("PLUGIN_MANIFEST_INVALID", "metadata.title (or form field 'title') is required to list the plugin.",
                           [{"field": "metadata.title", "issue": "Missing required field"}])
    resolved_desc = str(manifest_meta.get("description") or (short_description or "")).strip()

    if plugin is None:
        plugin = HubPlugin(
            public_id=hub.new_public_id(),
            slug=slug,
            title=resolved_title,
            short_description=resolved_desc,
            category=chosen_category,
            runtime=runtime,
            supported_silicon=supported,
            verification_tier="COMMUNITY_VERIFIED",
            author_id=author.id,
            ports=sorted(set(manifest_ports + form_ports)),
            tags=sorted(set(manifest_tags + form_tags)),
            mitre_ids=[str(m) for m in (manifest_doc.get("mitre_ids") or [])],
            repository_url=str(manifest_meta.get("repository") or ""),
            search_text=hub.build_search_text(resolved_title, resolved_desc, manifest_tags + form_tags, manifest_doc.get("mitre_ids") or []),
        )
        db.add(plugin)
        await db.flush()
    else:
        plugin.title = resolved_title
        plugin.short_description = resolved_desc
        plugin.category = chosen_category
        plugin.runtime = runtime
        plugin.supported_silicon = supported
        plugin.ports = sorted(set(manifest_ports + form_ports))
        plugin.tags = sorted(set(manifest_tags + form_tags))
        plugin.search_text = hub.build_search_text(resolved_title, resolved_desc, plugin.tags, plugin.mitre_ids)

    digest = hub.sha256_hex(package_bytes)
    try:
        sig_hex = hub.decode_key_material(signature_raw, 64, "signature").hex()
    except ValueError:
        sig_hex = signature_raw
    vault = settings.HUB_PACKAGE_DIR
    import os as _os

    artifact_dir = _os.path.join(vault, author.id[:8], slug)
    _os.makedirs(artifact_dir, exist_ok=True)
    artifact_path = _os.path.join(artifact_dir, f"{version}.splugin")
    with open(artifact_path, "wb") as f:
        f.write(package_bytes)
    with open(artifact_path + ".manifest.yaml", "w", encoding="utf-8") as f:
        f.write(manifest_raw)

    capabilities = manifest_doc.get("capabilities") or []
    ebpf = manifest_doc.get("ebpf") or {}
    row = HubPluginVersion(
        plugin_id=plugin.id,
        version=version,
        changelog=changelog,
        release_date=hub.utcnow(),
        security_update=bool(security_update),
        sha256=digest,
        signature=sig_hex,
        package_size_bytes=len(package_bytes),
        min_sentinel_version=min_sentinel_version,
        manifest_yaml=manifest_raw,
        readme_markdown=readme_markdown,
        security_envelope={
            "requires_ebpf": bool(ebpf.get("required", runtime == "NATIVE_CPP20")),
            "required_capabilities": [str(c) for c in capabilities],
            "requires_tpm_attestation": bool(manifest_sec.get("tpm_attestation", False)),
            "network_egress_allowed": bool(manifest_net.get("egress_allowed", False)),
            "max_memory_mb": manifest_sec.get("max_memory_mb", 32),
            "ebpf_maps_requested": list(ebpf.get("maps") or []),
            "tpm_compatibility": list(manifest_sec.get("tpm_compatibility") or []),
        },
        dependencies=list(manifest_doc.get("dependencies") or []),
        artifact_path=artifact_path,
    )
    # A re-publish over a yanked version un-yanks it.
    yanked_row = (
        await db.execute(
            select(HubPluginVersion).where(HubPluginVersion.plugin_id == plugin.id, HubPluginVersion.version == version)
        )
    ).scalar_one_or_none()
    if yanked_row is not None:
        await db.delete(yanked_row)
        await db.flush()
    db.add(row)
    await db.flush()

    manifest_id = _manifest_id(manifest_raw, slug)
    return JSONResponse(
        status_code=201,
        content={
            "status": "PUBLISHED",
            "id": manifest_id,
            "version": version,
            "sha256": digest,
            "hub_url": f"{settings.HUB_PUBLIC_BASE}/plugins/{slug}",
            "install_command": f"sentinel plugin install {manifest_id}:{version}",
        },
    )


@registry_router.delete("/{slug}/versions/{version}", response_model=YankOut)
async def yank_version(
    slug: str,
    version: str,
    body: YankRequest,
    ident: HubIdentity = Depends(get_hub_identity),
    db: AsyncSession = Depends(get_db),
):
    """Deprecate / yank a version (author or admin). Fresh installs stop; history stays downloadable."""
    require_publish_scope(ident)
    plugin = await _get_plugin_or_404(db, slug)
    requester_is_admin = ident.user.role in ("super_admin", "tenant_admin", "admin")
    if plugin.author_id != (await _author_for_identity(db, ident)).id and not requester_is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author or an admin can yank versions")
    row = await _get_version_or_404(db, plugin, version)
    row.yanked = True
    row.yank_reason = body.reason
    row.advisory_notes = body.advisory_notes
    await db.flush()
    return YankOut(slug=slug, version=version, yanked=True)


@registry_router.post("/tokens", response_model=TokenCreateOut, status_code=status.HTTP_201_CREATED)
async def create_cli_token(
    body: TokenCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mint a persistent CLI publish token (full key shown once)."""
    raw = hub.new_api_key()
    now = datetime.now(timezone.utc)
    expires = None
    if body.expires_in_days is not None:
        from datetime import timedelta

        expires = now + timedelta(days=max(int(body.expires_in_days), 1))
    row = HubApiToken(
        token_id=hub.new_token_id(),
        name=body.name,
        key_prefix=raw[:16],
        key_hash=hashlib.sha256(raw.encode()).hexdigest(),
        scopes=list(body.scopes or []),
        user_id=user.id,
        expires_at=expires,
    )
    # token_id collisions are ~2^-16 but cheap to guard all the same.
    for _ in range(3):
        clash = (await db.execute(select(HubApiToken).where(HubApiToken.token_id == row.token_id))).scalar_one_or_none()
        if clash is None:
            break
        row.token_id = hub.new_token_id()
    db.add(row)
    await db.flush()
    return TokenCreateOut(token_id=row.token_id, name=row.name, api_key=raw, created_at=hub.to_zulu(row.created_at))


@registry_router.get("/tokens", response_model=list[TokenOut])
async def list_cli_tokens(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List the caller's CLI tokens (secret keys never returned)."""
    rows = list(
        (await db.execute(select(HubApiToken).where(HubApiToken.user_id == user.id).order_by(HubApiToken.created_at.desc())))
        .scalars()
        .all()
    )
    return [_token_out(r) for r in rows]


def _token_out(row: HubApiToken) -> TokenOut:
    return TokenOut(
        token_id=row.token_id,
        name=row.name,
        key_prefix=row.key_prefix,
        scopes=list(row.scopes or []),
        expires_at=hub.to_zulu(row.expires_at) if row.expires_at else None,
        revoked=row.revoked,
        last_used=hub.to_zulu(row.last_used) if row.last_used else None,
        created_at=hub.to_zulu(row.created_at) if row.created_at else None,
    )


@registry_router.delete("/tokens/{token_id}", response_model=TokenOut)
async def revoke_cli_token(
    token_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Revoke a CLI token (owner or admin)."""
    row = (
        await db.execute(select(HubApiToken).where(HubApiToken.token_id == token_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    requester_is_admin = user.role in ("super_admin", "tenant_admin", "admin")
    if row.user_id != user.id and not requester_is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your token")
    row.revoked = True
    await db.flush()
    return _token_out(row)


# ---------------------------------------------------------------------------
# sync + telemetry (edge clients)
# ---------------------------------------------------------------------------
@sync_router.post("/check-updates", response_model=CheckUpdatesOut)
async def check_updates(
    body: CheckUpdatesRequest,
    x_hub_client: str | None = Header(default=None, alias="X-Hub-Client"),
    db: AsyncSession = Depends(get_db),
):
    """Bulk update check across installed packages (public, edge polling)."""
    _ = x_hub_client  # accepted per spec §1.1 (telemetry only, unenforced)
    await hub.ensure_seed(db)
    out: list[UpdateAvailableOut] = []
    for item in body.installed_plugins:
        plugin = (await db.execute(select(HubPlugin).where(HubPlugin.slug == item.slug))).scalar_one_or_none()
        if plugin is None:
            continue
        versions = await _versions_for(db, plugin.id)
        latest = _latest_version(versions)
        if latest is None or not hub.is_newer(latest.version, item.current_version):
            continue
        critical = any(
            v.security_update
            and hub.is_newer(v.version, item.current_version)
            and not hub.is_newer(v.version, latest.version)
            for v in versions
        )
        out.append(
            UpdateAvailableOut(
                slug=item.slug,
                current_version=item.current_version,
                latest_version=latest.version,
                critical_security_update=critical,
                sha256=latest.sha256,
                download_url=_download_url(item.slug, latest.version),
            )
        )
    return CheckUpdatesOut(updates_available=out)


@sync_router.post("/airgap-bundle")
async def airgap_bundle(
    body: AirgapBundleRequest,
    x_hub_client: str | None = Header(default=None, alias="X-Hub-Client"),
    db: AsyncSession = Depends(get_db),
):
    """Offline sneakernet archive (.tar.gz) for air-gapped sites."""
    _ = x_hub_client
    if not body.requested_plugins:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="requested_plugins is empty")
    if len(body.requested_plugins) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At most 100 plugins per bundle")
    entries = []
    for item in body.requested_plugins:
        plugin = (await db.execute(select(HubPlugin).where(HubPlugin.slug == item.slug))).scalar_one_or_none()
        if plugin is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plugin '{item.slug}' not found")
        row = await _get_version_or_404(db, plugin, item.version)
        if row.yanked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Version {item.version} of '{item.slug}' is yanked and excluded from fresh bundles",
            )
        entries.append(
            {
                "slug": item.slug,
                "version": row.version,
                "package_bytes": _artifact_bytes(plugin, row),
                "manifest": {
                    "slug": item.slug,
                    "version": row.version,
                    "sha256": row.sha256,
                    "signature": row.signature,
                    "min_sentinel_version": row.min_sentinel_version,
                    "security_envelope": dict(row.security_envelope or {}),
                },
                "sha256": row.sha256,
                "signature": row.signature,
                "min_sentinel_version": row.min_sentinel_version,
            }
        )
    blob, filename = hub.build_airgap_bundle(entries, body.target_silicon or "UNIVERSAL")
    return StreamingResponse(
        io.BytesIO(blob),
        media_type="application/gzip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@telemetry_router.post("/install", status_code=status.HTTP_202_ACCEPTED)
async def record_install(
    body: InstallTelemetryIn,
    x_hub_client: str | None = Header(default=None, alias="X-Hub-Client"),
    db: AsyncSession = Depends(get_db),
):
    """Anonymous edge install metric (public, fire-and-forget)."""
    _ = x_hub_client
    plugin = (await db.execute(select(HubPlugin).where(HubPlugin.slug == body.slug))).scalar_one_or_none()
    if plugin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plugin '{body.slug}' not found")
    plugin.install_count += 1
    counts = dict(plugin.silicon_counts or {})
    target = (body.silicon_target or "UNIVERSAL").strip() or "UNIVERSAL"
    counts[target] = int(counts.get(target, 0)) + 1
    plugin.silicon_counts = counts
    await db.flush()
    return {"status": "accepted"}


# ---------------------------------------------------------------------------
# sentinel packages — verified `.spkg` catalog (public, no auth)
# ---------------------------------------------------------------------------
async def _get_package_or_404(db: AsyncSession, slug: str) -> SentinelPackage:
    from app.services import sentinel_packages as spkg

    await spkg.ensure_seed(db)
    row = (await db.execute(select(SentinelPackage).where(SentinelPackage.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Package '{slug}' not found")
    return row


@packages_router.get("", response_model=list[SentinelPackageOut])
@packages_router.get("/", response_model=list[SentinelPackageOut], include_in_schema=False)
async def list_packages(
    sector: str | None = Query(default=None, description="Case-insensitive substring match on sector"),
    tier: str | None = Query(default=None, description="Exact match: native | wasm | lua"),
    search: str | None = Query(default=None, description="Match across name, slug, short description, protocol"),
    db: AsyncSession = Depends(get_db),
):
    """List verified sentinel packages with optional filters (public)."""
    from sqlalchemy import or_

    from app.services import sentinel_packages as spkg

    await spkg.ensure_seed(db)
    if tier is not None and tier not in spkg.PACKAGE_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown tier '{tier}'. Use one of: {', '.join(spkg.PACKAGE_TIERS)}.",
        )
    stmt = select(SentinelPackage).order_by(SentinelPackage.slug)
    if tier is not None:
        stmt = stmt.where(SentinelPackage.tier == tier)
    if sector is not None and sector.strip():
        stmt = stmt.where(SentinelPackage.sector.ilike(f"%{sector.strip()}%"))
    if search is not None and search.strip():
        needle = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            SentinelPackage.name.ilike(needle),
            SentinelPackage.slug.ilike(needle),
            SentinelPackage.short_description.ilike(needle),
            SentinelPackage.target_protocol.ilike(needle),
            SentinelPackage.sector.ilike(needle),
        ))
    rows = (await db.execute(stmt)).scalars().all()
    return [SentinelPackageOut.model_validate(r) for r in rows]


@packages_router.get("/{slug}", response_model=SentinelPackageOut)
async def get_package(slug: str, db: AsyncSession = Depends(get_db)):
    """Full technical details + compliance tags for one package (public)."""
    row = await _get_package_or_404(db, slug)
    return SentinelPackageOut.model_validate(row)


@packages_router.get("/{slug}/download")
async def download_package(slug: str, db: AsyncSession = Depends(get_db)):
    """Stream the `.spkg` file binary (public).

    Seed packages serve deterministic reproducible bytes (header +
    zero padding to ``package_file_size_bytes``) so filename, size and
    checksum stay self-consistent until real binaries are published
    out-of-band.
    """
    from app.services import sentinel_packages as spkg

    row = await _get_package_or_404(db, slug)
    blob = spkg.build_spkg_bytes(row)
    digest = spkg.spkg_sha256(row)
    return StreamingResponse(
        iter([blob]),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{row.package_file_name}"',
            "X-Checksum-SHA256": digest,
        },
    )
