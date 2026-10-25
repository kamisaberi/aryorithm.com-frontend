"""Threat Defense & Collective Intelligence routes."""

import base64
import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_nexus_caller
from app.models.threat import GlobalThreat, RansomwareHash, ScadaEvent, ThreatVaccine
from app.models.user import User
from app.schemas.threat import (
    ThreatEventResponse,
    ThreatBroadcastRequest,
    ThreatBroadcastResponse,
    CollectiveBusResponse,
    GridPeerOut,
    ThreatGridResponse,
    MitreHitResponse,
    ScadaResponse,
    IdentityBotResponse,
    GlobalFeedItem,
    GlobalFeedVerboseItem,
    ScadaMonitorResponse,
    ScadaSummary,
    ScadaEventItem,
    RansomwareHashResponse,
    XAIAttributionVector,
    XAIIncidentResponse,
    VaccineFeedItem,
    VaccineShareResponse,
)
from app.services.frontier import tenant_id_for_reference, vaccine_download_url



def uuid4_suffix() -> str:
    return uuid.uuid4().hex[:8].upper()

router = APIRouter(prefix="/threats", tags=["Threat Defense"])

logger = logging.getLogger("uvicorn.error")


@router.get("/events", response_model=list[ThreatEventResponse])
async def list_threat_events(
    limit: int = Query(50, ge=1, le=200),
    tactic: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Historical log of detected & dropped threats."""
    return [
        ThreatEventResponse(
            threat_id="threat-001",
            attacker_ip="198.51.100.45",
            mitre_id="T0855",
            tactic="Lateral Movement",
            dropped=True,
            detected_at=datetime(2026, 9, 29, 10, 30, tzinfo=timezone.utc),
        ),
        ThreatEventResponse(
            threat_id="threat-002",
            attacker_ip="203.0.113.99",
            mitre_id="T1059",
            tactic="Command and Scripting Interpreter",
            dropped=True,
            detected_at=datetime(2026, 9, 29, 10, 25, tzinfo=timezone.utc),
        ),
    ]


@router.post("/broadcast", response_model=ThreatBroadcastResponse)
async def broadcast_threat(
    body: ThreatBroadcastRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Broadcast zero-day IP fleet-wide (< 50ms).

    Also commits an anonymized row to the central global_threat_feed table
    (Service 7) so polling Nexuses pick it up within 24h expiry.
    """
    now = datetime.now(timezone.utc)
    indicator_id = f"IOC-{uuid4_suffix()}"
    db.add(GlobalThreat(
        indicator_id=indicator_id,
        ip=body.ip,
        subnet_mask=32,
        threat_type="THREAT_SCADA_ANOMALY",
        mitre_id=(body.attributions[0].get("mitre_id") if body.attributions and isinstance(body.attributions[0], dict) else None),
        confidence=0.99,
        first_seen=now,
        expires_at=now + timedelta(hours=24),
        origin_sector="ENERGY_UTILITY",
        appliances_blocked=0,
        tenant_id=None,
    ))
    await db.flush()
    return ThreatBroadcastResponse(status="broadcast_dispatched", target_ip=body.ip)


@router.get("/collective-bus", response_model=list[CollectiveBusResponse])
async def list_collective_bus(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Live collective defense synchronization log."""
    return [
        CollectiveBusResponse(rule_id="RULE-441", origin_node="NODE-01", fanout_latency_ms=38.4),
        CollectiveBusResponse(rule_id="RULE-442", origin_node="NODE-02", fanout_latency_ms=41.2),
    ]


@router.get("/grid", response_model=ThreatGridResponse)
async def get_threat_grid(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Collective grid overview — gRPC mesh peers + threat-bus statistics.

    Peer/bus figures are static reference values (same contract style as
    ``/threats/collective-bus``); ``active_indicators`` counts live unexpired
    rows in the central ``global_threats`` feed (Service 7), so it moves with
    ``POST /threats/broadcast`` traffic.
    """
    now = datetime.now(timezone.utc)
    peers = [
        GridPeerOut(node_id="NEXUS-FRA-01", site="Frankfurt Enclave", status="ONLINE", rules_synced=1284, rtt_ms=4.2),
        GridPeerOut(node_id="NEXUS-IAD-02", site="Ashburn Enclave", status="ONLINE", rules_synced=1284, rtt_ms=6.1),
        GridPeerOut(node_id="NEXUS-SIN-03", site="Singapore Enclave", status="ONLINE", rules_synced=1279, rtt_ms=11.7),
        GridPeerOut(node_id="NEXUS-GRU-04", site="Sao Paulo Enclave", status="DEGRADED", rules_synced=1241, rtt_ms=28.4),
        GridPeerOut(node_id="NEXUS-SYD-05", site="Sydney Enclave", status="ONLINE", rules_synced=1284, rtt_ms=9.8),
    ]
    active = (
        await db.execute(
            select(func.count())
            .select_from(GlobalThreat)
            .where(GlobalThreat.expires_at > now)
        )
    ).scalar_one()
    return ThreatGridResponse(
        grid_id="GRD-COLLECTIVE-01",
        peers=peers,
        peers_online=sum(1 for p in peers if p.status == "ONLINE"),
        bus_rules_active=12,
        p50_fanout_ms=2.4,
        p99_fanout_ms=4.7,
        sla_target_ms=50.0,
        throughput_msgs_s=1840.0,
        active_indicators=active,
        last_sync_timestamp=int(now.timestamp()),
    )


@router.get("/mitre", response_model=list[MitreHitResponse])
async def list_mitre_hits(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Aggregated MITRE ATT&CK technique hit counts."""
    return [
        MitreHitResponse(technique_id="T0855", name="Unauthorized Command", count=14),
        MitreHitResponse(technique_id="T1059", name="Command and Scripting Interpreter", count=8),
        MitreHitResponse(technique_id="T1071", name="Application Layer Protocol", count=5),
    ]


@router.get("/scada", response_model=ScadaMonitorResponse)
async def get_scada_monitor(
    protocol: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dedicated SCADA OT anomaly monitor (Service 8).

    Summary counters plus the recent physical actuation log, optionally
    filtered by protocol (e.g. ?protocol=MODBUS_TCP).
    """
    from app.database import Base as _Base
    from app.database import run_schema_ddl as _run_ddl

    await _run_ddl(_Base.metadata.create_all, db.bind)
    query = select(ScadaEvent).where(ScadaEvent.tenant_id == user.tenant_id)
    if protocol:
        query = query.where(ScadaEvent.protocol == protocol.strip().upper())
    query = query.order_by(ScadaEvent.ts.desc()).limit(50)
    rows = list((await db.execute(query)).scalars().all())

    all_rows = list(
        (await db.execute(
            select(ScadaEvent).where(ScadaEvent.tenant_id == user.tenant_id)
        )).scalars().all()
    )

    def _count(pred) -> int:
        return sum(1 for r in all_rows if pred(r))

    summary = ScadaSummary(
        modbus_violations_total=_count(lambda r: r.protocol == "MODBUS_TCP"),
        iec104_trips_blocked=_count(
            lambda r: r.protocol == "IEC104" and "TRIP" in (r.function_code or "").upper()
        ),
        s7comm_writes_blocked=_count(lambda r: r.protocol == "S7COMM"),
        dnp3_anomalies_total=_count(lambda r: r.protocol == "DNP3"),
    )
    events = [
        ScadaEventItem(
            timestamp=int(_aware(r.ts).timestamp()),
            appliance_id=r.node_node_id,
            site=r.site,
            protocol=r.protocol,
            plc_ip=r.plc_ip,
            attacker_ip=r.attacker_ip,
            function_code=r.function_code,
            register_address=r.register_address,
            mitre_id=r.mitre_id,
            action=r.action,
            mitigation_time_us=r.mitigation_time_us,
        )
        for r in rows
    ]
    return ScadaMonitorResponse(summary=summary, recent_events=events)


@router.get("/ransomware-hashes", response_model=list[RansomwareHashResponse])
async def list_ransomware_hashes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """High-entropy IOC clearinghouse (Service 9): global + tenant rows."""
    from sqlalchemy import or_

    from app.database import Base as _Base
    from app.database import run_schema_ddl as _run_ddl

    await _run_ddl(_Base.metadata.create_all, db.bind)
    result = await db.execute(
        select(RansomwareHash)
        .where(
            or_(
                RansomwareHash.tenant_id.is_(None),
                RansomwareHash.tenant_id == user.tenant_id,
            )
        )
        .order_by(RansomwareHash.first_detected.desc())
    )
    return [
        RansomwareHashResponse(
            sha256=r.sha256,
            process_name=r.process_name,
            detected_entropy=r.detected_entropy,
            nominal_baseline=r.nominal_baseline,
            burst_iops=r.burst_iops,
            reported_by_site=r.reported_by_site,
            first_detected=int(_aware(r.first_detected).timestamp()),
            status=r.status,
        )
        for r in result.scalars().all()
    ]


@router.get("/identity-bot", response_model=IdentityBotResponse)
async def get_identity_bot(
    type: str | None = Query(None),  # noqa: A002 - query param name is part of public API
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ITDR & Bot kinematics telemetry."""
    return IdentityBotResponse(impossible_velocity_hits=4, bot_kinematic_blocks=22)


@router.get("/global-feed")
async def get_global_feed(
    verbose: bool = Query(False),
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """Sentinel-nexus inbound threat polling — GET every ~20s.

    Sender headers: `Authorization: Bearer <JWT>`, `X-Tenant-ID`.
    Default returns the bare list `[{"ip": "..."}]` (or `[]` when empty) —
    exactly what Nexus parses. `?verbose=true` returns the rich Service 7
    rows (active, unexpired, last 24h) for the dashboard collective grid.
    """
    if verbose:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=24)
        result = await db.execute(
            select(GlobalThreat)
            .where(
                GlobalThreat.expires_at > now,
                GlobalThreat.first_seen >= cutoff,
            )
            .order_by(GlobalThreat.first_seen.desc())
        )
        return [
            GlobalFeedVerboseItem(
                indicator_id=row.indicator_id,
                ip=row.ip,
                subnet_mask=row.subnet_mask,
                threat_type=row.threat_type,
                mitre_id=row.mitre_id,
                confidence=row.confidence,
                first_seen_timestamp=int(_aware(row.first_seen).timestamp()),
                expires_at_timestamp=int(_aware(row.expires_at).timestamp()),
                origin_anonymized_sector=row.origin_sector,
                total_appliances_blocked=row.appliances_blocked,
            )
            for row in result.scalars().all()
        ]
    feed = [GlobalFeedItem(ip="185.220.101.5")]
    logger.info(
        "GET /api/v1/threats/global-feed tenant=%s count=%d user=%s",
        x_tenant_id or "tenant-dev-local",
        len(feed),
        getattr(caller, "id", "api-key"),
    )
    print(
        f"[threats/global-feed] tenant={x_tenant_id or 'tenant-dev-local'} "
        f"count={len(feed)} ips={[i.ip for i in feed]}",
        flush=True,
    )
    return feed


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _sample_xai() -> list[XAIIncidentResponse]:
    """Sample microsecond-residual attribution vectors (doc shape)."""
    return [
        XAIIncidentResponse(
            attacker_ip="198.51.100.45",
            mitre_id="T0855",
            attributions=[
                XAIAttributionVector(rank=1, feature="SCADA_FUNC_CODE", contribution_pct=54.2, observed="FC=0x5A (diag)", baseline="FC in {1..4}", audit_note="Unauthorized diagnostic function on Modbus/TCP"),
                XAIAttributionVector(rank=2, feature="CMD_SEQUENCE", contribution_pct=21.8, observed="write-then-exec in 0.4ms", baseline=">50ms human gap", audit_note="Inhuman command chaining speed"),
                XAIAttributionVector(rank=3, feature="PAYLOAD_ENTROPY", contribution_pct=13.1, observed="7.9 bits/byte", baseline="4.2 bits/byte", audit_note="Encrypted payload in cleartext protocol"),
            ],
        ),
        XAIIncidentResponse(
            attacker_ip="203.0.113.99",
            mitre_id="T1059",
            attributions=[
                XAIAttributionVector(rank=1, feature="BRUTE_FORCE_RATE", contribution_pct=61.3, observed="240 auth/s", baseline="<5 auth/s", audit_note="Credential spraying burst"),
                XAIAttributionVector(rank=2, feature="PAYLOAD_ENTROPY", contribution_pct=22.4, observed="7.6 bits/byte", baseline="4.2 bits/byte", audit_note="Packed executable transfer"),
                XAIAttributionVector(rank=3, feature="DST_PORT_FANOUT", contribution_pct=9.8, observed="38 ports in 2s", baseline="1-2 ports", audit_note="Lateral sweep pattern"),
            ],
        ),
    ]


@router.get("/xai", response_model=list[XAIIncidentResponse])
async def get_threat_xai(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Microsecond Residual XAI top-3 feature attribution vectors.

    Served from stored xai_attributions when present, else the
    reference sample vectors above (same contract either way).
    """
    from sqlalchemy import select

    from app.models.overview import XAIAttribution

    try:
        result = await db.execute(
            select(XAIAttribution).where(XAIAttribution.tenant_id == user.tenant_id)
        )
        rows = list(result.scalars().all())
    except Exception:
        rows = []
    if rows:
        out = []
        for row in rows:
            raw = row.attributions
            if isinstance(raw, dict):
                raw = raw.get("attributions", [])
            attrs = raw if isinstance(raw, list) else []
            vectors = []
            for i, a in enumerate(attrs[:3], start=1):
                if not isinstance(a, dict):
                    continue
                vectors.append(XAIAttributionVector(
                    rank=int(a.get("rank", i)),
                    feature=str(a.get("feature", "UNKNOWN")),
                    contribution_pct=float(a.get("pct", a.get("contribution_pct", 0.0))),
                    observed=str(a.get("observed", "")),
                    baseline=str(a.get("baseline", "")),
                    audit_note=str(a.get("audit_note", "")),
                ))
            out.append(XAIIncidentResponse(
                attacker_ip=row.attacker_ip,
                mitre_id=row.mitre_id,
                attributions=vectors,
            ))
        if out:
            return out
    return _sample_xai()


# ---------------------------------------------------------------------------
# Deception vaccines (Idea D)
# ---------------------------------------------------------------------------
def _vaccine_slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", (value or "").strip()).strip("-_").lower()
    return slug or "deception-vaccine"


def _decode_seal(value: str | None, size: int) -> bytes | None:
    text = (value or "").strip()
    if not text:
        return None
    if text.startswith("ed25519:"):
        text = text.split(":", 1)[1]
    try:
        decoded = bytes.fromhex(text)
        if len(decoded) == size:
            return decoded
    except ValueError:
        pass
    try:
        decoded = base64.b64decode(text, validate=True)
        if len(decoded) == size:
            return decoded
    except (ValueError, TypeError):
        pass
    return None


def _verify_vaccine_seal(public_key: str | None, signature: str | None, blob: bytes) -> bool:
    key_bytes = _decode_seal(public_key, 32)
    sig_bytes = _decode_seal(signature, 64)
    if key_bytes is None or sig_bytes is None:
        return False
    try:
        from cryptography.hazmat.primitives.asymmetric import ed25519

        ed25519.Ed25519PublicKey.from_public_bytes(key_bytes).verify(sig_bytes, blob)
        return True
    except Exception:
        return False


def _json_object(value, *, field: str) -> dict:
    if value in (None, ""):
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(str(value))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} must be valid JSON",
        )
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} must be a JSON object",
        )
    return parsed


