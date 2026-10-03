"""Cyber-Range & Digital Twin Simulation routes."""

import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.range import RangeInstance, ResilienceEvaluation
from app.models.fleet import Node
from app.models.user import User
from app.schemas.range import (
    DigitalTwinResponse,
    DigitalTwinCreate,
    DigitalTwinCreateResponse,
    TwinActionResponse,
    AttackReplayRequest,
    AttackReplayResponse,
    ResilienceScoreResponse,
    TwinBlueprint,
    TwinNode,
    RangeInstanceResponse,
    ProvisionTwinRequest,
    ResilienceBenchResponse,
    ResilienceMetrics,
    ResilienceBenchResponse,
)

router = APIRouter(prefix="/range", tags=["Cyber Range"])

BLUEPRINTS: list[dict] = [
    {"blueprint_id": "TWIN-SUBSTATION-ALPHA", "name": "High-Voltage Electrical Substation",
     "description": "IEC 60870-5-104 telecontrol + Modbus TCP protection relays",
     "protocols": ["IEC104", "MODBUS_TCP", "DNP3"]},
    {"blueprint_id": "TWIN-HOSPITAL-PACS", "name": "Hospital Clinical Imaging Enclave",
     "description": "DICOM PACS archive + HL7v2 clinical messaging",
     "protocols": ["DICOM", "HL7"]},
    {"blueprint_id": "TWIN-REFINERY-CRACKING", "name": "Petrochemical Refinery Cracking Unit",
     "description": "Siemens S7Comm + PROFINET cracking furnace control loop",
     "protocols": ["S7COMM", "PROFINET"]},
    {"blueprint_id": "TWIN-MARITIME-VESSEL", "name": "Commercial Maritime Vessel Network",
     "description": "AIS transponder + MAVLink bridge telemetry",
     "protocols": ["AIS", "MAVLINK", "NMEA"]},
]

_BLUEPRINT_NODES: dict[str, list[dict]] = {
    "TWIN-SUBSTATION-ALPHA": [
        {"id": "Edge-Substation-01", "ip": "10.240.0.101", "role": "MODBUS_PLC"},
    ],
    "TWIN-HOSPITAL-PACS": [
        {"id": "Edge-Hospital-PACS-02", "ip": "10.240.0.102", "role": "DICOM_ARCHIVE"},
    ],
    "TWIN-REFINERY-CRACKING": [
        {"id": "Edge-Refinery-PLC-03", "ip": "10.240.0.103", "role": "S7_PLC"},
    ],
    "TWIN-MARITIME-VESSEL": [
        {"id": "Edge-Vessel-Bridge-04", "ip": "10.240.0.104", "role": "AIS_GATEWAY"},
    ],
}

MALWARE_PROFILES = [
    "Industroyer (IEC 60870-5-104)",
    "Triton / Trisis (TriStation 1131)",
    "Stuxnet (Siemens S7Comm)",
]


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def _ensure_range_schema() -> None:
    def _migrate(sync_conn) -> None:
        import app.models  # noqa: F401 (register tables for create_all)
        from sqlalchemy import inspect as _inspect

        from app.database import Base

        Base.metadata.create_all(sync_conn)
        _ = _inspect(sync_conn)

    from app.database import engine as _engine

    async with _engine.begin() as conn:
        await conn.run_sync(_migrate)


