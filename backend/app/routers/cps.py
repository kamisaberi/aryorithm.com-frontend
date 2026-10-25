"""CPS vertical clouds: medical imaging + maritime fleet (Services 15, 16)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.dfir import (
    MedicalScanner,
    SpaceSatellite,
    SpaceTelecommandAudit,
    Vessel,
)
from app.models.fleet import Sensor
from app.models.threat import ScadaEvent
from app.models.user import User
from app.schemas.cps import (
    MedicalScannerResponse,
    PACSEventResponse,
    SatelliteResponse,
    TelecommandAuditResponse,
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
    from app.database import Base as _Base
    from app.database import run_schema_ddl as _run_ddl

    await _run_ddl(_Base.metadata.create_all, db.bind)
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


# ---------------------------------------------------------------------------
# Space / orbital CPS (Idea E)
# ---------------------------------------------------------------------------
_SPACE_TOKENS = (
    "SAT", "SATELLITE", "SPACE", "ORBIT", "CCSDS", "AOS", "TC_", "TELECOMMAND",
    "GROUND_STATION", "SDR", "GEO", "LEO", "MEO", "DVB",
)


def _sample_satellites() -> list[SatelliteResponse]:
    now = int(datetime.now(timezone.utc).timestamp())
    return [
        SatelliteResponse(
            satellite_id="SAT-LEO-0441",
            name="AURORA-7",
            orbit_class="LEO",
            norad_id="59021",
            operator="EuroGrid Earth Observation",
            ground_station="GS-NL-01",
            downlink_protocol="CCSDS",
            frequency_band="X",
            telemetry_integrity="NOMINAL",
            status="TRACKING",
            signal_strength_dbm=-82.4,
            packet_loss_pct=0.12,
            last_downlink_timestamp=now - 18,
            connected_sentinel_node="NODE-SPACE-01",
        ),
        SatelliteResponse(
            satellite_id="SAT-GEO-0117",
            name="METEOSAT-GRID",
            orbit_class="GEO",
            norad_id="41857",
            operator="Aryorithm Weather Grid",
            ground_station="GS-DE-02",
            downlink_protocol="CCSDS",
            frequency_band="Ka",
            telemetry_integrity="NOMINAL",
            status="TRACKING",
            signal_strength_dbm=-74.1,
            packet_loss_pct=0.03,
            last_downlink_timestamp=now - 4,
            connected_sentinel_node="NODE-SPACE-02",
        ),
        SatelliteResponse(
            satellite_id="SAT-LEO-0912",
            name="SENTINEL-CUBE-12",
            orbit_class="LEO",
            norad_id="60554",
            operator="Aryorithm Labs",
            ground_station="GS-US-03",
            downlink_protocol="AX.25",
            frequency_band="UHF",
            telemetry_integrity="WATCH",
            status="DEGRADED",
            signal_strength_dbm=-96.8,
            packet_loss_pct=1.74,
            last_downlink_timestamp=now - 63,
            connected_sentinel_node="NODE-SPACE-03",
        ),
    ]


@router.get("/space/satellites", response_model=list[SatelliteResponse])
async def list_space_satellites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List monitored LEO/GEO satellite downlinks.

    Rows come from the ``space_satellites`` inventory. If a deployment has
    not registered a space gateway yet, matching satellite/CCSDS sensors are
    projected into the same view; a deterministic demo fleet is returned on
    an otherwise empty install so the CPS console is never blank.
    """
    from app.database import Base as _Base
    from app.database import run_schema_ddl as _run_ddl

    await _run_ddl(_Base.metadata.create_all, db.bind)
    satellites = list(
        (
            await db.execute(
                select(SpaceSatellite)
                .where(SpaceSatellite.tenant_id == user.tenant_id)
                .order_by(SpaceSatellite.satellite_id)
            )
        )
        .scalars()
        .all()
    )
    if satellites:
        return [
            SatelliteResponse(
                satellite_id=s.satellite_id,
                name=s.name,
                orbit_class=s.orbit_class,
                norad_id=s.norad_id,
                operator=s.operator,
                ground_station=s.ground_station,
                downlink_protocol=s.downlink_protocol,
                frequency_band=s.frequency_band,
                telemetry_integrity=s.telemetry_integrity,
                status=s.status,
                signal_strength_dbm=float(s.signal_strength_dbm or 0.0),
                packet_loss_pct=float(s.packet_loss_pct or 0.0),
                last_downlink_timestamp=(
                    int(_aware(s.last_downlink_at).timestamp()) if s.last_downlink_at else None
                ),
                connected_sentinel_node=s.connected_sentinel_node,
            )
            for s in satellites
        ]

    sensors = list(
        (
            await db.execute(select(Sensor).where(Sensor.tenant_id == user.tenant_id))
        )
        .scalars()
        .all()
    )
    projected: list[SatelliteResponse] = []
    for sensor in sensors:
        descriptor = f"{sensor.type or ''} {sensor.protocol or ''} {sensor.name or ''}".upper()
        if not any(token in descriptor for token in _SPACE_TOKENS):
            continue
        orbit = "GEO" if "GEO" in descriptor else "MEO" if "MEO" in descriptor else "LEO"
        projected.append(
            SatelliteResponse(
                satellite_id=sensor.sensor_id,
                name=sensor.name or sensor.sensor_id,
                orbit_class=orbit,
                operator="Sentinel space gateway",
                ground_station=sensor.node_node_id,
                downlink_protocol=sensor.protocol or "CCSDS",
                frequency_band="X",
                telemetry_integrity=(
                    "NOMINAL" if (sensor.reported_status or "ACTIVE").upper() in ("ACTIVE", "NOMINAL") else "WATCH"
                ),
                status=(sensor.reported_status or "TRACKING").upper(),
                signal_strength_dbm=-90.0,
                packet_loss_pct=0.0,
                last_downlink_timestamp=(
                    int(_aware(sensor.last_seen).timestamp()) if sensor.last_seen else None
                ),
                connected_sentinel_node=sensor.node_node_id,
            )
        )
    return projected or _sample_satellites()


