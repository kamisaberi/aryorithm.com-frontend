"""Fleet Management, Enclaves & Hardware ZTP routes."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin, get_nexus_caller
from app.models.fleet import Enclave, Node, Sensor
from app.models.threat import ThreatEvent
from app.models.user import User
from app.schemas.fleet import (
    NodeResponse,
    NodeDetailResponse,
    NodeRestartRequest,
    NodeActionResponse,
    EnclaveCreate,
    EnclaveResponse,
    EnclaveCreateResponse,
    ZTPTokenRequest,
    ZTPTokenResponse,
    ZTPEnrollRequest,
    ZTPEnrollResponse,
    KernelRuleResponse,
    KernelPurgeRequest,
    KernelPurgeResponse,
    FleetSyncRequest,
    FleetSyncResponse,
    TopologyResponse,
    GroupCreate,
    GroupResponse,
    GroupCreateResponse,
)
from app.services.fleet_topology import (
    ensure_topology_schema,
    get_topology,
    sync_topology,
)

router = APIRouter(prefix="/fleet", tags=["Fleet Management"])

logger = logging.getLogger("uvicorn.error")


@router.post("/sync", response_model=FleetSyncResponse)
async def fleet_sync(
    body: FleetSyncRequest,
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """Sentinel-nexus heartbeat — POST every ~5s.

    Sender headers: `Authorization: Bearer <JWT>`, `X-Tenant-ID`.
    Sender body: { tenant_id, nexus_id, nexus_version, timestamp,
      nodes_count, nodes: [
      {node_id, site, hostname, status, cpu_pct, ebpf_drops,
       mitigation_latency_us, sensors: [
       {sensor_id, name, type, protocol, ip_address, status,
        last_packet_seen_sec_ago} ] } ] }.
    Dashboard simulator may auth with `X-API-Key` instead of JWT.

    Persists only the last update (upsert nexus/nodes/sensors, prune
    sensors missing from the payload).
    """
    tenant_id = x_tenant_id or body.tenant_id
    # Print to uvicorn terminal (both logger + print for visibility).
    logger.info(
        "POST /api/v1/fleet/sync tenant_id=%s nodes_count=%s nodes=%s "
        "header_tenant=%s user=%s",
        body.tenant_id,
        body.nodes_count,
        [n.node_id for n in body.nodes],
        tenant_id,
        getattr(caller, "id", "api-key"),
    )
    print(
        f"[fleet/sync] tenant_id={body.tenant_id} "
        f"header_tenant={tenant_id} nodes_count={body.nodes_count} "
        f"nodes={[n.model_dump() for n in body.nodes]}",
        flush=True,
    )
    stored = await sync_topology(db, body, x_tenant_id, caller)
    return FleetSyncResponse(
        status="synced",
        tenant_id=stored["tenant_id"],
        nodes_count=body.nodes_count,
        synced=stored["nodes_synced"],
        nexus_id=stored["nexus_id"],
        sensors_synced=stored["sensors_synced"],
    )


@router.get("/topology", response_model=TopologyResponse)
async def get_fleet_topology(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Last synced 4-tier topology (tenant -> nexus -> nodes -> sensors).

    Effective statuses come from the cascading health engine:
    stale nexus => children UNREACHABLE, stale node => OFFLINE,
    quiet sensor => SILENT / FAULT_NO_DATA.
    """
    data = await get_topology(db, user.tenant_id)
    return TopologyResponse(**data)


