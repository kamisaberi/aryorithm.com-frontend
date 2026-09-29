"""AI model lifecycle schemas."""

from pydantic import BaseModel
from datetime import datetime


class ModelResponse(BaseModel):
    version: str
    sha256: str
    size_bytes: int
    stage: str


class ModelUploadResponse(BaseModel):
    model_id: str
    sha256: str
    status: str


class OTAStatusResponse(BaseModel):
    stable_version: str
    candidate_version: str | None
    stage: str


class OTAStageRequest(BaseModel):
    version: str
    sha256: str
    url: str


class OTAStageResponse(BaseModel):
    status: str
    stage: str


class OTAResponse(BaseModel):
    status: str
    new_stage: str | None = None
    active: str | None = None


class ForgeDatasetResponse(BaseModel):
    dataset_id: str
    samples: int
    high_uncertainty: int


class ForgeTrainRequest(BaseModel):
    dataset_id: str
    epochs: int = 50


class ForgeTrainResponse(BaseModel):
    job_id: str
    status: str


class CompileRequest(BaseModel):
    model_id: str
    target: str


class CompileResponse(BaseModel):
    task_id: str
    status: str


class CompileStatusResponse(BaseModel):
    status: str
    download_url: str | None = None


class TrismRequest(BaseModel):
    prompt_text: str


class TrismResponse(BaseModel):
    safe: bool
    risk_score: float
    sanitized_text: str | None = None
