"""Shared state helpers for the frontier (post-audit) route groups.

The functions here keep the 5G slice counters, live-SBOM drift audit and
fleet-wide TRiSM governance policy consistent across ingesters and readers.
They intentionally operate on the request's ``AsyncSession`` so a
``fleet/sync`` heartbeat and a dashboard read see the same last-update state.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Iterable

import yaml
from sqlalchemy import select

from app.models.compliance import SbomDriftEvent
from app.models.fleet import GtpSliceSnapshot, Node
from app.models.threat import ThreatVaccine
from app.models.user import Tenant


# ---------------------------------------------------------------------------
# generic helpers
# ---------------------------------------------------------------------------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def iso(value: datetime | None) -> str | None:
    normalized = as_aware(value)
    return normalized.isoformat().replace("+00:00", "Z") if normalized else None


def enum_value(value: Any) -> str:
    return str(getattr(value, "value", value))


def parse_timestamp(value: Any, default: datetime | None = None) -> datetime:
    """Parse epoch seconds/milliseconds or an ISO-8601 timestamp."""
    if isinstance(value, datetime):
        return as_aware(value) or utcnow()
    if isinstance(value, (int, float)):
        seconds = float(value)
        if seconds > 10_000_000_000:  # milliseconds
            seconds /= 1000.0
        try:
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return default or utcnow()
    if isinstance(value, str) and value.strip():
        raw = value.strip().replace("Z", "+00:00")
        try:
            return as_aware(datetime.fromisoformat(raw)) or utcnow()
        except ValueError:
            pass
    return default or utcnow()


async def tenant_id_for_reference(db, reference: str | None) -> str | None:
    """Resolve an id/name slug from an API-key heartbeat, if it exists."""
    ref = (reference or "").strip()
    if not ref:
        return None
    row = await db.get(Tenant, ref)
    if row is not None:
        return row.id
    row = (await db.execute(select(Tenant).where(Tenant.name == ref))).scalar_one_or_none()
    return row.id if row is not None else None


# ---------------------------------------------------------------------------
# 5G N3 GTP-U snapshots
# ---------------------------------------------------------------------------
def _gtp_row(snapshot: GtpSliceSnapshot, node: Node | None) -> dict:
    slice_drops = int(snapshot.gtp_slice_violations_dropped or 0)
    unmapped = int(snapshot.unmapped_teids_dropped or 0)
    return {
        "node_id": snapshot.node_id,
        "site": (node.site if node is not None else "") or "",
        "status": enum_value(node.status) if node is not None else "UNKNOWN",
        "active_teids": int(snapshot.active_teids or 0),
        "gtp_slice_violations_dropped": slice_drops,
        "unmapped_teids_dropped": unmapped,
        "total_slice_drops": slice_drops + unmapped,
        "n3_peer": snapshot.n3_peer,
        "s_nssai": snapshot.s_nssai if isinstance(snapshot.s_nssai, list) else [],
        "last_updated": iso(snapshot.updated_at),
    }


def _gtp_summary(rows: list[dict]) -> dict:
    return {
        "reporting_nodes": len(rows),
        "active_teids": sum(int(r["active_teids"]) for r in rows),
        "gtp_slice_violations_dropped": sum(
            int(r["gtp_slice_violations_dropped"]) for r in rows
        ),
        "unmapped_teids_dropped": sum(int(r["unmapped_teids_dropped"]) for r in rows),
        "total_dropped": sum(int(r["total_slice_drops"]) for r in rows),
        "affected_nodes": sum(1 for r in rows if int(r["total_slice_drops"]) > 0),
    }


async def gtp_rows(db, tenant_id: str) -> list[dict]:
    snapshots = list(
        (
            await db.execute(
                select(GtpSliceSnapshot)
                .where(GtpSliceSnapshot.tenant_id == tenant_id)
                .order_by(GtpSliceSnapshot.node_id)
            )
        )
        .scalars()
        .all()
    )
    nodes = {
        row.node_id: row
        for row in (
            await db.execute(select(Node).where(Node.tenant_id == tenant_id))
        )
        .scalars()
        .all()
    }
    return [_gtp_row(snapshot, nodes.get(snapshot.node_id)) for snapshot in snapshots]


async def fiveg_telemetry_payload(db, tenant_id: str) -> dict:
    rows = await gtp_rows(db, tenant_id)
    summary = _gtp_summary(rows)
    return {
        "tenant_id": tenant_id,
        "generated_at": int(utcnow().timestamp()),
        "summary": summary,
        "active_teids": summary["active_teids"],
        "gtp_slice_violations_dropped": summary["gtp_slice_violations_dropped"],
        "unmapped_teids_dropped": summary["unmapped_teids_dropped"],
        "total_dropped": summary["total_dropped"],
        "n3_gtp_u": {
            "active_teids": summary["active_teids"],
            "gtp_slice_violations_dropped": summary["gtp_slice_violations_dropped"],
            "unmapped_teids_dropped": summary["unmapped_teids_dropped"],
        },
        "slices": rows,
        "nodes": rows,
    }


async def fiveg_compliance_payload(db, tenant_id: str) -> dict:
    rows = await gtp_rows(db, tenant_id)
    summary = _gtp_summary(rows)
    total_dropped = int(summary["total_dropped"])
    if summary["reporting_nodes"] == 0:
        overall_status = "COMPLIANT"
        score = 100.0
    elif total_dropped == 0:
        overall_status = "COMPLIANT"
        score = 100.0
    else:
        overall_status = "NON_COMPLIANT"
        score = round(max(0.0, 100.0 - min(float(total_dropped), 100.0)), 1)

    findings: list[dict] = [
        {
            "control": "3GPP TS 33.501 §5.8",
            "title": "S-NSSAI slice isolation",
            "status": "PASS" if total_dropped == 0 else "FAIL",
            "evidence": (
                f"{summary['gtp_slice_violations_dropped']} slice violations and "
                f"{summary['unmapped_teids_dropped']} unmapped TEIDs dropped across "
                f"{summary['reporting_nodes']} reporting N3 nodes."
            ),
        },
        {
            "control": "NIS2 Article 21.2(e)",
            "title": "Network security & access control",
            "status": "PASS" if total_dropped == 0 else "ATTENTION",
            "evidence": "GTP-U TEID allow-list enforced in-kernel before N6 encapsulation.",
        },
    ]
    s_nssai: list = []
    for row in rows:
        for entry in row.get("s_nssai") or []:
            if isinstance(entry, dict):
                enriched = dict(entry)
                enriched.setdefault("node_id", row["node_id"])
                s_nssai.append(enriched)

    return {
        "framework": "3GPP TS 23.501 / TS 33.501",
        "standard": "5G Standalone S-NSSAI slice isolation",
        "generated_at": int(utcnow().timestamp()),
        "overall_status": overall_status,
        "compliance_score_pct": score,
        "slice_isolation_verified": total_dropped == 0,
        "nis2_article": "Article 21.2(e) — network security and access control",
        "summary": summary,
        "s_nssai": s_nssai,
        "findings": findings,
        "audited_nodes": summary["reporting_nodes"],
    }


# ---------------------------------------------------------------------------
# live-SBOM drift ingestion
# ---------------------------------------------------------------------------
def _event_fingerprint(node_id: str, sbom_sha: str, index: int, event: dict) -> str:
    try:
        body = json.dumps(event, sort_keys=True, separators=(",", ":"), default=str)
    except (TypeError, ValueError):
        body = str(event)
    digest = hashlib.sha256(f"{node_id}:{sbom_sha}:{index}:{body}".encode()).hexdigest()
    return f"SBOM-{digest[:32]}"


def normalize_drift_event(event: Any, index: int = 0) -> dict:
    if isinstance(event, str):
        event = {"reason": event}
    if not isinstance(event, dict):
        event = {"details": event}
    raw = dict(event)
    return {
        "event_id": str(raw.get("event_id") or raw.get("id") or ""),
        "event_type": str(
            raw.get("event_type")
            or raw.get("type")
            or raw.get("violation_type")
            or "MPROTECT_PROT_EXEC_BLOCKED"
        ),
        "severity": str(raw.get("severity") or "CRITICAL").upper(),
        "process_name": str(raw.get("process_name") or raw.get("process") or raw.get("comm") or ""),
        "pid": _optional_int(raw.get("pid")),
        "address": str(raw["address"]) if raw.get("address") is not None else None,
        "action": str(raw.get("action") or raw.get("action_enforced") or "SIGKILL"),
        "mitre_id": raw.get("mitre_id"),
        "reason": str(raw.get("reason") or raw.get("detail") or raw.get("message") or ""),
        "occurred_at": parse_timestamp(
            raw.get("timestamp") or raw.get("occurred_at") or raw.get("ts")
        ),
        "raw": raw,
    }


def _optional_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


async def ingest_drift_events(
    db,
    *,
    tenant_id: str,
    node_id: str,
    events: Iterable[Any] | None,
    sbom_sha256: str = "",
    attestation_id: str | None = None,
    source: str = "SBOM_ATTESTATION",
    fallback_count: int = 0,
    received_at: datetime | None = None,
) -> list[SbomDriftEvent]:
    """Persist normalized drift events, de-duplicating repeat heartbeats."""
    received = as_aware(received_at) or utcnow()
    candidates = [event for event in (events or [])]
    if not candidates and int(fallback_count or 0) > 0:
        candidates = [
            {
                "event_type": "MPROTECT_PROT_EXEC_BLOCKED",
                "severity": "CRITICAL",
                "action": "SIGKILL",
                "reason": (
                    f"{int(fallback_count)} in-kernel W^X violation(s) reported by "
                    f"{node_id}; edge eBPF terminated the offending task."
                ),
            }
        ]

    created: list[SbomDriftEvent] = []
    for index, candidate in enumerate(candidates):
        normalized = normalize_drift_event(candidate, index)
        event_id = normalized.pop("event_id") or _event_fingerprint(
            node_id, sbom_sha256, index, normalized["raw"]
        )
        exists = (
            await db.execute(
                select(SbomDriftEvent).where(SbomDriftEvent.event_id == event_id)
            )
        ).scalar_one_or_none()
        if exists is not None:
            continue
        row = SbomDriftEvent(
            event_id=event_id,
            node_id=node_id,
            attestation_id=attestation_id,
            event_type=normalized["event_type"][:64],
            severity=normalized["severity"][:16],
            process_name=normalized["process_name"][:255],
            pid=normalized["pid"],
            address=normalized["address"],
            action=normalized["action"][:64],
            mitre_id=normalized["mitre_id"],
            reason=normalized["reason"],
            source=source[:32],
            raw=normalized["raw"],
            occurred_at=normalized["occurred_at"],
            received_at=received,
            tenant_id=tenant_id,
        )
        db.add(row)
        created.append(row)
    if created:
        await db.flush()
    return created


async def sbom_drift_payload(
    db,
    tenant_id: str,
    *,
    limit: int = 100,
    node_id: str | None = None,
    since: datetime | None = None,
    severity: str | None = None,
    event_type: str | None = None,
) -> list[dict]:
    stmt = select(SbomDriftEvent).where(SbomDriftEvent.tenant_id == tenant_id)
    if node_id:
        stmt = stmt.where(SbomDriftEvent.node_id == node_id)
    if since is not None:
        stmt = stmt.where(SbomDriftEvent.occurred_at >= as_aware(since))
    if severity:
        stmt = stmt.where(SbomDriftEvent.severity == severity.upper())
    if event_type:
        stmt = stmt.where(SbomDriftEvent.event_type == event_type)
    rows = list(
        (
            await db.execute(
                stmt.order_by(SbomDriftEvent.occurred_at.desc()).limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "event_id": row.event_id,
            "timestamp": int((as_aware(row.occurred_at) or utcnow()).timestamp()),
            "node_id": row.node_id,
            "attestation_id": row.attestation_id,
            "event_type": row.event_type,
            "severity": row.severity,
            "process_name": row.process_name,
            "pid": row.pid,
            "address": row.address,
            "action": row.action,
            "mitre_id": row.mitre_id,
            "reason": row.reason,
            "source": row.source,
            "details": row.raw if isinstance(row.raw, dict) else {},
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# AI TRiSM fleet-wide policy
# ---------------------------------------------------------------------------
DEFAULT_BLOCKED_DELIMITERS = [
    "<|im_start|>",
    "<|im_end|>",
    "<|system|>",
    "### System:",
    "[INST]",
    "[/INST]",
]
DEFAULT_FORBIDDEN_TOOLS = [
    "shell_exec",
    "plc_write",
    "register_write",
    "modbus_write",
    "s7_write",
    "firmware_flash",
]
DEFAULT_ALLOWED_TOOLS = [
    "read_tags",
    "query_historian",
    "get_alarms",
    "lookup_manual",
]
DEFAULT_BLOCKED_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?(prior|previous|above)",
    r"system\s+instructions?\s+override",
    r"do anything now",
    r"developer\s+mode",
]


async def ensure_trism_policy(db):
    from app.models.ai import TrismPolicy

    row = (
        await db.execute(
            select(TrismPolicy).where(TrismPolicy.policy_id == "fleet-default")
        )
    ).scalar_one_or_none()
    if row is None:
        row = TrismPolicy(
            policy_id="fleet-default",
            version=1,
            blocked_prompt_delimiters=list(DEFAULT_BLOCKED_DELIMITERS),
            forbidden_tools=list(DEFAULT_FORBIDDEN_TOOLS),
            allowed_tools=list(DEFAULT_ALLOWED_TOOLS),
            blocked_patterns=list(DEFAULT_BLOCKED_PATTERNS),
            require_human_approval=True,
            updated_by="system",
        )
        db.add(row)
        await db.flush()
    return row


def _clean_list(values: Iterable[Any]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        text = str(value).strip()
        if text and text not in seen:
            seen.add(text)
            out.append(text)
    return out


def trism_policy_payload(row) -> dict:
    blocked = list(row.blocked_prompt_delimiters or [])
    forbidden = list(row.forbidden_tools or [])
    document = {
        "policy_id": row.policy_id,
        "version": row.version,
        "blocked_prompt_delimiters": blocked,
        "forbidden_tools": forbidden,
        "allowed_tools": list(row.allowed_tools or []),
        "blocked_patterns": list(row.blocked_patterns or []),
        "require_human_approval": bool(row.require_human_approval),
        "updated_by": row.updated_by or "",
    }
    rendered = yaml.safe_dump(document, sort_keys=False, allow_unicode=True).strip()
    return {
        **document,
        # Convenience aliases used by the dashboard and edge copilot.
        "blocked_delimiters": blocked,
        "blocked_tools": forbidden,
        "updated_at": as_aware(row.updated_at) or utcnow(),
        "policy_yaml": rendered,
        "yaml": rendered,
    }


async def update_trism_policy(db, body: dict, updated_by: str) -> dict:
    row = await ensure_trism_policy(db)
    changed = False

    blocked = body.get("blocked_prompt_delimiters")
    if blocked is None:
        blocked = body.get("blocked_delimiters")
    if blocked is not None:
        row.blocked_prompt_delimiters = _clean_list(blocked)
        changed = True

    forbidden = body.get("forbidden_tools")
    if forbidden is None:
        forbidden = body.get("blocked_tools")
    if forbidden is not None:
        row.forbidden_tools = _clean_list(forbidden)
        changed = True

    if body.get("allowed_tools") is not None:
        row.allowed_tools = _clean_list(body["allowed_tools"])
        changed = True
    if body.get("blocked_patterns") is not None:
        row.blocked_patterns = _clean_list(body["blocked_patterns"])
        changed = True
    if body.get("require_human_approval") is not None:
        row.require_human_approval = bool(body["require_human_approval"])
        changed = True

    if changed:
        row.version = int(row.version or 0) + 1
        row.updated_by = updated_by
        row.updated_at = utcnow()
        await db.flush()
    return trism_policy_payload(row)


# ---------------------------------------------------------------------------
# vaccine helpers
# ---------------------------------------------------------------------------
def vaccine_download_url(vaccine: ThreatVaccine) -> str:
    return f"/api/v1/threats/vaccines/{vaccine.vaccine_id}/download"