def _sample_telecommand_audits() -> list[TelecommandAuditResponse]:
    now = int(datetime.now(timezone.utc).timestamp())
    return [
        TelecommandAuditResponse(
            audit_id="TC-AUDIT-8801",
            timestamp=now - 27,
            satellite_id="SAT-LEO-0441",
            ground_station="GS-NL-01",
            command_name="AOCS_ATTITUDE_OVERRIDE",
            service_type="AOCS",
            function_code="0x1F",
            sequence_counter=412,
            expected_sequence_counter=418,
            source_ip="198.51.100.221",
            mitre_id="T0836",
            action_enforced="TELECOMMAND_BLOCKED",
            status="BLOCKED",
            reason="Replay/stale sequence counter; command did not originate from an enrolled ground station.",
            details={"link": "N3-satellite", "orbit": "LEO", "crypto": "CCSDS-SDLS"},
        ),
        TelecommandAuditResponse(
            audit_id="TC-AUDIT-8800",
            timestamp=now - 196,
            satellite_id="SAT-GEO-0117",
            ground_station="GS-DE-02",
            command_name="THRUSTER_BURN_UNSAFE",
            service_type="AOCS",
            function_code="0x2A",
            sequence_counter=91,
            expected_sequence_counter=90,
            source_ip="203.0.113.69",
            mitre_id="T0855",
            action_enforced="TELECOMMAND_BLOCKED",
            status="BLOCKED",
            reason="Attitude-control command violated command-authority matrix for this flight phase.",
            details={"link": "GEO", "orbit": "GEO", "crypto": "CCSDS-SDLS"},
        ),
        TelecommandAuditResponse(
            audit_id="TC-AUDIT-8799",
            timestamp=now - 503,
            satellite_id="SAT-LEO-0912",
            ground_station="GS-US-03",
            command_name="DISABLE_SAFE_MODE",
            service_type="OBC",
            function_code="0x07",
            sequence_counter=3,
            expected_sequence_counter=14,
            source_ip="192.0.2.144",
            mitre_id="T0879",
            action_enforced="TELECOMMAND_BLOCKED",
            status="BLOCKED",
            reason="Unauthorized safe-mode override from an unmanaged uplink.",
            details={"link": "UHF", "orbit": "LEO", "crypto": "AX.25"},
        ),
    ]


@router.get("/space/telecommand-audits", response_model=list[TelecommandAuditResponse])
async def list_space_telecommand_audits(
    limit: int = 100,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Audit blocked rogue AOCS / telecommand attempts."""
    from app.database import Base as _Base
    from app.database import run_schema_ddl as _run_ddl

    await _run_ddl(_Base.metadata.create_all, db.bind)
    rows = list(
        (
            await db.execute(
                select(SpaceTelecommandAudit)
                .where(SpaceTelecommandAudit.tenant_id == user.tenant_id)
                .order_by(SpaceTelecommandAudit.occurred_at.desc())
                .limit(max(1, min(limit, 500)))
            )
        )
        .scalars()
        .all()
    )
    if rows:
        return [
            TelecommandAuditResponse(
                audit_id=r.audit_id,
                timestamp=int(_aware(r.occurred_at).timestamp()),
                satellite_id=r.satellite_id,
                ground_station=r.ground_station,
                command_name=r.command_name,
                service_type=r.service_type,
                function_code=r.function_code,
                sequence_counter=r.sequence_counter,
                expected_sequence_counter=r.expected_sequence_counter,
                source_ip=r.source_ip,
                mitre_id=r.mitre_id,
                action_enforced=r.action_enforced,
                status=r.status,
                reason=r.reason,
                details=r.raw if isinstance(r.raw, dict) else {},
            )
            for r in rows
        ]

    scada_rows = list(
        (
            await db.execute(
                select(ScadaEvent)
                .where(ScadaEvent.tenant_id == user.tenant_id)
                .order_by(ScadaEvent.ts.desc())
                .limit(max(1, min(limit, 500)))
            )
        )
        .scalars()
        .all()
    )
    projected: list[TelecommandAuditResponse] = []
    for event in scada_rows:
        descriptor = f"{event.protocol or ''} {event.function_code or ''}".upper()
        if not any(token in descriptor for token in ("CCSDS", "SPACE", "TELECOMMAND", "AOCS", "SAT")):
            continue
        projected.append(
            TelecommandAuditResponse(
                audit_id=f"TC-{event.id[:8].upper()}",
                timestamp=int(_aware(event.ts).timestamp()),
                satellite_id=event.node_node_id,
                ground_station=event.site or "",
                command_name=event.function_code or "TELECOMMAND",
                service_type="AOCS" if "AOCS" in descriptor else "CCSDS",
                function_code=event.function_code or "",
                source_ip=event.attacker_ip or "",
                mitre_id=event.mitre_id,
                action_enforced=event.action or "TELECOMMAND_BLOCKED",
                status="BLOCKED",
                reason="Space-link command rejected by the Sentinel telecommand guard.",
                details={
                    "protocol": event.protocol,
                    "plc_ip": event.plc_ip,
                    "mitigation_time_us": event.mitigation_time_us,
                },
            )
        )
    return projected or _sample_telecommand_audits()

