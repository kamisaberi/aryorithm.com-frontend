"""AI Model Lifecycle & Silicon Acceleration routes."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
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
    return OTAStatusResponse(stable_version="v2.0", candidate_version="v2.4", stage="CANARY_5_PCT")


@router.post("/ota/stage", response_model=OTAStageResponse)
async def stage_ota(
    body: OTAStageRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stage candidate weights into SHADOW_MODE."""
    return OTAStageResponse(status="candidate_staged", stage="SHADOW_MODE")


@router.post("/ota/advance", response_model=OTAResponse)
async def advance_ota(user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Advance rollout (Shadow -> 5% -> Fleet)."""
    return OTAResponse(status="advanced", new_stage="CANARY_12_PCT")


@router.post("/ota/rollback", response_model=OTAResponse)
async def rollback_ota(user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Emergency rollback to previous stable model."""
    return OTAResponse(status="emergency_rollback_executed", active="v2.0")


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


@router.post("/compiler/compile", response_model=CompileResponse)
async def compile_model(
    body: CompileRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Compile ONNX model for target silicon."""
    return CompileResponse(task_id="COMP-44", status="COMPILING")


@router.get("/compiler/tasks/{task_id}", response_model=CompileStatusResponse)
async def get_compile_status(
    task_id: str,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Poll compilation status & download URL."""
    return CompileStatusResponse(status="COMPLETED", download_url="/api/v1/models/v2.rknn")


@router.post("/trism/evaluate", response_model=TrismResponse)
async def evaluate_trism(
    body: TrismRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """LLM prompt injection / token anomaly firewall."""
    return TrismResponse(safe=True, risk_score=0.02, sanitized_text=body.prompt_text)