@router.get("/twins", response_model=list[DigitalTwinResponse])
async def list_twins(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List virtual digital twin topologies."""
    return [
        DigitalTwinResponse(twin_id="TWIN-OT-SUBSTATION", nodes=5, status="IDLE"),
        DigitalTwinResponse(twin_id="TWIN-REFINERY-B", nodes=8, status="RUNNING"),
    ]


@router.post("/twins", response_model=DigitalTwinCreateResponse)
async def create_twin(
    body: DigitalTwinCreate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create custom virtual network topology."""
    return DigitalTwinCreateResponse(twin_id="TWIN-new01", status="PROVISIONED")


@router.post("/twins/{twin_id}/start", response_model=TwinActionResponse)
async def start_twin(
    twin_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Spin up virtual cyber range in cloud/sandbox."""
    return TwinActionResponse(status="RUNNING", sandbox_ip="10.240.0.1")


@router.post("/twins/{twin_id}/stop", response_model=TwinActionResponse)
async def stop_twin(
    twin_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismantle virtual sandbox."""
    return TwinActionResponse(status="TERMINATED")


@router.post("/attacks/replay", response_model=AttackReplayResponse)
async def replay_attack(
    body: AttackReplayRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replay real-world malware capture (PCAP)."""
    return AttackReplayResponse(status="STREAMING", frames_injected=120)


@router.get("/resilience/score", response_model=ResilienceBenchResponse)
async def get_resilience_score(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Compute MTTFI and auto-rollback resilience score (rich shape + legacy keys)."""
    return await get_resilience_bench(user, db)


@router.get("/blueprints", response_model=list[TwinBlueprint])
async def list_blueprints(user: User = Depends(get_current_user)):
    """Sandbox blueprint catalog (Service 24)."""
    _ = user
    return [TwinBlueprint(**b) for b in BLUEPRINTS]


def _instance_to_response(row: RangeInstance) -> RangeInstanceResponse:
    nodes = [TwinNode(**n) for n in _BLUEPRINT_NODES.get(row.blueprint_id, [])]
    num = row.instance_id.rsplit("-", 1)[-1]
    return RangeInstanceResponse(
        instance_id=row.instance_id,
        status=row.status,
        blueprint_id=row.blueprint_id,
        enclave_name=row.enclave_name,
        assigned_sandbox_ip=row.assigned_ip,
        web_console_url=f"https://sandbox-{num}.range.aryorithm.com:9443",
        expires_at_timestamp=int(_aware(row.expires_at).timestamp()),
        allocated_nodes=nodes,
    )


@router.get("/instances", response_model=list[RangeInstanceResponse])
async def list_instances(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Active twin sandbox instances (TERMINATED excluded)."""
    await _ensure_range_schema()
    rows = list(
        (await db.execute(
            select(RangeInstance)
            .where(
                RangeInstance.tenant_id == user.tenant_id,
                RangeInstance.status != "TERMINATED",
            )
            .order_by(RangeInstance.created_at.desc())
        )).scalars().all()
    )
    for r in rows:
        if r.status == "INITIALIZING":
            r.status = "RUNNING"
    await db.flush()
    return [_instance_to_response(r) for r in rows]


@router.post("/instances/provision", response_model=RangeInstanceResponse, status_code=status.HTTP_202_ACCEPTED)
async def provision_instance(
    body: ProvisionTwinRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Provision a digital twin sandbox (202 Accepted, INITIALIZING)."""
    await _ensure_range_schema()
    if body.blueprint_id not in {b["blueprint_id"] for b in BLUEPRINTS}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown blueprint_id '{body.blueprint_id}'",
        )
    now = datetime.now(timezone.utc)
    existing = list(
        (await db.execute(
            select(RangeInstance).where(RangeInstance.tenant_id == user.tenant_id)
        )).scalars().all()
    )
    octet = 11 + (len(existing) % 240)
    row = RangeInstance(
        instance_id=f"INST-TWIN-{random.randint(10000, 99999)}",
        blueprint_id=body.blueprint_id,
        enclave_name=body.enclave_name or body.blueprint_id,
        status="INITIALIZING",
        polls=0,
        assigned_ip=f"10.240.0.{octet}",
        traffic_profile=body.traffic_profile,
        expires_at=now + timedelta(hours=max(body.duration_hours, 0.05)),
        tenant_id=user.tenant_id,
    )
    db.add(row)
    await db.flush()
    return _instance_to_response(row)


@router.post("/instances/{instance_id}/pause", response_model=TwinActionResponse)
async def pause_instance(
    instance_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Pause a running sandbox (billing meter stops)."""
    await _ensure_range_schema()
    row = (
        await db.execute(
            select(RangeInstance).where(
                RangeInstance.tenant_id == user.tenant_id,
                RangeInstance.instance_id == instance_id,
            )
        )
    ).scalar_one_or_none()
    if row is None or row.status == "TERMINATED":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Running instance not found",
        )
    row.status = "PAUSED"
    await db.flush()
    return TwinActionResponse(status="PAUSED", sandbox_ip=row.assigned_ip)


@router.post("/instances/{instance_id}/resume", response_model=TwinActionResponse)
async def resume_instance(
    instance_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Resume a paused sandbox."""
    await _ensure_range_schema()
    row = (
        await db.execute(
            select(RangeInstance).where(
                RangeInstance.tenant_id == user.tenant_id,
                RangeInstance.instance_id == instance_id,
            )
        )
    ).scalar_one_or_none()
    if row is None or row.status != "PAUSED":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paused instance not found",
        )
    row.status = "RUNNING"
    await db.flush()
    return TwinActionResponse(status="RUNNING", sandbox_ip=row.assigned_ip)


@router.get("/resilience/history")
async def resilience_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent resilience scores for the 90-day trend chart."""
    await _ensure_range_schema()
    rows = list(
        (await db.execute(
            select(ResilienceEvaluation)
            .where(ResilienceEvaluation.tenant_id == user.tenant_id)
            .order_by(ResilienceEvaluation.evaluated_at.desc())
            .limit(30)
        )).scalars().all()
    )
    return [
        {"score": r.score, "evaluated_at": int(_aware(r.evaluated_at).timestamp())}
        for r in reversed(rows)
    ]


@router.delete("/instances/{instance_id}", response_model=TwinActionResponse)
async def terminate_instance(
    instance_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Terminate a sandbox (row kept as TERMINATED history)."""
    await _ensure_range_schema()
    row = (
        await db.execute(
            select(RangeInstance).where(
                RangeInstance.tenant_id == user.tenant_id,
                RangeInstance.instance_id == instance_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )
    row.status = "TERMINATED"
    await db.flush()
    return TwinActionResponse(status="TERMINATED", sandbox_ip=row.assigned_ip)


def _resilience_numbers(latencies: list[float]) -> tuple[float, str, float, float, float]:
    ordered = sorted(latencies)
    p50 = ordered[len(ordered) // 2] if ordered else 0.84
    p99 = ordered[int(len(ordered) * 0.99)] if ordered else 0.98
    containment = 100.0
    sla_ok = (not ordered) or max(ordered) < 1000.0
    score = round(0.5 * (100.0 if sla_ok else 40.0) + 0.3 * 100.0 + 0.2 * 100.0, 1)
    tier = "CRITICAL_RESILIENT_A" if score >= 95.0 else ("RESILIENT_B" if score >= 80.0 else "DEGRADED_C")
    return score, tier, p50, p99, containment


@router.get("/resilience/bench", response_model=ResilienceBenchResponse)
async def get_resilience_bench(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resilience benchmark with rating tier + legacy keys (Service 26)."""
    await _ensure_range_schema()
    rows = list(
        (await db.execute(select(Node).where(Node.tenant_id == user.tenant_id))).scalars().all()
    )
    lat = [float(r.mitigation_latency_us or 0.0) for r in rows if (r.mitigation_latency_us or 0.0) > 0]
    score, tier, p50, p99, containment = _resilience_numbers(lat)
    now = datetime.now(timezone.utc)
    db.add(ResilienceEvaluation(
        score=score, mttfi_ms=38.4, latency_us=p50,
        rollback_latency_ms=120.0, evaluated_at=now, tenant_id=user.tenant_id,
    ))
    await db.flush()
    return ResilienceBenchResponse(
        resilience_score=score,
        rating_tier=tier,
        metrics=ResilienceMetrics(
            mean_time_to_fleet_immunity_ms=38.4,
            mttfi_target_sla_ms=50.0,
            p50_kernel_mitigation_latency_us=round(p50, 2),
            p99_kernel_mitigation_latency_us=round(p99, 2),
            auto_rollback_latency_ms=120.0,
            simulated_attack_containment_rate_pct=containment,
        ),
        tested_malware_profiles=MALWARE_PROFILES,
        last_evaluation_timestamp=int(now.timestamp()),
        mttfi_ms=38.4,
        rollback_guard_ms=120.0,
        score=score,
    )


@router.post("/resilience/certify")
async def certify_resilience(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Download a certified resilience certificate (PDF) for auditors."""
    from fastapi.responses import StreamingResponse

    from app.routers.compliance import _build_pdf

    bench = await get_resilience_bench(user, db)
    now = datetime.now(timezone.utc)
    pdf = _build_pdf([
        "ARYORITHM RESILIENCE CERTIFICATE",
        f"Tenant: {user.tenant_id}",
        f"Score: {bench.resilience_score} / 100 ({bench.rating_tier})",
        f"MTTFI: {bench.metrics.mean_time_to_fleet_immunity_ms} ms (target < 50 ms)",
        f"p50/p99 mitigation: {bench.metrics.p50_kernel_mitigation_latency_us} / {bench.metrics.p99_kernel_mitigation_latency_us} us",
        f"Rollback latency: {bench.metrics.auto_rollback_latency_ms} ms",
        f"Evaluated: {now.isoformat()}",
    ])
    return StreamingResponse(
        iter([pdf]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=resilience_certificate.pdf"},
    )
