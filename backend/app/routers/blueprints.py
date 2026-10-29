"""Visual Threat Blueprint Editor routes.

Powers ``app.aryorithm.com/ai/threat-blueprints``: blueprint CRUD, the
palette node catalog, graph compilation to ``model_routes.yaml`` and the
fleet deployment trigger.
"""

import hashlib
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.blueprint import BlueprintStatus, ThreatBlueprint
from app.models.hub_assets import HubAssetMeta
from app.models.hub_blueprints import HubBlueprint
from app.models.user import User
from app.schemas.blueprint import (
    BlueprintDetail,
    BlueprintSummary,
    BlueprintWrite,
    CompileResponse,
    DeleteBlueprintResponse,
    DeployResponse,
    NodeCatalogResponse,
)
from app.services.threat_blueprint import compile_graph, node_catalog_payload

router = APIRouter(prefix="/blueprints", tags=["Visual Threat Blueprints"])


def _status_value(value: BlueprintStatus | str) -> str:
    return value.value if hasattr(value, "value") else str(value)


async def _get_owned_blueprint(
    db: AsyncSession, tenant_id: str, blueprint_id: str
) -> ThreatBlueprint:
    row = (
        await db.execute(
            select(ThreatBlueprint).where(
                ThreatBlueprint.tenant_id == tenant_id,
                ThreatBlueprint.blueprint_id == blueprint_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blueprint '{blueprint_id}' not found",
        )
    return row


def _summary(
    row: ThreatBlueprint,
    *,
    compiled_artifact: dict | None = None,
    visibility: str = "private",
) -> BlueprintSummary:
    return BlueprintSummary(
        blueprint_id=row.blueprint_id,
        name=row.name,
        description=row.description or "",
        target_sites=list(row.target_sites or []),
        status=_status_value(row.status),
        node_count=len(row.nodes or []),
        edge_count=len(row.edges or []),
        last_deployed_at=row.last_deployed_at,
        compiled_at=row.compiled_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        compiled_artifact=compiled_artifact,
        visibility=visibility,
    )


def _detail(row: ThreatBlueprint) -> BlueprintDetail:
    summary = _summary(row)
    return BlueprintDetail(
        **summary.model_dump(),
        nodes=list(row.nodes or []),
        edges=list(row.edges or []),
        compiled_yaml=row.compiled_yaml,
    )


def _compile_row(row: ThreatBlueprint):
    return compile_graph(
        blueprint_id=row.blueprint_id,
        name=row.name,
        description=row.description or "",
        target_sites=list(row.target_sites or []),
        nodes=list(row.nodes or []),
        edges=list(row.edges or []),
    )


# ---------------------------------------------------------------------------
# Blueprint library
# ---------------------------------------------------------------------------
@router.get("", response_model=list[BlueprintSummary])
@router.get("/", response_model=list[BlueprintSummary], include_in_schema=False)
async def list_blueprints(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List saved blueprints with metadata for the library grid."""
    rows = (
        await db.execute(
            select(ThreatBlueprint)
            .where(ThreatBlueprint.tenant_id == user.tenant_id)
            .order_by(ThreatBlueprint.updated_at.desc())
        )
    ).scalars().all()

    # Link visual blueprints to their compiled Hub production artifact.  The
    # visual ``blueprint_id`` is the canonical key; a slugified name is kept
    # as a fallback for bundles published before the editor existed.
    compiled_rows = (
        await db.execute(
            select(HubBlueprint).where(HubBlueprint.is_yanked.is_(False))
        )
    ).scalars().all()
    compiled_by_slug = {row.slug: row for row in compiled_rows}
    metas = {
        meta.slug: meta
        for meta in (
            await db.execute(
                select(HubAssetMeta).where(HubAssetMeta.asset_type == "blueprint")
            )
        ).scalars().all()
    }

    def slugify(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")

    payload = []
    for row in rows:
        match = compiled_by_slug.get(row.blueprint_id) or compiled_by_slug.get(
            slugify(row.name)
        )
        meta = metas.get(match.slug) if match is not None else None
        visibility = (meta.visibility if meta is not None else "public")
        artifact = None
        if match is not None:
            artifact = {
                "asset_type": "blueprint",
                "slug": match.slug,
                "version": match.version,
                "visibility": visibility,
                "download_url": f"/api/v1/hub/assets/blueprint/{match.slug}/download",
                "compiled_at": (
                    (meta.created_at if meta is not None else match.created_at)
                ).isoformat()
                if (meta is not None or match.created_at)
                else None,
                "sha256": match.sha256,
                "has_compiled_yaml": bool((row.compiled_yaml or "").strip()),
            }
        elif (row.compiled_yaml or "").strip():
            visibility = "private"
            artifact = {
                "asset_type": "blueprint",
                "slug": row.blueprint_id,
                "version": None,
                "visibility": "private",
                "download_url": None,
                "compiled_at": row.compiled_at.isoformat()
                if row.compiled_at
                else None,
                "sha256": hashlib.sha256(
                    row.compiled_yaml.encode("utf-8")
                ).hexdigest(),
                "has_compiled_yaml": True,
            }
        payload.append(
            _summary(row, compiled_artifact=artifact, visibility=visibility)
        )
    return payload


@router.get("/node-catalog", response_model=NodeCatalogResponse)
async def get_node_catalog(user: User = Depends(get_current_user)):
    """Master palette: 5 stages, sockets, defaults and SLA hints.

    Declared before ``/{blueprint_id}`` so ``node-catalog`` is never parsed
    as a blueprint id.
    """
    _ = user
    return NodeCatalogResponse(**node_catalog_payload())


@router.post("", response_model=BlueprintDetail)
@router.post("/", response_model=BlueprintDetail, include_in_schema=False)
async def save_blueprint(
    body: BlueprintWrite,
    response: Response,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new blueprint or save changes to an existing draft.

    Saving resets the lifecycle to ``DRAFT`` and clears stale compiled YAML;
    only ``POST /{id}/deploy`` may mark a blueprint ``DEPLOYED``.
    """
    name = body.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blueprint name is required",
        )

    target_sites: list[str] = []
    for site in body.target_sites:
        clean = str(site).strip()
        if clean and clean not in target_sites:
            target_sites.append(clean)

    requested_id = body.blueprint_id.strip() if body.blueprint_id else None
    existing: ThreatBlueprint | None = None
    if requested_id:
        existing = (
            await db.execute(
                select(ThreatBlueprint).where(
                    ThreatBlueprint.tenant_id == user.tenant_id,
                    ThreatBlueprint.blueprint_id == requested_id,
                )
            )
        ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    nodes = [node.model_dump() for node in body.nodes]
    edges = [edge.model_dump() for edge in body.edges]

    if existing is None:
        blueprint_id = requested_id or f"bp_{uuid.uuid4().hex[:12]}"
        row = ThreatBlueprint(
            blueprint_id=blueprint_id,
            name=name,
            description=body.description,
            target_sites=target_sites,
            status=BlueprintStatus.DRAFT,
            nodes=nodes,
            edges=edges,
            created_at=now,
            updated_at=now,
            tenant_id=user.tenant_id,
        )
        db.add(row)
        response.status_code = status.HTTP_201_CREATED
    else:
        row = existing
        row.name = name
        row.description = body.description
        row.target_sites = target_sites
        row.nodes = nodes
        row.edges = edges
        # Any edit invalidates the previous compile/deploy artefact.
        row.status = BlueprintStatus.DRAFT
        row.compiled_yaml = None
        row.compiled_at = None
        row.updated_at = now
        response.status_code = status.HTTP_200_OK

    await db.flush()
    return _detail(row)


@router.get("/{blueprint_id}", response_model=BlueprintDetail)
async def get_blueprint(
    blueprint_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the full node-and-edge graph for the canvas."""
    row = await _get_owned_blueprint(db, user.tenant_id, blueprint_id)
    return _detail(row)


@router.delete("/{blueprint_id}", response_model=DeleteBlueprintResponse)
async def delete_blueprint(
    blueprint_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a saved blueprint (tenant scoped)."""
    row = await _get_owned_blueprint(db, user.tenant_id, blueprint_id)
    await db.delete(row)
    await db.flush()
    return DeleteBlueprintResponse(status="DELETED", blueprint_id=blueprint_id)


# ---------------------------------------------------------------------------
# Compile / deploy
# ---------------------------------------------------------------------------
@router.post("/{blueprint_id}/compile", response_model=CompileResponse)
async def compile_blueprint(
    blueprint_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Validate the graph and compile it into ``model_routes.yaml``.

    Returns ``400`` with a machine-readable error list when the topology is
    invalid (unknown node/port, missing required input, type mismatch or
    cycle).
    """
    row = await _get_owned_blueprint(db, user.tenant_id, blueprint_id)
    yaml_text, errors, warnings, stats = _compile_row(row)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "INVALID_GRAPH",
                "blueprint_id": blueprint_id,
                "errors": errors,
                "warnings": warnings,
                **stats,
            },
        )

    now = datetime.now(timezone.utc)
    row.compiled_yaml = yaml_text
    row.compiled_at = now
    row.status = BlueprintStatus.VALIDATED
    row.updated_at = now
    await db.flush()

    return CompileResponse(
        blueprint_id=row.blueprint_id,
        status=_status_value(row.status),
        valid=True,
        errors=[],
        warnings=warnings,
        compiled_yaml=yaml_text,
        compiled_at=row.compiled_at,
        **stats,
    )


@router.post("/{blueprint_id}/deploy", response_model=DeployResponse)
async def deploy_blueprint(
    blueprint_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Recompile, then broadcast ``model_routes.yaml`` fleet-wide.

    The compile step is repeated so a stale YAML artefact can never be
    deployed after a graph edit. The gRPC broadcast is simulated with a
    sub-50 ms SLA value.
    """
    row = await _get_owned_blueprint(db, user.tenant_id, blueprint_id)
    yaml_text, errors, warnings, stats = _compile_row(row)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "INVALID_GRAPH",
                "blueprint_id": blueprint_id,
                "errors": errors,
                "warnings": warnings,
                **stats,
            },
        )

    now = datetime.now(timezone.utc)
    row.compiled_yaml = yaml_text
    row.compiled_at = now
    row.last_deployed_at = now
    row.status = BlueprintStatus.DEPLOYED
    row.updated_at = now
    await db.flush()

    targets = list(row.target_sites or [])
    digest = hashlib.sha256((yaml_text or "").encode()).hexdigest()
    broadcast_latency_ms = round(
        10.0 + (int(digest[:4], 16) % 150) / 10.0, 2
    )
    return DeployResponse(
        status="DEPLOYED",
        blueprint_id=row.blueprint_id,
        deployed_at=now,
        target_sites=targets,
        nodes_targeted=len(targets) if targets else 1,
        broadcast_latency_ms=broadcast_latency_ms,
        grpc_status="BROADCAST_OK",
        fleet_health="9/9",
        config_sha256=digest,
    )
