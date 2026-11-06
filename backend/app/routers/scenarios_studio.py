"""Scenario Graph Studio routes.

Powers the visual ``app.aryorithm.com/matrix/scenario-studio`` editor.  The
router is isolated from the physical ``/blueprints`` DAG compiler and from the
legacy Hub scenario catalog; it only adds the ``/matrix-scenarios`` namespace.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.fleet import Node, NodeStatus
from app.models.scenario_studio import (
    ScenarioGraph,
    ScenarioLink as ScenarioLinkRow,
    ScenarioNode as ScenarioNodeRow,
    ScenarioStudioStatus,
    ScenarioSubnet as ScenarioSubnetRow,
)
from app.models.user import User
from app.schemas.scenario_studio import (
    ScenarioCompileResult,
    ScenarioDeleteResult,
    ScenarioGraphDetail,
    ScenarioGraphSaveResult,
    ScenarioGraphSummary,
    ScenarioGraphWrite,
    ScenarioLaunchRequest,
    ScenarioLaunchResult,
    ScenarioLink,
    ScenarioNode,
    ScenarioPalette,
    ScenarioSubnet,
)
from app.services import scenario_studio as studio

router = APIRouter(prefix="/matrix-scenarios", tags=["Scenario Graph Studio"])


def _status_value(value: ScenarioStudioStatus | str) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _remove_bundle_file(row: ScenarioGraph) -> None:
    if not row.bundle_path:
        return
    try:
        (studio.bundle_root() / row.bundle_path).unlink(missing_ok=True)
    except OSError:
        pass


async def _get_owned_graph(
    db: AsyncSession, tenant_id: str, scenario_id: str
) -> ScenarioGraph:
    row = (
        await db.execute(
            select(ScenarioGraph).where(
                ScenarioGraph.tenant_id == tenant_id,
                ScenarioGraph.scenario_id == scenario_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found",
        )
    return row


async def _load_children(
    db: AsyncSession, row: ScenarioGraph
) -> tuple[list[ScenarioSubnet], list[ScenarioNode], list[ScenarioLink]]:
    subnet_rows = (
        await db.execute(
            select(ScenarioSubnetRow)
            .where(ScenarioSubnetRow.graph_pk == row.id)
            .order_by(ScenarioSubnetRow.sort_order, ScenarioSubnetRow.subnet_key)
        )
    ).scalars().all()
    node_rows = (
        await db.execute(
            select(ScenarioNodeRow)
            .where(ScenarioNodeRow.graph_pk == row.id)
            .order_by(ScenarioNodeRow.sort_order, ScenarioNodeRow.node_key)
        )
    ).scalars().all()
    link_rows = (
        await db.execute(
            select(ScenarioLinkRow)
            .where(ScenarioLinkRow.graph_pk == row.id)
            .order_by(ScenarioLinkRow.sort_order, ScenarioLinkRow.link_key)
        )
    ).scalars().all()

    subnets = [
        ScenarioSubnet(
            id=item.subnet_key,
            name=item.name,
            cidr=item.cidr,
            gateway=item.gateway,
            internal=item.internal,
            purdue_level=item.purdue_level,  # type: ignore[arg-type]
        )
        for item in subnet_rows
    ]
    nodes = [
        ScenarioNode(
            id=item.node_key,
            name=item.name,
            type=item.node_type,
            subnet_id=item.subnet_key,
            ip=item.ip,
            image=item.image,
            protocols=list(item.protocols or []),
            ports=list(item.ports or []),
            config=dict(item.config or {}),
            x=item.x,
            y=item.y,
        )
        for item in node_rows
    ]
    links = [
        ScenarioLink(
            id=item.link_key,
            source_node_id=item.source_node_key,
            target_node_id=item.target_node_key,
            kind=item.link_kind,
            label=item.label,
            protocol=item.protocol,
            config=dict(item.config or {}),
        )
        for item in link_rows
    ]
    return subnets, nodes, links


def _detail(
    row: ScenarioGraph,
    subnets: list[ScenarioSubnet],
    nodes: list[ScenarioNode],
    links: list[ScenarioLink],
) -> ScenarioGraphDetail:
    hub_url = None
    if row.hub_slug:
        hub_url = (
            f"{settings.HUB_PUBLIC_BASE.rstrip('/')}/scenarios/{row.hub_slug}"
        )
    return ScenarioGraphDetail(
        scenario_id=row.scenario_id,
        name=row.name,
        target_sector=row.target_sector,
        description=row.description or "",
        status=_status_value(row.status),
        subnet_count=len(subnets),
        node_count=len(nodes),
        link_count=len(links),
        subnets=subnets,
        nodes=nodes,
        links=links,
        compiled_yaml=row.compiled_yaml,
        compiled_at=row.compiled_at,
        bundle_name=row.bundle_name,
        bundle_size_bytes=row.bundle_size_bytes,
        bundle_sha256=row.bundle_sha256,
        bundled_at=row.bundled_at,
        hub_slug=row.hub_slug,
        hub_url=hub_url,
        last_launch_id=row.last_launch_id,
        last_launch_agent_id=row.last_launch_agent_id,
        last_launch_status=row.last_launch_status,
        last_launch_message=row.last_launch_message,
        last_launched_at=row.last_launched_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _replace_children(
    db: AsyncSession, row: ScenarioGraph, body: ScenarioGraphWrite
) -> None:
    await db.execute(
        delete(ScenarioLinkRow).where(ScenarioLinkRow.graph_pk == row.id)
    )
    await db.execute(
        delete(ScenarioNodeRow).where(ScenarioNodeRow.graph_pk == row.id)
    )
    await db.execute(
        delete(ScenarioSubnetRow).where(ScenarioSubnetRow.graph_pk == row.id)
    )

    for index, subnet in enumerate(body.subnets):
        db.add(
            ScenarioSubnetRow(
                graph_pk=row.id,
                subnet_key=subnet.id,
                name=subnet.name,
                cidr=subnet.cidr,
                gateway=subnet.gateway,
                internal=subnet.internal,
                purdue_level=subnet.purdue_level,
                sort_order=index,
            )
        )
    for index, node in enumerate(body.nodes):
        db.add(
            ScenarioNodeRow(
                graph_pk=row.id,
                node_key=node.id,
                name=node.name,
                node_type=node.type,
                subnet_key=node.subnet_id,
                ip=node.ip,
                image=node.image,
                protocols=list(node.protocols),
                ports=list(node.ports),
                config=dict(node.config),
                x=node.x,
                y=node.y,
                sort_order=index,
            )
        )
    for index, link in enumerate(body.links):
        db.add(
            ScenarioLinkRow(
                graph_pk=row.id,
                link_key=link.id,
                source_node_key=link.source_node_id,
                target_node_key=link.target_node_id,
                link_kind=link.kind,
                label=link.label,
                protocol=link.protocol,
                config=dict(link.config),
                sort_order=index,
            )
        )
    await db.flush()


def _check_unique_children(body: ScenarioGraphWrite) -> None:
    subnet_ids = [item.id for item in body.subnets]
    if len(set(subnet_ids)) != len(subnet_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subnet ids must be unique within a scenario.",
        )
    node_ids = [item.id for item in body.nodes]
    if len(set(node_ids)) != len(node_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node ids must be unique within a scenario.",
        )
    link_ids = [item.id for item in body.links]
    if len(set(link_ids)) != len(link_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link ids must be unique within a scenario.",
        )


async def _compile_row(
    db: AsyncSession, row: ScenarioGraph
) -> tuple[str, ScenarioCompileResult, list]:
    subnets, nodes, links = await _load_children(db, row)
    yaml_text, issues = studio.compile_scenario(
        scenario_id=row.scenario_id,
        name=row.name,
        target_sector=row.target_sector,
        description=row.description or "",
        subnets=subnets,
        nodes=nodes,
        links=links,
    )
    errors = [item.message for item in issues if item.severity == "error"]
    warnings = [item.message for item in issues if item.severity == "warning"]
    if errors or yaml_text is None:
        detail = {
            "status": "INVALID_TOPOLOGY",
            "scenario_id": row.scenario_id,
            "errors": errors,
            "warnings": warnings,
            "issues": [item.model_dump() for item in issues],
        }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    now = datetime.now(timezone.utc)
    row.compiled_yaml = yaml_text
    row.compiled_at = now
    if row.status not in (
        ScenarioStudioStatus.LAUNCHED,
        ScenarioStudioStatus.BUNDLED,
    ):
        row.status = ScenarioStudioStatus.VALIDATED
    row.updated_at = now
    await db.flush()
    result = ScenarioCompileResult(
        status=_status_value(row.status),
        valid=True,
        scenario_id=row.scenario_id,
        compiled_yaml=yaml_text,
        errors=[],
        warnings=warnings,
        issues=issues,
        compiled_at=now,
    )
    return yaml_text, result, issues


# ---------------------------------------------------------------------------
# Library, palette and CRUD
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ScenarioGraphSummary])
@router.get("/", response_model=list[ScenarioGraphSummary], include_in_schema=False)
async def list_scenarios(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List tenant-owned graph designs without the topology payload."""
    rows = (
        await db.execute(
            select(ScenarioGraph)
            .where(ScenarioGraph.tenant_id == user.tenant_id)
            .order_by(ScenarioGraph.updated_at.desc())
        )
    ).scalars().all()
    if not rows:
        return []

    ids = [row.id for row in rows]
    subnet_counts = dict(
        (
            await db.execute(
                select(
                    ScenarioSubnetRow.graph_pk,
                    func.count(ScenarioSubnetRow.id),
                )
                .where(ScenarioSubnetRow.graph_pk.in_(ids))
                .group_by(ScenarioSubnetRow.graph_pk)
            )
        ).all()
    )
    node_counts = dict(
        (
            await db.execute(
                select(
                    ScenarioNodeRow.graph_pk,
                    func.count(ScenarioNodeRow.id),
                )
                .where(ScenarioNodeRow.graph_pk.in_(ids))
                .group_by(ScenarioNodeRow.graph_pk)
            )
        ).all()
    )
    link_counts = dict(
        (
            await db.execute(
                select(
                    ScenarioLinkRow.graph_pk,
                    func.count(ScenarioLinkRow.id),
                )
                .where(ScenarioLinkRow.graph_pk.in_(ids))
                .group_by(ScenarioLinkRow.graph_pk)
            )
        ).all()
    )
    return [
        ScenarioGraphSummary(
            scenario_id=row.scenario_id,
            name=row.name,
            target_sector=row.target_sector,
            description=row.description or "",
            status=_status_value(row.status),
            subnet_count=int(subnet_counts.get(row.id, 0)),
            node_count=int(node_counts.get(row.id, 0)),
            link_count=int(link_counts.get(row.id, 0)),
            compiled_at=row.compiled_at,
            bundled_at=row.bundled_at,
            last_launched_at=row.last_launched_at,
            hub_slug=row.hub_slug,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]


@router.get("/palette", response_model=ScenarioPalette)
async def palette(user: User = Depends(get_current_user)):
    """Return the four-category component palette for the visual editor."""
    _ = user
    return studio.palette_payload()


@router.post("", response_model=ScenarioGraphSaveResult)
@router.post("/", response_model=ScenarioGraphSaveResult, include_in_schema=False)
async def save_scenario(
    body: ScenarioGraphWrite,
    response: Response,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a draft graph.  Invalid topology may still be saved."""
    name = body.name.strip()
    target_sector = body.target_sector.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scenario name is required",
        )
    if not target_sector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target sector is required",
        )
    _check_unique_children(body)

    requested_id = body.scenario_id.strip() if body.scenario_id else None
    if requested_id and not studio.scenario_id_valid(requested_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "scenario_id may contain only letters, numbers, hyphens and "
                "underscores."
            ),
        )

    existing: ScenarioGraph | None = None
    if requested_id:
        existing = (
            await db.execute(
                select(ScenarioGraph).where(
                    ScenarioGraph.tenant_id == user.tenant_id,
                    ScenarioGraph.scenario_id == requested_id,
                )
            )
        ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if existing is None:
        scenario_id = requested_id or f"scen_{uuid.uuid4().hex[:12]}"
        row = ScenarioGraph(
            scenario_id=scenario_id,
            name=name,
            target_sector=target_sector,
            description=body.description,
            status=ScenarioStudioStatus.DRAFT,
            created_at=now,
            updated_at=now,
            tenant_id=user.tenant_id,
        )
        db.add(row)
        await db.flush()
        response.status_code = status.HTTP_201_CREATED
    else:
        row = existing
        row.name = name
        row.target_sector = target_sector
        row.description = body.description
        # Any graph edit invalidates the compiled/bundled artifact but keeps
        # the stable Hub slug so re-publishing updates the same catalog row.
        _remove_bundle_file(row)
        row.status = ScenarioStudioStatus.DRAFT
        row.compiled_yaml = None
        row.compiled_at = None
        row.bundle_path = None
        row.bundle_name = None
        row.bundle_sha256 = None
        row.bundle_size_bytes = None
        row.bundled_at = None
        row.updated_at = now
        response.status_code = status.HTTP_200_OK

    await _replace_children(db, row, body)
    await db.flush()
    return ScenarioGraphSaveResult(
        scenario_id=row.scenario_id,
        status=_status_value(row.status),
        subnet_count=len(body.subnets),
        node_count=len(body.nodes),
        link_count=len(body.links),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/{scenario_id}", response_model=ScenarioGraphDetail)
async def get_scenario(
    scenario_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the full graph, compiled YAML and last launch state."""
    row = await _get_owned_graph(db, user.tenant_id, scenario_id)
    subnets, nodes, links = await _load_children(db, row)
    return _detail(row, subnets, nodes, links)


@router.delete("/{scenario_id}", response_model=ScenarioDeleteResult)
async def delete_scenario(
    scenario_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a graph and all normalized subnet/node/link rows."""
    row = await _get_owned_graph(db, user.tenant_id, scenario_id)
    _remove_bundle_file(row)
    await db.execute(
        delete(ScenarioLinkRow).where(ScenarioLinkRow.graph_pk == row.id)
    )
    await db.execute(
        delete(ScenarioNodeRow).where(ScenarioNodeRow.graph_pk == row.id)
    )
    await db.execute(
        delete(ScenarioSubnetRow).where(ScenarioSubnetRow.graph_pk == row.id)
    )
    await db.delete(row)
    await db.flush()
    return ScenarioDeleteResult(status="DELETED", scenario_id=scenario_id)


# ---------------------------------------------------------------------------
# Compile / bundle / launch
# ---------------------------------------------------------------------------
@router.post("/{scenario_id}/compile", response_model=ScenarioCompileResult)
async def compile_scenario(
    scenario_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Validate the five topology rules and emit scenario.yaml."""
    row = await _get_owned_graph(db, user.tenant_id, scenario_id)
    _yaml, result, _issues = await _compile_row(db, row)
    return result


@router.post("/{scenario_id}/bundle")
async def bundle_scenario(
    scenario_id: str,
    publish_to_hub: bool = Query(default=False),
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Compile and stream a ``scenario_<name>.tar.gz`` download.

    Set ``?publish_to_hub=true`` to also copy the exact bundle into the Hub
    scenario vault and upsert the public ``HubScenario`` catalog row.
    """
    row = await _get_owned_graph(db, user.tenant_id, scenario_id)
    yaml_text, _result, _issues = await _compile_row(db, row)
    subnets, nodes, links = await _load_children(db, row)
    artifact_name = studio.artifact_name_for(row.scenario_id, row.name)
    bundle, _manifest = studio.build_bundle(
        scenario_id=row.scenario_id,
        name=row.name,
        target_sector=row.target_sector,
        description=row.description or "",
        subnets=subnets,
        nodes=nodes,
        links=links,
        compiled_yaml=yaml_text,
    )
    digest = hashlib.sha256(bundle).hexdigest()
    bundle_dir = studio.bundle_root() / row.scenario_id
    bundle_dir.mkdir(parents=True, exist_ok=True)
    bundle_path = bundle_dir / artifact_name
    bundle_path.write_bytes(bundle)

    now = datetime.now(timezone.utc)
    headers = {
        "Content-Disposition": f'attachment; filename="{artifact_name}"',
        "X-Checksum-Sha256": digest,
        "X-Scenario-Id": row.scenario_id,
        "X-Artifact-Name": artifact_name,
    }

    if publish_to_hub:
        hub_slug = await studio.resolve_hub_slug(
            db,
            scenario_id=row.scenario_id,
            stored_slug=row.hub_slug,
            tenant_id=user.tenant_id,
        )
        await studio.register_hub_scenario(
            db,
            scenario_id=row.scenario_id,
            hub_slug=hub_slug,
            tenant_id=user.tenant_id,
            owner_user_id=user.id,
            author=user.name or user.email or "Aryorithm operator",
            name=row.name,
            target_sector=row.target_sector,
            description=row.description or "",
            subnets=subnets,
            nodes=nodes,
            links=links,
            bundle=bundle,
            artifact_name=artifact_name,
        )
        row.hub_slug = hub_slug
        headers["X-Hub-Slug"] = hub_slug

    row.compiled_yaml = yaml_text
    row.compiled_at = now
    row.bundle_path = str(bundle_path.relative_to(studio.bundle_root()))
    row.bundle_name = artifact_name
    row.bundle_sha256 = digest
    row.bundle_size_bytes = len(bundle)
    row.bundled_at = now
    row.status = ScenarioStudioStatus.BUNDLED
    row.updated_at = now
    await db.flush()

    return Response(
        content=bundle,
        media_type="application/gzip",
        headers=headers,
        status_code=status.HTTP_200_OK,
    )


@router.post("/{scenario_id}/launch", response_model=ScenarioLaunchResult)
async def launch_scenario(
    scenario_id: str,
    response: Response,
    body: ScenarioLaunchRequest | None = None,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Compile and dispatch the scenario to an online Matrix agent.

    When no agent is online, the launch is queued and returned with ``202`` so
    the operator can connect an agent without losing the intent.
    """
    row = await _get_owned_graph(db, user.tenant_id, scenario_id)
    yaml_text, _result, _issues = await _compile_row(db, row)
    compiled_sha = hashlib.sha256(yaml_text.encode("utf-8")).hexdigest()

    requested_agent = (body.agent_id.strip() if body and body.agent_id else None)
    agent: Node | None = None
    if requested_agent:
        agent = (
            await db.execute(
                select(Node).where(
                    Node.tenant_id == user.tenant_id,
                    (Node.node_id == requested_agent) | (Node.id == requested_agent),
                )
            )
        ).scalar_one_or_none()
        if agent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Matrix agent '{requested_agent}' not found",
            )
        if agent.status != NodeStatus.ONLINE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Matrix agent '{requested_agent}' is not online",
            )
    else:
        agent = (
            await db.execute(
                select(Node)
                .where(
                    Node.tenant_id == user.tenant_id,
                    Node.status == NodeStatus.ONLINE,
                )
                .order_by(Node.last_heartbeat.desc(), Node.updated_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    launch_id = f"launch_{uuid.uuid4().hex[:12]}"
    if agent is None:
        launch_status = "QUEUED"
        agent_status = "AWAITING_AGENT"
        message = (
            "Scenario compiled and queued; no online Matrix agent is connected "
            "to this tenant."
        )
        response.status_code = status.HTTP_202_ACCEPTED
    else:
        launch_status = "DISPATCHED"
        agent_status = _status_value(agent.status)
        message = (
            f"Scenario dispatched to Matrix agent '{agent.node_id}' at "
            f"{agent.hostname or agent.site}."
        )

    row.last_launch_id = launch_id
    row.last_launch_agent_id = agent.node_id if agent else None
    row.last_launch_status = launch_status
    row.last_launch_message = message
    row.last_launched_at = now
    if agent is not None:
        row.status = ScenarioStudioStatus.LAUNCHED
    row.updated_at = now
    await db.flush()

    return ScenarioLaunchResult(
        status=launch_status,
        scenario_id=row.scenario_id,
        launch_id=launch_id,
        agent_id=agent.node_id if agent else None,
        agent_status=agent_status,
        message=message,
        dispatched_at=now,
        compiled_sha256=compiled_sha,
    )
