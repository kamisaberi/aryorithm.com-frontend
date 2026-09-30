"""Fleet Management, Enclaves & Hardware ZTP routes."""

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
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
)

router = APIRouter(prefix="/fleet", tags=["Fleet Management"])

logger = logging.getLogger("uvicorn.error")


def _check_nexus_api_key(x_api_key: str | None) -> None:
    """Validate Nexus X-API-Key header (dev default: ary_dev_secret_key_8000)."""
    if not x_api_key or x_api_key != settings.NEXUS_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
        )


@router.post("/sync", response_model=FleetSyncResponse)
async def fleet_sync(
    body: FleetSyncRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
):
    """Nexus edge-collector heartbeat — called every ~5s.

    Headers: X-API-Key, X-Tenant-ID.
    Body: { tenant_id, nodes_count, nodes: [...] }.
    """
    _check_nexus_api_key(x_api_key)
    tenant_id = x_tenant_id or body.tenant_id
    # Print to uvicorn terminal (both logger + print for visibility).
    logger.info(
        "POST /api/v1/fleet/sync tenant_id=%s nodes_count=%s nodes=%s "
        "headers={X-API-Key: ****, X-Tenant-ID: %s}",
        body.tenant_id,
        body.nodes_count,
        [n.node_id for n in body.nodes],
        tenant_id,
    )
    print(
        f"[fleet/sync] tenant_id={body.tenant_id} "
        f"header_tenant={tenant_id} nodes_count={body.nodes_count} "
        f"nodes={[n.model_dump() for n in body.nodes]}",
        flush=True,
    )
    return FleetSyncResponse(
        status="synced",
        tenant_id=tenant_id,
        nodes_count=body.nodes_count,
        synced=len(body.nodes),
    )


@router.get("/nodes", response_model=list[NodeResponse])
async def list_nodes(
    status: str | None = Query(None),
    backend: str | None = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all registered edge appliances."""
    # TODO: Implement with actual DB query
    return [
        NodeResponse(
            node_id="NODE-8fa9",
            site="Substation-01",
            status="ONLINE",
            cpu_pct=14.2,
            latency_us=0.84,
            eps=1250000,
            version="v2.4.1",
            backend="OPENVINO",
        ),
        NodeResponse(
            node_id="NODE-9b2c",
            site="Substation-02",
            status="ONLINE",
            cpu_pct=8.7,
            latency_us=0.79,
            eps=980000,
            version="v2.4.1",
            backend="OPENVINO",
        ),
    ]


@router.get("/nodes/{node_id}", response_model=NodeDetailResponse)
async def get_node(node_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Single node telemetry & ring buffer inspector."""
    return NodeDetailResponse(
        node_id=node_id,
        ring_buffer_fill_pct=4,
        kernel_drops=420,
        hardware={"cpu": "ARM Cortex-A76", "tpm": "TPM 2.0", "memory_mb": 4096},
    )


@router.post("/nodes/{node_id}/restart", response_model=NodeActionResponse)
async def restart_node(
    node_id: str,
    body: NodeRestartRequest,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Issue remote graceful daemon restart."""
    return NodeActionResponse(status="RESTART_DISPATCHED", node_id=node_id)


@router.delete("/nodes/{node_id}", response_model=NodeActionResponse)
async def decommission_node(
    node_id: str,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Decommission / unregister edge appliance."""
    return NodeActionResponse(status="DECOMMISSIONED", node_id=node_id)


@router.get("/enclaves", response_model=list[EnclaveResponse])
async def list_enclaves(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List physical enclaves/zones (OT, Medical, DMZ)."""
    return [
        EnclaveResponse(enclave_id="CRITICAL_OT", name="Critical OT", max_latency_us=800, node_count=14),
        EnclaveResponse(enclave_id="MEDICAL_ZONE", name="Medical Zone", max_latency_us=500, node_count=8),
        EnclaveResponse(enclave_id="DMZ_PERIMETER", name="DMZ Perimeter", max_latency_us=1000, node_count=22),
    ]


@router.post("/enclaves", response_model=EnclaveCreateResponse)
async def create_enclave(
    body: EnclaveCreate,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new site/enclave zone."""
    return EnclaveCreateResponse(status="CREATED", enclave_id=body.enclave_id)


@router.post("/provisioning/tokens", response_model=ZTPTokenResponse)
async def generate_ztp_token(
    body: ZTPTokenRequest,
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate Zero-Touch Provisioning (ZTP) token."""
    from datetime import datetime, timedelta
    return ZTPTokenResponse(
        token="ZTP-eyJhbGciOiJIUzI1NiIs...",
        expires_at=datetime.utcnow() + timedelta(days=body.valid_days),
    )


@router.post("/provisioning/enroll", response_model=ZTPEnrollResponse)
async def enroll_appliance(body: ZTPEnrollRequest):
    """Appliance hardware registration (TPM quote)."""
    return ZTPEnrollResponse(assigned_node_id="NODE-new01", heartbeat_sec=5)


@router.get("/kernel-rules", response_model=list[KernelRuleResponse])
async def list_kernel_rules(
    ip: str | None = Query(None),
    user: dict = Depends(get_current_user),
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
    user: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Emergency purge false-positive IP across fleet."""
    return KernelPurgeResponse(status="PURGED_FLEET_WIDE", ip=body.ip)