@router.get("/nodes", response_model=list[NodeResponse])
async def list_nodes(
    status: str | None = Query(None),
    backend: str | None = Query(None),
    enclave: str | None = Query(None),
    enclave_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all registered edge appliances (last synced state).

    Liveness rule (Service 1): a heartbeat older than 15s overrides the
    status to OFFLINE regardless of the last reported value.
    """
    await ensure_topology_schema()
    data = await get_topology(db, user.tenant_id)
    out: list[NodeResponse] = []
    for nx in data["nexus"]:
        for n in nx["nodes"]:
            effective = n["status"]
            hb = n.get("last_heartbeat_sec_ago")
            if hb is None or hb > 15.0:
                effective = "OFFLINE"
            if status and effective != status.strip().upper():
                continue
            sensors = n.get("sensors", [])
            out.append(NodeResponse(
                node_id=n["node_id"],
                site=n["site"],
                hostname=n.get("hostname"),
                kernel_version=n.get("kernel_version"),
                status=effective,
                cpu_pct=n["cpu_pct"],
                ram_mb=n.get("ram_mb") or 0.0,
                npu_temp_c=n.get("npu_temp_c") or 0.0,
                packets_inspected=n.get("packets_inspected") or 0,
                ebpf_drops=n["ebpf_drops"],
                mitigation_latency_us=n["mitigation_latency_us"],
                latency_us=n["mitigation_latency_us"],
                eps=n.get("eps") or 0,
                version=n.get("version") or "",
                backend=(n.get("backend") or "").upper(),
                last_heartbeat_timestamp=(
                    None if hb is None
                    else int(datetime.now(timezone.utc).timestamp() - hb)
                ),
                sensors_count=len(sensors),
            ))
    # Fill static descriptors from the node rows.
    result = await db.execute(select(Node).where(Node.tenant_id == user.tenant_id))
    by_id = {row.node_id: row for row in result.scalars().all()}
    for item in out:
        row = by_id.get(item.node_id)
        if row is not None:
            item.eps = row.eps
            item.version = row.version
            item.backend = (row.backend or "").upper()
    if backend:
        out = [i for i in out if i.backend == backend.strip().upper()]
    _ = enclave or enclave_id  # grouping lives under /fleet/groups; accepted for compat
    return out


@router.get("/nodes/{node_id}", response_model=NodeDetailResponse)
async def get_node(node_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Single node telemetry, live sensors & ring buffer inspector."""
    await ensure_topology_schema()
    data = await get_topology(db, user.tenant_id)
    for nx in data["nexus"]:
        for n in nx["nodes"]:
            if n["node_id"] == node_id:
                result = await db.execute(
                    select(Node).where(
                        Node.tenant_id == user.tenant_id,
                        Node.node_id == node_id,
                    )
                )
                row = result.scalar_one_or_none()
                return NodeDetailResponse(
                    node_id=node_id,
                    ring_buffer_fill_pct=row.ring_buffer_fill_pct if row else 0,
                    kernel_drops=(row.ebpf_drops if row else 0),
                    hardware={"cpu": "ARM Cortex-A76", "tpm": "TPM 2.0", "memory_mb": 4096},
                    site=n["site"],
                    status=n["status"],
                    sensors=n["sensors"],
                )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Node not found",
    )


@router.post("/nodes/{node_id}/restart", response_model=NodeActionResponse)
async def restart_node(
    node_id: str,
    body: NodeRestartRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Issue remote graceful daemon restart."""
    return NodeActionResponse(status="RESTART_DISPATCHED", node_id=node_id)


@router.delete("/nodes/{node_id}", response_model=NodeActionResponse)
async def decommission_node(
    node_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Decommission / unregister edge appliance (purges node + sensors)."""
    await ensure_topology_schema()
    result = await db.execute(
        select(Node).where(
            Node.tenant_id == user.tenant_id,
            Node.node_id == node_id,
        )
    )
    node = result.scalar_one_or_none()
    if node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )
    result = await db.execute(
        select(Sensor).where(
            Sensor.tenant_id == user.tenant_id,
            Sensor.node_node_id == node_id,
        )
    )
    for sensor in result.scalars().all():
        await db.delete(sensor)
    await db.delete(node)
    await db.flush()
    return NodeActionResponse(status="DECOMMISSIONED", node_id=node_id)


async def _ensure_enclave_column() -> None:
    from app.services.fleet_topology import ensure_topology_schema

    await ensure_topology_schema()


