"""AI Model Lifecycle & Silicon Acceleration routes."""

from fastapi import APIRouter, Depends, Header, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin, get_nexus_caller
from app.models.ai import CompileTask, TrismAuditLog
from app.models.user import User
from app.schemas.ai import (
    ModelResponse,
    ModelUploadResponse,
    OTAStatusResponse,
    OTAStageRequest,
    OTAStageResponse,
    OTAResponse,
    ForgeDatasetResponse,
    ForgeTrainRequest,
    ForgeTrainResponse,
    CompileRequest,
    CompileResponse,
    CompileStatusResponse,
    TrismRequest,
    TrismResponse,
)

router = APIRouter(prefix="/ai", tags=["AI & Silicon"])


@router.get("/models", response_model=list[ModelResponse])
async def list_models(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List versioned ONNX threat models (legacy alias of GET /api/v1/models)."""
    from app.services.model_inventory import list_models_for_tenant, to_metadata_response

    rows = await list_models_for_tenant(db, user.tenant_id)
    return [ModelResponse(**to_metadata_response(m)) for m in rows]


@router.post("/models/upload", response_model=ModelUploadResponse)
async def upload_model(
    file: UploadFile = File(...),
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload new ONNX model artifact."""
    return ModelUploadResponse(model_id="v3.0", sha256="sha256-hash", status="STORED")


@router.get("/ota/status", response_model=OTAStatusResponse)
async def get_ota_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Current canary staged rollout status."""
    from app.services import ota as ota_service

    data = await ota_service.get_status(db, user.tenant_id)
    return OTAStatusResponse(
        stable_version=data["stable_version"],
        candidate_version=data["candidate_version"],
        stage=data["stage"],
    )


@router.post("/ota/stage", response_model=OTAStageResponse)
async def stage_ota(
    body: OTAStageRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stage candidate weights into SHADOW_MODE."""
    from app.services import ota as ota_service

    data = await ota_service.stage_candidate(
        db, user.tenant_id, body.version, body.sha256, body.url
    )
    return OTAStageResponse(status=data["status"], stage=data["stage"])


@router.post("/ota/advance", response_model=OTAResponse)
async def advance_ota(user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Advance rollout (Shadow -> 5% -> Fleet)."""
    from app.services import ota as ota_service

    data = await ota_service.advance(db, user.tenant_id)
    return OTAResponse(status=data["status"], new_stage=data["new_stage"])


@router.post("/ota/rollback", response_model=OTAResponse)
async def rollback_ota(user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Emergency rollback to previous stable model."""
    from app.services import ota as ota_service

    data = await ota_service.rollback(db, user.tenant_id)
    return OTAResponse(status=data["status"], active=data["active"])


@router.get("/forge/datasets", response_model=list[ForgeDatasetResponse])
async def list_forge_datasets(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List curated edge NetFlow active-learning batches."""
    return [
        ForgeDatasetResponse(dataset_id="ds-001", samples=2500, high_uncertainty=420),
        ForgeDatasetResponse(dataset_id="ds-002", samples=1800, high_uncertainty=290),
    ]


@router.post("/forge/train", response_model=ForgeTrainResponse)
async def trigger_training(
    body: ForgeTrainRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Trigger cloud/on-prem continuous adaptation job."""
    return ForgeTrainResponse(job_id="TRAIN-891", status="QUEUED")


@router.post("/compiler/compile", response_model=CompileResponse, status_code=status.HTTP_201_CREATED)
async def compile_model(
    file: UploadFile = File(...),
    target_silicon: str = Form("INTEL_OPENVINO"),
    precision: str = Form("FP16"),
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Cross-compile an uploaded ONNX model for target silicon (Service 4).

    Accepts multipart form: `file` (.onnx), `target_silicon`, `precision`.
    Returns 202-style QUEUED task; poll the task endpoint to advance the
    simulated worker to COMPLETED, then download the artifact.
    """
    import hashlib as _hashlib
    import random as _random
    from pathlib import Path as _Path

    await _ensure_ai_schema()
    target = (target_silicon or "").strip().upper()
    allowed = {"ROCKCHIP_RKNN", "NVIDIA_TENSORRT", "INTEL_OPENVINO", "HAILO_8", "QUALCOMM_QNN"}
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown target_silicon '{target_silicon}'. Use one of {sorted(allowed)}.",
        )
    prec = (precision or "FP16").strip().upper()
    if prec not in ("FP32", "FP16", "INT8"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="precision must be FP32, FP16, or INT8.",
        )
    blob = await file.read()
    if not blob:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    task_id = f"COMP-{_random.randint(10000, 99999)}"
    art_dir = _Path(__file__).resolve().parent.parent.parent / "storage" / "artifacts" / task_id
    art_dir.mkdir(parents=True, exist_ok=True)
    (art_dir / "input.onnx").write_bytes(blob)
    db.add(CompileTask(
        task_id=task_id,
        model_id=file.filename or "model.onnx",
        model_name=file.filename or "model.onnx",
        target=target,
        precision=prec,
        status="QUEUED",
        polls=0,
        size_bytes=len(blob),
        tenant_id=user.tenant_id,
    ))
    await db.flush()
    return CompileResponse(
        task_id=task_id,
        model_name=file.filename or "model.onnx",
        target_silicon=target,
        status="QUEUED",
        estimated_seconds=15,
    )


_ARTIFACT_EXT = {
    "ROCKCHIP_RKNN": ".rknn",
    "NVIDIA_TENSORRT": ".engine",
    "INTEL_OPENVINO": ".xml",
    "HAILO_8": ".hef",
    "QUALCOMM_QNN": ".bin",
}
_SPEEDUP = {"INT8": "4.2x", "FP16": "1.8x", "FP32": "1.0x"}


def _build_artifact(upload: bytes, target: str) -> bytes:
    """Deterministic simulated compiled artifact derived from the upload."""
    import hashlib as _hashlib

    digest = _hashlib.sha256(upload).digest()
    header = b"XFIRMV1:" + target.encode() + b":" + digest.hex().encode() + b"\n"
    tag = (target + ":").encode()
    body = bytes(b ^ tag[i % len(tag)] for i, b in enumerate(upload))
    return header + body


@router.get("/compiler/tasks/{task_id}", response_model=CompileStatusResponse)
async def get_compile_status(
    task_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Poll compilation status; advances QUEUED -> COMPILING -> COMPLETED."""
    import hashlib as _hashlib
    from datetime import datetime as _dt
    from datetime import timezone as _tz
    from pathlib import Path as _Path

    from sqlalchemy import select as _select

    await _ensure_ai_schema()
    task = (
        await db.execute(
            _select(CompileTask).where(
                CompileTask.tenant_id == user.tenant_id,
                CompileTask.task_id == task_id,
            )
        )
    ).scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compile task not found",
        )
    task.polls = (task.polls or 0) + 1
    if task.polls == 1:
        task.status = "COMPILING"
        await db.flush()
        return CompileStatusResponse(task_id=task.task_id, status="COMPILING")
    if task.status != "COMPLETED":
        art_dir = _Path(__file__).resolve().parent.parent.parent / "storage" / "artifacts" / task.task_id
        upload = (art_dir / "input.onnx").read_bytes()
        ext = _ARTIFACT_EXT.get(task.target, ".bin")
        stem = (task.model_name or "model.onnx").rsplit(".", 1)[0]
        out_name = f"{stem}{ext}"
        blob = _build_artifact(upload, task.target)
        (art_dir / out_name).write_bytes(blob)
        task.status = "COMPLETED"
        task.size_bytes = len(blob)
        task.completed_at = _dt.now(_tz.utc)
        task.download_url = f"/api/v1/ai/compiler/artifacts/{task.task_id}/{out_name}"
        await db.flush()
    stem = (task.model_name or "model.onnx").rsplit(".", 1)[0]
    out_name = f"{stem}{_ARTIFACT_EXT.get(task.target, '.bin')}"
    return CompileStatusResponse(
        task_id=task.task_id,
        status=task.status,
        output_filename=out_name,
        sha256=_hashlib.sha256(
            (_Path(__file__).resolve().parent.parent.parent / "storage" / "artifacts" / task.task_id / out_name).read_bytes()
        ).hexdigest() if task.status == "COMPLETED" else None,
        size_bytes=task.size_bytes or None,
        latency_speedup_factor=_SPEEDUP.get(task.precision or "FP16", "1.0x"),
        download_url=task.download_url,
    )


@router.get("/compiler/artifacts/{task_id}/{filename}")
async def download_artifact(
    task_id: str,
    filename: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Download a completed compiled artifact binary."""
    from fastapi.responses import FileResponse
    from pathlib import Path as _Path

    from sqlalchemy import select as _select

    if "/" in filename or "\\" in filename or not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )
    task = (
        await db.execute(
            _select(CompileTask).where(
                CompileTask.tenant_id == user.tenant_id,
                CompileTask.task_id == task_id,
            )
        )
    ).scalar_one_or_none()
    if task is None or task.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not ready",
        )
    local = _Path(__file__).resolve().parent.parent.parent / "storage" / "artifacts" / task_id / filename
    if not local.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact file missing",
        )
    return FileResponse(path=str(local), media_type="application/octet-stream", filename=filename)


async def _ensure_ai_schema() -> None:
    def _migrate(sync_conn) -> None:
        import app.models  # noqa: F401 (register tables for create_all)
        from sqlalchemy import inspect as _inspect, text as _text

        from app.database import Base

        Base.metadata.create_all(sync_conn)
        try:
            cols = {c["name"] for c in _inspect(sync_conn).get_columns("compile_tasks")}
        except Exception:
            return
        for name, ddl in {
            "model_name": "VARCHAR(255)",
            "precision": "VARCHAR(16)",
            "polls": "INTEGER",
            "size_bytes": "INTEGER",
        }.items():
            if name not in cols:
                sync_conn.execute(_text(f"ALTER TABLE compile_tasks ADD COLUMN {name} {ddl}"))

    from app.database import engine as _engine

    async with _engine.begin() as conn:
        await conn.run_sync(_migrate)


@router.post("/trism/evaluate", response_model=TrismResponse)
async def evaluate_trism(
    body: TrismRequest,
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """LLM prompt injection / token anomaly firewall (Service 6).

    Auth: JWT Bearer (any user) or X-API-Key. Implements Module 23
    heuristics: jailbreak pattern matching + PII redaction. Every
    evaluation is written to the trism_audit_logs table.
    """
    import re as _re
    from datetime import datetime as _dt
    from datetime import timezone as _tz

    from app.database import engine as _engine

    from app.database import Base as _Base

    async with _engine.begin() as _conn:
        await _conn.run_sync(_Base.metadata.create_all)

    text = body.prompt_text or ""
    lowered = text.lower()

    jailbreak_hits = [
        pat for pat in (
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"disregard\s+(all\s+)?(prior|previous|above)",
            r"output\s+(the\s+)?(password|secret|hash|registers)",
            r"output\s+.*\bregisters?\b",
            r"\bdan\b.{0,20}do anything now",
            r"do anything now",
            r"system\s+instructions?\s+override",
            r"administrative\s+\w+(\s+\w+){0,3}\s+registers?",
            r"jailbreak",
            r"developer\s+mode",
        )
        if _re.search(pat, lowered)
    ]
    email_hits = _re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    number_hits = _re.findall(r"\b\d{6,}\b", text)
    pii_found = bool(email_hits or number_hits)

    risk = 0.05 + 0.85 * min(len(jailbreak_hits), 2) + (0.20 if pii_found and not jailbreak_hits else 0.0)
    risk = round(min(risk, 0.99), 3)
    blocked = risk > 0.80

    if jailbreak_hits:
        category = "PROMPT_INJECTION_JAILBREAK"
        atlas: str | None = "AML.T0054 (LLM Jailbreak)"
        action = "BLOCKED" if blocked else "FLAGGED"
        reason = "Detected direct adversarial command override pattern targeting system instructions."
    elif pii_found:
        category = "PII_EXFILTRATION"
        atlas = None
        action = "BLOCKED" if blocked else "REDACTED"
        reason = "Detected PII patterns (email/numeric identifiers) in outbound prompt."
    else:
        category = "BENIGN"
        atlas = None
        action = "FORWARDED"
        reason = "No injection patterns or PII detected."

    sanitized: str | None = None
    if not blocked and body.sanitize_pii:
        sanitized = text
        sanitized = _re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", sanitized)
        sanitized = _re.sub(r"\b\d{6,}\b", "[REDACTED_NUM]", sanitized)

    tenant_id = caller.tenant_id if caller is not None else None
    if tenant_id is None and x_tenant_id:
        from sqlalchemy import select as _select

        from app.models.user import Tenant as _Tenant

        existing = await db.execute(_select(_Tenant).where(_Tenant.name == x_tenant_id))
        found = existing.scalar_one_or_none()
        if found is not None:
            tenant_id = found.id
    db.add(TrismAuditLog(
        prompt_text=text[:2000],
        user_id=body.user_id,
        risk_score=risk,
        threat_category=category,
        blocked=blocked,
        timestamp=_dt.now(_tz.utc),
        tenant_id=tenant_id,
    ))
    await db.flush()
    return TrismResponse(
        safe_to_forward=not blocked,
        risk_score=risk,
        threat_category=category,
        mitre_atlas_id=atlas,
        action_enforced=action,
        sanitized_prompt=sanitized,
        audit_reason=reason,
    )
