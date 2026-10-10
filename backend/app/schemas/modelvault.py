"""Cloud Model Vault schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CatalogModelOut(BaseModel):
    id: str
    slug: str
    name: str
    domain: str
    latest_version: str | None = None
    available_formats: list[str] = []
    p99_latency_ns: int | None = None
    golden_safety_verified: bool = False


class CatalogOut(BaseModel):
    total: int
    models: list[CatalogModelOut]


class ArtifactItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    format: str
    precision: str
    file_name: str
    file_size_bytes: int
    sha256_checksum: str
    signature_ed25519: str
    target_hardware: str
    download_count: int
    download_url: str = ""


class VersionTreeOut(BaseModel):
    version: str
    rollout_stage: str
    golden_safety_verified: bool
    golden_recall_score: float | None = None
    base_accuracy: float | None = None
    p99_latency_ns: int
    training_dataset_summary: str
    release_notes: str = ""
    artifacts: list[ArtifactItemOut] = []


class ModelDetailOut(BaseModel):
    id: str
    slug: str
    name: str
    tier: str
    domain: str
    architecture: str
    author: str
    short_description: str
    technical_description: str
    input_tensor_shape: str
    output_tensor_shape: str
    versions: list[VersionTreeOut] = []


class VerifySafetyRequest(BaseModel):
    safety_gate_run_id: str = Field(..., description="Forge run that produced this verdict")
    golden_recall: float = Field(..., ge=0.0, le=1.0)
    tested_attacks_count: int = Field(..., ge=0)
    false_positive_rate: float = Field(..., ge=0.0, le=1.0)
    verifier_signature: str = ""


class VerifySafetyResponse(BaseModel):
    version: str
    golden_safety_verified: bool
    golden_recall_score: float


class PromoteRequest(BaseModel):
    target_stage: Literal["DEVELOPMENT", "SHADOW_MODE", "CANARY_5_PERCENT", "FLEET_PRODUCTION", "DEPRECATED"]


class PromoteResponse(BaseModel):
    version: str
    rollout_stage: str


class UploadArtifactResponse(BaseModel):
    status: str
    version: str
    format: str
    sha256: str
    file_size_bytes: int
