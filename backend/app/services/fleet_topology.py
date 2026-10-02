"""4-tier asset topology store + cascading health engine.

Tiers: tenant -> nexus instance -> sentinel node -> sensor asset.
POST /api/v1/fleet/sync upserts the full tree every ~5s; only the last
update is kept (sensors missing from a payload are deleted, nodes that
go quiet are marked OFFLINE/UNREACHABLE by timeout, never deleted).

Effective availability (computed at read time):
- Nexus OFFLINE when no sync within OFFLINE_AFTER_SEC (children UNREACHABLE).
- Node OFFLINE when its own heartbeat is stale, else its reported status.
- Sensor SILENT when its node is down/stale, FAULT_NO_DATA when the
  packet gap exceeds the window, else ACTIVE.
"""

from datetime import datetime, timezone

from sqlalchemy import inspect, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, engine
import app.models  # noqa: F401 (register all tables for create_all)
from app.models.fleet import NexusInstance, Node, NodeStatus, Sensor
from app.models.user import Tenant, TenantTier, User

OFFLINE_AFTER_SEC = 30.0
FAULT_GAP_SEC = 30.0
DEFAULT_NEXUS_ID = "NEXUS-LOCAL"

_NODE_NEW_COLUMNS: dict[str, str] = {
    "nexus_id": "VARCHAR(64)",
    "hostname": "VARCHAR(255)",
    "ebpf_drops": "INTEGER",
    "mitigation_latency_us": "FLOAT",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _sec_ago(dt: datetime | None, now: datetime) -> float | None:
    dt = _as_aware(dt)
    if dt is None:
        return None
    return max(0.0, (now - dt).total_seconds())


async def ensure_topology_schema() -> None:
    """Create new tables + backfill Node columns on existing databases.

    Runs create_all itself (not just lifespan) so ASGI tests and scripts
    that skip startup still get nexus_instances/sensors tables.
    """

    def _migrate(sync_conn) -> None:
        Base.metadata.create_all(sync_conn)
        insp = inspect(sync_conn)
        try:
            cols = {c["name"] for c in insp.get_columns("nodes")}
        except Exception:
            cols = set()
        for name, ddl in _NODE_NEW_COLUMNS.items():
            if name not in cols:
                sync_conn.execute(text(f"ALTER TABLE nodes ADD COLUMN {name} {ddl}"))

    async with engine.begin() as conn:
        await conn.run_sync(_migrate)


async def resolve_tenant(
    db: AsyncSession, caller: User | None, slug: str | None
) -> Tenant:
    """Map a sync payload to a real tenant row (FK integrity).

    JWT callers scope to their own tenant. API-key callers (real Nexus)
    send a slug like "tenant-eurogrid-nl": match it against id, then name,
    else create the tenant so the topology has a home.
    """
    if caller is not None:
        tenant = await db.get(Tenant, caller.tenant_id)
        if tenant is not None:
            return tenant
    slug = (slug or "").strip() or "tenant-dev-local"
    tenant = await db.get(Tenant, slug)
    if tenant is None:
        result = await db.execute(select(Tenant).where(Tenant.name == slug))
        tenant = result.scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(id=slug, name=slug, tier=TenantTier.STARTER)
        db.add(tenant)
        await db.flush()
    return tenant


def _coerce_node_status(value: str | None, fallback: NodeStatus) -> NodeStatus:
    if value:
        try:
            return NodeStatus(value.strip().upper())
        except ValueError:
            pass
    return fallback


async def sync_topology(
    db: AsyncSession,
    body,
    header_tenant: str | None,
    caller: User | None,
) -> dict:
    """Upsert nexus -> nodes -> sensors from one /fleet/sync payload."""
    await ensure_topology_schema()
    now = _utcnow()
    slug = header_tenant or body.tenant_id
    tenant = await resolve_tenant(db, caller, slug)

    nexus_id = (body.nexus_id or DEFAULT_NEXUS_ID).strip() or DEFAULT_NEXUS_ID
    result = await db.execute(
        select(NexusInstance).where(NexusInstance.nexus_id == nexus_id)
    )
    nexus = result.scalar_one_or_none()
    if nexus is None:
        nexus = NexusInstance(
            nexus_id=nexus_id,
            tenant_id=tenant.id,
            version=(body.nexus_version or "1.0.0")[:32],
            status=NodeStatus.ONLINE,
            last_seen=now,
        )
        db.add(nexus)
    else:
        nexus.tenant_id = tenant.id
        if body.nexus_version:
            nexus.version = body.nexus_version[:32]
        nexus.status = NodeStatus.ONLINE
        nexus.last_seen = now
    await db.flush()

    sensors_seen = 0
    for n in body.nodes:
        result = await db.execute(select(Node).where(Node.node_id == n.node_id))
        node = result.scalar_one_or_none()
        reported = _coerce_node_status(n.status, NodeStatus.ONLINE)
        if node is None:
            node = Node(
                node_id=n.node_id,
                site=n.site or n.node_id,
                status=reported,
                cpu_pct=n.cpu_pct or 0.0,
                latency_us=n.mitigation_latency_us or n.latency_us or 0.0,
                eps=n.eps or 0,
                version=(n.version or "v1.0.0")[:32],
                backend=(n.backend or "OPENVINO")[:64],
                hostname=n.hostname,
                ebpf_drops=n.ebpf_drops or 0,
                mitigation_latency_us=n.mitigation_latency_us or 0.0,
                nexus_id=nexus_id,
                tenant_id=tenant.id,
                last_heartbeat=now,
            )
            db.add(node)
        else:
            node.tenant_id = tenant.id
            node.nexus_id = nexus_id
            node.site = n.site or node.site
            node.status = reported
            if n.cpu_pct is not None:
                node.cpu_pct = n.cpu_pct
            node.latency_us = n.mitigation_latency_us or n.latency_us or node.latency_us
            if n.eps is not None:
                node.eps = n.eps
            if n.version:
                node.version = n.version[:32]
            if n.backend:
                node.backend = n.backend[:64]
            if n.hostname:
                node.hostname = n.hostname
            if n.ebpf_drops is not None:
                node.ebpf_drops = n.ebpf_drops
            if n.mitigation_latency_us is not None:
                node.mitigation_latency_us = n.mitigation_latency_us
            node.last_heartbeat = now
        await db.flush()

        live_ids: set[str] = set()
        for s in n.sensors:
            if not s.sensor_id:
                continue
            live_ids.add(s.sensor_id)
            result = await db.execute(
                select(Sensor).where(Sensor.sensor_id == s.sensor_id)
            )
            sensor = result.scalar_one_or_none()
            if sensor is None:
                sensor = Sensor(
                    sensor_id=s.sensor_id[:128],
                    name=(s.name or s.sensor_id)[:255],
                    type=(s.type or "UNKNOWN")[:64],
                    protocol=(s.protocol or "UNKNOWN")[:64],
                    ip_address=s.ip_address,
                    reported_status=(s.status or "ACTIVE")[:32],
                    last_packet_seen_sec_ago=s.last_packet_seen_sec_ago,
                    last_seen=now,
                    node_node_id=n.node_id,
                    tenant_id=tenant.id,
                )
                db.add(sensor)
            else:
                sensor.node_node_id = n.node_id
                sensor.tenant_id = tenant.id
                if s.name:
                    sensor.name = s.name[:255]
                if s.type:
                    sensor.type = s.type[:64]
                if s.protocol:
                    sensor.protocol = s.protocol[:64]
                if s.ip_address:
                    sensor.ip_address = s.ip_address
                if s.status:
                    sensor.reported_status = s.status[:32]
                sensor.last_packet_seen_sec_ago = s.last_packet_seen_sec_ago
                sensor.last_seen = now
            sensors_seen += 1
        # Last-update wins: drop sensors of this node missing from payload.
        result = await db.execute(
            select(Sensor).where(
                Sensor.tenant_id == tenant.id,
                Sensor.node_node_id == n.node_id,
            )
        )
        for sensor in result.scalars().all():
            if sensor.sensor_id not in live_ids:
                await db.delete(sensor)
        await db.flush()

    await db.commit()
    return {
        "tenant_id": tenant.id,
        "nexus_id": nexus_id,
        "nodes_synced": len(body.nodes),
        "sensors_synced": sensors_seen,
    }


def _nexus_effective(nexus: NexusInstance, now: datetime) -> str:
    if _sec_ago(nexus.last_seen, now) is not None and _sec_ago(nexus.last_seen, now) <= OFFLINE_AFTER_SEC:  # type: ignore[operator]
        return "ONLINE"
    return "OFFLINE"


def _node_effective(node: Node, nexus_online: bool, now: datetime) -> str:
    if not nexus_online:
        return "UNREACHABLE"
    if _sec_ago(node.last_heartbeat, now) is None or _sec_ago(node.last_heartbeat, now) > OFFLINE_AFTER_SEC:  # type: ignore[operator]
        return "OFFLINE"
    reported = node.status.value if isinstance(node.status, NodeStatus) else str(node.status)
    return reported if reported in ("ONLINE", "DEGRADED", "MAINTENANCE") else "ONLINE"


def _sensor_effective(
    sensor: Sensor, node_status: str, now: datetime
) -> str:
    if node_status in ("OFFLINE", "UNREACHABLE"):
        return "SILENT"
    if _sec_ago(sensor.last_seen, now) is None or _sec_ago(sensor.last_seen, now) > OFFLINE_AFTER_SEC:  # type: ignore[operator]
        return "SILENT"
    gap = sensor.last_packet_seen_sec_ago
    if gap is not None and gap > FAULT_GAP_SEC:
        return "FAULT_NO_DATA"
    reported = (sensor.reported_status or "ACTIVE").upper()
    if reported in ("ACTIVE", "NOMINAL"):
        return "ACTIVE"
    if "FAULT" in reported or "NO_" in reported:
        return reported
    return "ACTIVE"


async def get_topology(db: AsyncSession, tenant_id: str) -> dict:
    """Read the last synced tree with computed effective statuses."""
    await ensure_topology_schema()
    now = _utcnow()

    result = await db.execute(
        select(NexusInstance)
        .where(NexusInstance.tenant_id == tenant_id)
        .order_by(NexusInstance.nexus_id)
    )
    nexuses = list(result.scalars().all())

    result = await db.execute(
        select(Node).where(Node.tenant_id == tenant_id).order_by(Node.node_id)
    )
    nodes = list(result.scalars().all())

    result = await db.execute(
        select(Sensor).where(Sensor.tenant_id == tenant_id).order_by(Sensor.sensor_id)
    )
    sensors = list(result.scalars().all())

    by_nexus: dict[str, list[Node]] = {}
    for node in nodes:
        by_nexus.setdefault(node.nexus_id or DEFAULT_NEXUS_ID, []).append(node)
    by_node: dict[str, list[Sensor]] = {}
    for sensor in sensors:
        by_node.setdefault(sensor.node_node_id, []).append(sensor)

    # Legacy nodes synced before nexus tracking still render under a
    # default hub so the tree never drops appliances.
    nexus_rows = list(nexuses)
    known_ids = {nx.nexus_id for nx in nexus_rows}
    for group_id in sorted(by_nexus):
        if group_id not in known_ids:
            nx = NexusInstance(
                nexus_id=group_id, tenant_id=tenant_id, status=NodeStatus.OFFLINE
            )
            nx.last_seen = None
            nexus_rows.append(nx)

    out_nexus = []
    summary = {
        "nexus_online": 0, "nexus_offline": 0,
        "nodes_online": 0, "nodes_degraded": 0,
        "nodes_offline": 0, "nodes_unreachable": 0,
        "sensors_active": 0, "sensors_fault": 0, "sensors_silent": 0,
    }
    for nx in sorted(nexus_rows, key=lambda r: r.nexus_id):
        nx_status = _nexus_effective(nx, now)
        summary["nexus_online" if nx_status == "ONLINE" else "nexus_offline"] += 1
        out_nodes = []
        for node in by_nexus.get(nx.nexus_id, []):
            st = _node_effective(node, nx_status == "ONLINE", now)
            key = {
                "ONLINE": "nodes_online", "DEGRADED": "nodes_degraded",
                "OFFLINE": "nodes_offline", "UNREACHABLE": "nodes_unreachable",
                "MAINTENANCE": "nodes_online",
            }.get(st, "nodes_offline")
            summary[key] += 1
            out_sensors = []
            for sensor in by_node.get(node.node_id, []):
                sst = _sensor_effective(sensor, st, now)
                if sst == "ACTIVE":
                    summary["sensors_active"] += 1
                elif "FAULT" in sst:
                    summary["sensors_fault"] += 1
                else:
                    summary["sensors_silent"] += 1
                out_sensors.append({
                    "sensor_id": sensor.sensor_id,
                    "name": sensor.name,
                    "type": sensor.type,
                    "protocol": sensor.protocol,
                    "ip_address": sensor.ip_address,
                    "reported_status": sensor.reported_status,
                    "status": sst,
                    "last_packet_seen_sec_ago": sensor.last_packet_seen_sec_ago,
                })
            reported = node.status.value if isinstance(node.status, NodeStatus) else str(node.status)
            out_nodes.append({
                "node_id": node.node_id,
                "site": node.site,
                "hostname": node.hostname,
                "reported_status": reported,
                "status": st,
                "cpu_pct": node.cpu_pct,
                "ebpf_drops": node.ebpf_drops,
                "mitigation_latency_us": node.mitigation_latency_us,
                "last_heartbeat_sec_ago": _sec_ago(node.last_heartbeat, now),
                "sensors": out_sensors,
            })
        out_nexus.append({
            "nexus_id": nx.nexus_id,
            "version": nx.version,
            "status": nx_status,
            "last_seen_sec_ago": _sec_ago(nx.last_seen, now),
            "nodes": out_nodes,
        })
    return {"tenant_id": tenant_id, "nexus": out_nexus, "summary": summary}