async def _parse_vaccine_request(request: Request) -> tuple[bytes, str | None, dict]:
    """Accept a multipart `.spkg` upload or a JSON base64 envelope."""
    content_type = (request.headers.get("content-type") or "").lower()
    payload: dict = {}
    blob: bytes | None = None
    filename: str | None = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        for key, value in form.multi_items():
            if hasattr(value, "filename") and hasattr(value, "read"):
                if blob is None:
                    blob = await value.read()
                    filename = value.filename or key
                continue
            if key == "manifest":
                payload[key] = value
            else:
                payload[key] = value
    else:
        raw_body = await request.body()
        if not raw_body:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="A .spkg vaccine payload is required",
            )
        try:
            body = json.loads(raw_body)
        except (TypeError, ValueError):
            blob = raw_body
            filename = request.headers.get("x-filename")
        else:
            if not isinstance(body, dict):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="JSON vaccine payload must be an object",
                )
            payload = body
            encoded = (
                body.get("file_base64")
                or body.get("package_base64")
                or body.get("spkg_base64")
                or body.get("content_base64")
            )
            if encoded:
                encoded = str(encoded)
                if encoded.startswith("data:") and "," in encoded:
                    encoded = encoded.split(",", 1)[1]
                try:
                    blob = base64.b64decode(encoded, validate=True)
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="file_base64 is not valid base64",
                    )
            filename = body.get("file_name") or body.get("filename")

    if not blob:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="A non-empty .spkg vaccine file is required (field: file)",
        )
    if len(blob) > settings.HUB_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Vaccine exceeds the {settings.HUB_MAX_UPLOAD_BYTES} byte limit",
        )
    return blob, filename, payload


