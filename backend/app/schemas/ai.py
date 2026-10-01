"""AI model lifecycle schemas."""

import enum
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime


class ThreatModelStage(str, enum.Enum):
    """Strict stage enum for GET /api/v1/models (spec brief)."""

    FLEET_WIDE = "FLEET_WIDE"
    CANARY_5_PCT = "CANARY_5_PCT"
    SHADOW_MODE = "SHADOW_MODE"
    DISABLED = "DISABLED"


class ModelResponse(BaseModel):
    """ModelMetadata for GET /api/v1/models.

    Exact spec fields: filename, sha256, size_bytes, download_url, stage.
    `version` is kept as an optional backwards-compat alias for the legacy
    GET /api/v1/ai/models dashboard client (derived from filename).
    """

    filename: str = Field(..., description="Unique model artifact filename, must end in .onnx")
    sha256: str = Field(..., description="Hex integrity hash verified by edge nodes before hot-reload")
    size_bytes: int = Field(..., ge=0, description="File size in bytes")
    download_url: str = Field(..., description="Relative or absolute pull path for the binary")
    stage: ThreatModelStage = Field(..., description="Fleet rollout stage")
    # Legacy alias — not part of the spec, ignored when None.
    version: str | None = Field(default=None, exclude=True)

    @field_validator("filename")
    @classmethod
    def _filename_must_be_onnx(cls, v: str) -> str:
        if not v.endswith(".onnx"):
            raise ValueError("filename must end in .onnx")
        return v

    @field_validator("sha256")
    @classmethod
    def _sha256_must_be_hex(cls, v: str) -> str:
        # Spec text says "exactly 64 hex", but the shipped v2 seed in the
        # brief itself is 52 hex chars, so enforce hex-only (not exact
        # length) to avoid rejecting the mandated seed record.
        if not re.fullmatch(r"[0-9a-fA-F]+", v or ""):
            raise ValueError("sha256 must be a hex string")
        if len(v) > 128:
            raise ValueError("sha256 must be at most 128 hex characters")
        return v


class ModelUploadResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

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
    model_config = ConfigDict(protected_namespaces=())

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