@router.get("/groups", response_model=list[GroupResponse])
async def list_groups(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List logical site enclaves / groups (OT, Medical, DMZ)."""
    await _ensure_enclave_column()
    result = await db.execute(select(Enclave).where(Enclave.tenant_id == user.tenant_id))
    groups = list(result.scalars().all())
    if not groups:
        return [
            GroupResponse(group_id="CRITICAL_OT", scada_mode=True, max_latency_us=800, node_count=0),
            GroupResponse(group_id="MEDICAL_ZONE", scada_mode=False, max_latency_us=500, node_count=0),
            GroupResponse(group_id="DMZ_PERIMETER", scada_mode=False, max_latency_us=1000, node_count=0),
        ]
    result = await db.execute(select(Node).where(Node.tenant_id == user.tenant_id))
    nodes = list(result.scalars().all())
    counts: dict[str, int] = {}
    for g in groups:
        counts[g.enclave_id] = sum(1 for n in nodes if n.enclave_id == g.id)
    threats_result = await db.execute(
        select(ThreatEvent).where(ThreatEvent.tenant_id == user.tenant_id)
    )
    active_threats = sum(1 for _ in threats_result.scalars().all())
    return [
        GroupResponse(
            group_id=g.enclave_id,
            description=g.description or "",
            scada_mode=bool(g.scada_mode),
            max_latency_us=g.max_latency_us,
            node_count=counts.get(g.enclave_id, 0),
            active_threats=active_threats,
        )
        for g in groups
    ]


@router.post("/groups", response_model=GroupCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new physical or logical enclave zone."""
    await _ensure_enclave_column()
    group_id = body.group_id.strip()
    if not group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="group_id is required",
        )
    max_latency = body.max_allowed_latency_us if body.max_allowed_latency_us is not None else body.max_latency_us
    result = await db.execute(
        select(Enclave).where(
            Enclave.tenant_id == user.tenant_id,
            Enclave.enclave_id == group_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        existing.max_latency_us = int(max_latency)
        existing.scada_mode = body.scada_mode
        if body.description:
            existing.description = body.description
        await db.flush()
        return GroupCreateResponse(status="CREATED", group_id=group_id)
    db.add(Enclave(
        enclave_id=group_id,
        name=group_id,
        description=body.description,
        max_latency_us=int(max_latency),
        scada_mode=body.scada_mode,
        tenant_id=user.tenant_id,
    ))
    await db.flush()
    return GroupCreateResponse(status="CREATED", group_id=group_id)


@router.get("/enclaves", response_model=list[EnclaveResponse])
async def list_enclaves(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List physical enclaves/zones (OT, Medical, DMZ)."""
    return [
        EnclaveResponse(enclave_id="CRITICAL_OT", name="Critical OT", max_latency_us=800, node_count=14),
        EnclaveResponse(enclave_id="MEDICAL_ZONE", name="Medical Zone", max_latency_us=500, node_count=8),
        EnclaveResponse(enclave_id="DMZ_PERIMETER", name="DMZ Perimeter", max_latency_us=1000, node_count=22),
    ]


@router.post("/enclaves", response_model=EnclaveCreateResponse)
async def create_enclave(
    body: EnclaveCreate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new site/enclave zone."""
    return EnclaveCreateResponse(status="CREATED", enclave_id=body.enclave_id)


@router.post("/provisioning/tokens", response_model=ZTPTokenResponse)
async def generate_ztp_token(
    body: ZTPTokenRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate Zero-Touch Provisioning (ZTP) token."""
    return ZTPTokenResponse(
        token="ZTP-eyJhbGciOiJIUzI1NiIs...",
        expires_at=datetime.now(timezone.utc) + timedelta(days=body.valid_days),
    )


@router.post("/provisioning/enroll", response_model=ZTPEnrollResponse)
async def enroll_appliance(body: ZTPEnrollRequest):
    """Appliance hardware registration (TPM quote)."""
    return ZTPEnrollResponse(assigned_node_id="NODE-new01", heartbeat_sec=5)


@router.get("/kernel-rules", response_model=list[KernelRuleResponse])
async def list_kernel_rules(
    ip: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query synchronized in-kernel blocked_ip_map."""
    return [
        KernelRuleResponse(rule_id="RULE-01", ip="198.51.100.45", expires_at=None),
        KernelRuleResponse(rule_id="RULE-02", ip="203.0.113.99", expires_at=None),
    ]


@router.post("/kernel-rules/purge", response_model=KernelPurgeResponse)
async def purge_kernel_rule(
    body: KernelPurgeRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Emergency purge false-positive IP across fleet."""
    return KernelPurgeResponse(status="PURGED_FLEET_WIDE", ip=body.ip)
