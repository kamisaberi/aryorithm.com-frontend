"""CPS vertical clouds: medical imaging + maritime fleet (Services 15, 16)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.dfir import MedicalScanner, Vessel
from app.models.fleet import Sensor
from app.models.threat import ScadaEvent
from app.models.user import User
from app.schemas.cps import (
    MedicalScannerResponse,
    PACSEventResponse,
    VesselResponse,
)

router = APIRouter(prefix="/cps", tags=["CPS Verticals"])


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("/medical/scanners", response_model=list[MedicalScannerResponse])
async def list_medical_scanners(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Radiology scanner inventory; live status from Level-3 MEDICAL_PACS sensors."""
    from app.database import engine as _engine
    from app.database import Base as _Base

    async with _engine.begin() as _conn:
        await _conn.run_sync(_Base.metadata.create_all)
    scanners = list(
        (await db.execute(
            select(MedicalScanner).where(MedicalScanner.tenant_id == user.tenant_id)
        )).scalars().all()
    )
    sensors = {
        s.sensor_id: s
        for s in (
            await db.execute(
                select(Sensor).where(Sensor.tenant_id == user.tenant_id)
            )
        ).scalars().all()
    }
    out = []
    for sc in scanners:
        linked = next(
            (s for sid, s in sensors.items()
             if (sc.ip_address and sc.ip_address in sid) or sc.scanner_id == sid),
            None,
        )
        active = (
            linked is not None
            and (linked.reported_status or "").upper() == "ACTIVE"
            and linked.last_seen is not None
            and (datetime.now(timezone.utc) - _aware(linked.last_seen)).total_seconds() <= 30
        )
        out.append(MedicalScannerResponse(
            scanner_id=sc.scanner_id,
            name=sc.name,
            ae_title=sc.ae_title,
            ip_address=sc.ip_address,
            department=sc.department,
            connected_sentinel_node=sc.node_node_id,
            status="SECURE_ACTIVE" if active else "FAULT_NO_DATA",
            unencrypted_hl7_detected=False,
            last_cstore_timestamp=int(_aware(linked.last_seen).timestamp()) if linked and linked.last_seen else None,
        ))
    return out


@router.get("/medical/pacs-events", response_model=list[PACSEventResponse])
async def list_pacs_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """PACS exfiltration alerts derived from DICOM threat events."""
    from sqlalchemy import or_

    rows = list(
        (await db.execute(
            select(ScadaEvent)
            .where(
                ScadaEvent.tenant_id == user.tenant_id,
                or_(
                    ScadaEvent.protocol.like("DICOM%"),
                    ScadaEvent.function_code.like("%C-STORE%"),
                ),
            )
            .order_by(ScadaEvent.ts.desc())
            .limit(50)
        )).scalars().all()
    )
    return [
        PACSEventResponse(
            event_id=f"MED-SEC-{1000 + i}",
            timestamp=int(_aware(r.ts).timestamp()),
            ae_title="PACS_ARCHIVE_MAIN",
            source_ip=r.plc_ip or "",
            destination_ip=r.attacker_ip,
            anomaly_type="UNAUTHORIZED_CSTORE_EXFILTRATION",
            mitre_id=r.mitre_id or "T1048 (Exfiltration Over Alternative Protocol)",
            action_enforced=r.action,
            mitigation_latency_us=r.mitigation_time_us,
            details=f"High-volume transfer to non-whitelisted endpoint ({r.function_code}).",
        )
        for i, r in enumerate(rows)
    ]


@router.get("/maritime/vessels", response_model=list[VesselResponse])
async def list_vessels(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Vessel fleet portal with spoofing flags and bandwidth savings."""
    from sqlalchemy import func, select as _select

    vessels = list(
        (await db.execute(
            select(Vessel).where(Vessel.tenant_id == user.tenant_id)
        )).scalars().all()
    )
    threat_counts = {
        node_id: count
        for node_id, count in (
            await db.execute(
                _select(ScadaEvent.node_node_id, func.count())
                .where(ScadaEvent.tenant_id == user.tenant_id)
                .group_by(ScadaEvent.node_node_id)
            )
        ).all()
    }
    return [
        VesselResponse(
            vessel_mmsi=v.vessel_mmsi,
            vessel_name=v.vessel_name,
            vessel_type=v.vessel_type,
            current_lat=v.current_lat,
            current_lng=v.current_lng,
            satellite_link_status=v.satellite_link_status,
            bandwidth_saved_mb=v.bandwidth_saved_mb,
            connected_sentinel_node=v.node_node_id,
            active_threats_count=threat_counts.get(v.node_node_id, 0),
            spoofing_detected=v.spoofing_detected,
        )
        for v in vessels
    ]