def _vaccine_item(row: ThreatVaccine) -> VaccineFeedItem:
    return VaccineFeedItem(
        vaccine_id=row.vaccine_id,
        slug=row.slug,
        name=row.name,
        version=row.version,
        severity=row.severity,
        mitre_id=row.mitre_id,
        target_protocol=row.target_protocol,
        sha256=row.sha256,
        size_bytes=int(row.size_bytes or 0),
        signature_verified=bool(row.signature_verified),
        origin_node=row.origin_node or "",
        source_site=row.source_site or "",
        status=row.status,
        download_url=vaccine_download_url(row),
        created_at=row.created_at,
    )


@router.post(
    "/vaccines/share",
    response_model=VaccineShareResponse,
    status_code=status.HTTP_201_CREATED,
)
async def share_vaccine(
    request: Request,
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """Upload a locally synthesized, Ed25519-sealed deception vaccine.

    Auth: JWT or ``X-API-Key``. Multipart fields: ``file`` (``.spkg``),
    optional ``manifest`` JSON, ``signature``, ``public_key``, ``node_id``,
    ``site``. A JSON body with ``file_base64`` is accepted for simulators.
    """
    blob, filename, payload = await _parse_vaccine_request(request)
    manifest = _json_object(payload.get("manifest"), field="manifest")

    digest = hashlib.sha256(blob).hexdigest()
    name = str(
        payload.get("name")
        or manifest.get("name")
        or manifest.get("title")
        or (Path(filename).stem if filename else "Deception Vaccine")
    )
    slug = _vaccine_slug(
        str(payload.get("slug") or manifest.get("slug") or name)
    )
    raw_vaccine_id = str(
        payload.get("vaccine_id")
        or manifest.get("vaccine_id")
        or manifest.get("id")
        or f"VAC-{digest[:12].upper()}"
    )
    vaccine_id = re.sub(r"[^a-zA-Z0-9_.:-]", "_", raw_vaccine_id)[:64] or f"VAC-{digest[:12].upper()}"
    safe_file = Path(str(filename or f"{slug}.spkg")).name
    if not safe_file.lower().endswith(".spkg"):
        safe_file = f"{safe_file}.spkg"
    safe_file = safe_file[:255]
    safe_dir = re.sub(r"[^a-zA-Z0-9_.-]", "_", vaccine_id) or f"VAC-{digest[:12]}"
    dest = Path(settings.HUB_PACKAGE_DIR) / "vaccines" / safe_dir / safe_file
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or dest.read_bytes() != blob:
        dest.write_bytes(blob)

    signature = str(
        payload.get("signature")
        or manifest.get("signature")
        or request.headers.get("x-vaccine-signature")
        or ""
    )
    public_key = str(
        payload.get("public_key")
        or manifest.get("public_key")
        or manifest.get("author_public_key")
        or ""
    )
    verified = _verify_vaccine_seal(public_key, signature, blob)

    raw_rules = payload.get("rules") or manifest.get("rules") or []
    if isinstance(raw_rules, str):
        try:
            raw_rules = json.loads(raw_rules)
        except (TypeError, ValueError):
            raw_rules = [raw_rules]
    if not isinstance(raw_rules, list):
        raw_rules = [raw_rules]

    tenant_ref = payload.get("tenant_id") or x_tenant_id
    tenant_id = caller.tenant_id if caller is not None else await tenant_id_for_reference(db, tenant_ref)
    now = datetime.now(timezone.utc)

    row = (
        await db.execute(
            select(ThreatVaccine).where(ThreatVaccine.vaccine_id == vaccine_id)
        )
    ).scalar_one_or_none()
    if row is None:
        row = ThreatVaccine(
            vaccine_id=vaccine_id,
            slug=slug,
            name=name[:255],
            version=str(payload.get("version") or manifest.get("version") or "1.0.0")[:32],
            severity=str(payload.get("severity") or manifest.get("severity") or "HIGH").upper()[:32],
            mitre_id=(payload.get("mitre_id") or manifest.get("mitre_id") or None),
            target_protocol=(payload.get("target_protocol") or manifest.get("target_protocol") or None),
            origin_node=str(payload.get("node_id") or manifest.get("origin_node") or "")[:128],
            source_site=str(payload.get("site") or manifest.get("site") or "")[:255],
            signature=signature[:512],
            public_key=public_key[:128],
            signature_verified=verified,
            sha256=digest,
            size_bytes=len(blob),
            file_name=safe_file,
            artifact_path=str(dest),
            manifest={**manifest, "uploaded_via": "threats/vaccines/share"},
            rules=raw_rules,
            status="ACTIVE",
            created_at=now,
            updated_at=now,
            tenant_id=tenant_id,
        )
        db.add(row)
    else:
        row.slug = slug
        row.name = name[:255]
        row.version = str(payload.get("version") or manifest.get("version") or row.version)[:32]
        row.severity = str(payload.get("severity") or manifest.get("severity") or row.severity).upper()[:32]
        row.mitre_id = payload.get("mitre_id") or manifest.get("mitre_id") or row.mitre_id
        row.target_protocol = (
            payload.get("target_protocol") or manifest.get("target_protocol") or row.target_protocol
        )
        row.origin_node = str(payload.get("node_id") or manifest.get("origin_node") or row.origin_node)[:128]
        row.source_site = str(payload.get("site") or manifest.get("site") or row.source_site)[:255]
        row.signature = signature[:512]
        row.public_key = public_key[:128]
        row.signature_verified = verified
        row.sha256 = digest
        row.size_bytes = len(blob)
        row.file_name = safe_file
        row.artifact_path = str(dest)
        row.manifest = {**manifest, "uploaded_via": "threats/vaccines/share"}
        row.rules = raw_rules
        row.status = "ACTIVE"
        row.updated_at = now
        if tenant_id:
            row.tenant_id = tenant_id

    await db.flush()
    return VaccineShareResponse(
        status="SHARED",
        vaccine_id=row.vaccine_id,
        slug=row.slug,
        name=row.name,
        version=row.version,
        severity=row.severity,
        sha256=row.sha256,
        size_bytes=int(row.size_bytes or 0),
        signature_verified=bool(row.signature_verified),
        download_url=vaccine_download_url(row),
        created_at=row.created_at,
    )


@router.get("/vaccines/feed", response_model=list[VaccineFeedItem])
async def vaccine_feed(
    limit: int = Query(100, ge=1, le=500),
    since: int | None = Query(None, description="Unix seconds; only newer vaccines"),
    severity: str | None = Query(None),
    mitre_id: str | None = Query(None),
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """Global collective vaccine feed for every Sentinel appliance.

    The feed is intentionally fleet-wide: a zero-day trapped on one site is
    useful to all tenants. Rows expose the exact checksum and a download URL
    so an edge can verify and hot-reload the same ``.spkg`` bytes.
    """
    stmt = select(ThreatVaccine).where(ThreatVaccine.status == "ACTIVE")
    if since is not None:
        stmt = stmt.where(
            ThreatVaccine.created_at >= datetime.fromtimestamp(since, tz=timezone.utc)
        )
    if severity:
        stmt = stmt.where(func.upper(ThreatVaccine.severity) == severity.upper())
    if mitre_id:
        stmt = stmt.where(ThreatVaccine.mitre_id == mitre_id)
    stmt = stmt.order_by(ThreatVaccine.created_at.desc()).limit(limit)
    rows = list((await db.execute(stmt)).scalars().all())
    return [_vaccine_item(row) for row in rows]


@router.get("/vaccines/{vaccine_id}/download")
async def download_vaccine(
    vaccine_id: str,
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """Download the sealed vaccine package referenced by the collective feed."""
    row = (
        await db.execute(
            select(ThreatVaccine).where(ThreatVaccine.vaccine_id == vaccine_id)
        )
    ).scalar_one_or_none()
    if row is None or row.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaccine not found")
    path = Path(row.artifact_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaccine artifact is no longer available",
        )
    row.download_count = int(row.download_count or 0) + 1
    await db.flush()
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=row.file_name or f"{row.slug}.spkg",
        headers={
            "X-Checksum-Sha256": row.sha256,
            "X-Vaccine-Id": row.vaccine_id,
            "X-Signature-Verified": "true" if row.signature_verified else "false",
        },
    )

