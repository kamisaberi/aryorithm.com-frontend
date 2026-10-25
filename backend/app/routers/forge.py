"""Cloud Forge API — remote GPU retraining jobs at ``/api/v1/forge``."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.forge import ForgeJob
from app.routers.hub import HubIdentity, get_developer_identity
from app.services import forge_service as forge

router = APIRouter(prefix="/forge", tags=["Forge — Remote GPU Training"])


def _is_admin(ident: HubIdentity) -> bool:
    return ident.user.role in ("super_admin", "tenant_admin", "admin")


async def _job_or_404(db: AsyncSession, job_id: str, ident: HubIdentity) -> ForgeJob:
    job = await db.get(ForgeJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forge job not found")
    if job.owner_user_id != ident.user.id and not _is_admin(ident):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the job owner or an admin can access this job",
        )
    return job


@router.post("/train", status_code=status.HTTP_202_ACCEPTED)
async def train(
    dataset: UploadFile = File(...),
    base_model: str = Form(...),
    epochs: int = Form(5, ge=1, le=1000),
    learning_rate: float = Form(0.0001, gt=0, le=1.0),
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Dispatch a ``.slab`` telemetry dataset for remote GPU fine-tuning.

    Auth: ``Authorization: Bearer <API key or JWT>``.  The dataset is
    streamed to disk (never buffered whole in memory) and the job is queued
    durably; poll ``GET /forge/jobs/{job_id}`` until ``completed``.
    """
    base_model = (base_model or "").strip()
    if not base_model:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="base_model is required (e.g. models/netflow-mae-v2.onnx)",
        )

    job_id = await forge.new_job_id(db)
    dest = forge.dataset_dir() / f"{job_id}.slab"
    dest.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await dataset.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > settings.MODEL_VAULT_MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            "Dataset exceeds MODEL_VAULT_MAX_UPLOAD_BYTES "
                            f"({settings.MODEL_VAULT_MAX_UPLOAD_BYTES})"
                        ),
                    )
                out.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    if size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="dataset is empty",
        )

    base_slug, _artifact_path, _latency = await forge.resolve_base_model(db, base_model)
    estimate = max(int(settings.FORGE_SIMULATED_TRAINING_SECONDS or 0), 0)
    job = ForgeJob(
        job_id=job_id,
        owner_user_id=ident.user.id,
        status="queued",
        base_model=base_model,
        base_model_slug=base_slug,
        dataset_name=dataset.filename or f"{job_id}.slab",
        dataset_size_bytes=size,
        dataset_samples=forge.dataset_samples(size),
        epochs=epochs,
        learning_rate=learning_rate,
        target_hardware=forge.TARGET_HARDWARE,
        estimated_completion_seconds=estimate,
    )
    db.add(job)
    await db.flush()
    return {
        "job_id": job.job_id,
        "status": job.status,
        "target_hardware": job.target_hardware,
        "dataset_samples": job.dataset_samples,
        "poll_endpoint": f"/api/v1/forge/jobs/{job.job_id}",
        "estimated_completion_seconds": estimate,
    }


@router.get("/jobs/{job_id}")
async def job_status(
    job_id: str,
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Poll training progress, epochs, Golden Gate recall and quantization."""
    job = await _job_or_404(db, job_id, ident)
    await forge.advance_job(db, job)
    return forge.job_response(job)


@router.get("/models/{job_id}/download")
async def download_model(
    job_id: str,
    ident: HubIdentity = Depends(get_developer_identity),
    db: AsyncSession = Depends(get_db),
):
    """Download the fine-tuned INT8-quantized ONNX model for a completed job."""
    job = await _job_or_404(db, job_id, ident)
    await forge.advance_job(db, job)
    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job is {job.status}; the model is not ready yet",
        )
    path = forge.forge_root() / job.artifact_path if job.artifact_path else None
    if path is None or not path.is_file():
        # Durable jobs created on another host may need their artifact materialised.
        base_path = await forge._base_path_for_job(db, job)
        path = forge._materialize_output(job, base_path)
        await db.flush()
    filename = f"{job.base_model_slug or job.job_id}_int8.onnx"
    return FileResponse(
        path=str(path),
        media_type="application/octet-stream",
        filename=filename,
        headers={
            "X-Aryorithm-SHA256": forge.output_sha256(job),
            "X-Forge-Job-Id": job.job_id,
            "X-Forge-Quantization": forge.QUANT_FORMAT,
        },
    )
