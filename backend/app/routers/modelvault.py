"""Cloud Model Vault — AI model registry (Service: model distribution).

Mounted at ``/api/v1/model-vault`` (NOT ``/models``: that prefix is the
tenant-scoped threat-model inventory + its legacy ``/ai/models`` alias).

Catalog/detail/download are public so edge appliances can pull without a
user JWT. All writes (upload, safety gate, promote) require an admin JWT.
"""

import hashlib
import json as _json
from pathlib import Path as _Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_admin
from app.models.modelvault import AIModel, AIModelArtifact, AIModelVersion
from app.models.user import User
from app.schemas.modelvault import (
    ArtifactItemOut,
    CatalogModelOut,
    CatalogOut,
    ModelDetailOut,
    PromoteRequest,
    PromoteResponse,
    UploadArtifactResponse,
    VerifySafetyRequest,
    VerifySafetyResponse,
    VersionTreeOut,
)
from app.services import model_vault as vault

router = APIRouter(prefix="/model-vault", tags=["Model Vault"])

# Raw Python pickles are never valid model artifacts (remote-code risk).
FORMAT_FORBIDDEN_SUFFIXES = (".pt", ".pth", ".pkl", ".pickle")


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
async def _get_model_or_404(db: AsyncSession, slug: str) -> AIModel:
    row = (await db.execute(select(AIModel).where(AIModel.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{slug}' not found")
    return row


async def _versions_for(db: AsyncSession, model_id: str) -> list[AIModelVersion]:
    return list(
        (await db.execute(select(AIModelVersion).where(AIModelVersion.model_id == model_id)))
        .scalars()
        .all()
    )


async def _artifacts_for(db: AsyncSession, version_id: str) -> list[AIModelArtifact]:
    return list(
        (await db.execute(select(AIModelArtifact).where(AIModelArtifact.version_id == version_id)))
        .scalars()
        .all()
    )


def _artifact_out(row: AIModelArtifact, slug: str, version: str) -> ArtifactItemOut:
    return ArtifactItemOut(
        format=row.format.value if hasattr(row.format, "value") else str(row.format),
        precision=row.precision.value if hasattr(row.precision, "value") else str(row.precision),
        file_name=row.file_name,
        file_size_bytes=row.file_size_bytes,
        sha256_checksum=row.sha256_checksum,
        signature_ed25519=row.signature_ed25519,
        target_hardware=row.target_hardware,
        download_count=row.download_count,
        download_url=f"/api/v1/model-vault/{slug}/versions/{version}/download"
        f"?format={row.format.value if hasattr(row.format, 'value') else row.format}"
        f"&precision={row.precision.value if hasattr(row.precision, 'value') else row.precision}"
        f"&hardware={row.target_hardware}",
    )


def _local_path(row: AIModelArtifact) -> _Path:
    # s3_storage_key mirrors the vault layout; resolve it under the vault root.
    return vault.vault_root() / row.s3_storage_key


# ---------------------------------------------------------------------------
# A. catalog + detail + download (public)
# ---------------------------------------------------------------------------
@router.get("", response_model=CatalogOut)
@router.get("/", response_model=CatalogOut, include_in_schema=False)
async def list_models(
    domain: str | None = Query(default=None),
    format: str | None = Query(default=None),
    tier: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Model catalog with optional domain/format/tier/stage filters."""
    for name, value, vocab in (
        ("tier", tier, ("all", *vault.MODEL_TIERS)),
        ("format", format, ("all", *vault.MODEL_FORMATS)),
        ("stage", stage, ("all", *vault.ROLLOUT_STAGES)),
    ):
        if value is not None and value not in vocab:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown {name} '{value}'")
    await vault.ensure_seed(db)
    models = list((await db.execute(select(AIModel).order_by(AIModel.slug))).scalars().all())
    if domain:
        models = [m for m in models if m.domain == domain]
    if tier and tier != "all":
        models = [m for m in models if str(m.tier) == tier or getattr(m.tier, "value", m.tier) == tier]
    items: list[CatalogModelOut] = []
    for model in models:
        versions = await _versions_for(db, model.id)
        if stage and stage != "all":
            versions = [v for v in versions if str(getattr(v.rollout_stage, "value", v.rollout_stage)) == stage]
        if format and format != "all":
            kept = []
            for v in versions:
                arts = await _artifacts_for(db, v.id)
                if any(str(getattr(a.format, "value", a.format)) == format for a in arts):
                    kept.append(v)
            versions = kept
        if not versions:
            continue
        latest = vault.latest_of(versions)
        assert latest is not None
        formats: list[str] = []
        for v in versions:
            for a in await _artifacts_for(db, v.id):
                f = str(getattr(a.format, "value", a.format))
                if f not in formats:
                    formats.append(f)
        items.append(CatalogModelOut(
            id=model.id,
            slug=model.slug,
            name=model.name,
            domain=model.domain,
            latest_version=latest.version,
            available_formats=formats,
            p99_latency_ns=latest.p99_latency_ns,
            golden_safety_verified=bool(latest.golden_safety_verified),
        ))
    return CatalogOut(total=len(items), models=items)


@router.get("/{slug}", response_model=ModelDetailOut)
async def model_detail(slug: str, db: AsyncSession = Depends(get_db)):
    """Model manifest, tensor shapes, and full version tree."""
    await vault.ensure_seed(db)
    model = await _get_model_or_404(db, slug)
    versions = await _versions_for(db, model.id)
    tree: list[VersionTreeOut] = []
    for v in sorted(versions, key=lambda x: x.version, reverse=True):
        arts = await _artifacts_for(db, v.id)
        tree.append(VersionTreeOut(
            version=v.version,
            rollout_stage=str(getattr(v.rollout_stage, "value", v.rollout_stage)),
            golden_safety_verified=bool(v.golden_safety_verified),
            golden_recall_score=v.golden_recall_score,
            base_accuracy=v.base_accuracy,
            p99_latency_ns=v.p99_latency_ns,
            training_dataset_summary=v.training_dataset_summary,
            release_notes=v.release_notes,
            artifacts=[_artifact_out(a, slug, v.version) for a in arts],
        ))
    return ModelDetailOut(
        id=model.id,
        slug=model.slug,
        name=model.name,
        tier=str(getattr(model.tier, "value", model.tier)),
        domain=model.domain,
        architecture=model.architecture,
        author=model.author,
        short_description=model.short_description,
        technical_description=model.technical_description,
        input_tensor_shape=model.input_tensor_shape,
        output_tensor_shape=model.output_tensor_shape,
        versions=tree,
    )


@router.get("/{slug}/versions/{version}/download")
async def download_artifact(
    slug: str,
    version: str,
    format: str | None = Query(default=None),
    precision: str | None = Query(default=None),
    hardware: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Download one artifact binary (public, edge pulls).

    The version must be golden-safety verified. Without selectors the
    first recorded artifact is served.
    """
    await vault.ensure_seed(db)
    model = await _get_model_or_404(db, slug)
    row = (
        await db.execute(
            select(AIModelVersion).where(
                AIModelVersion.model_id == model.id, AIModelVersion.version == version
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version '{version}' not found")
    if not row.golden_safety_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Version is not golden-safety verified and cannot be served",
        )
    arts = await _artifacts_for(db, row.id)
    picked = None
    if format or precision or hardware:
        for a in arts:
            f = str(getattr(a.format, "value", a.format))
            p = str(getattr(a.precision, "value", a.precision))
            if format and f != format:
                continue
            if precision and p != precision:
                continue
            if hardware and a.target_hardware != hardware:
                continue
            picked = a
            break
        if picked is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No artifact matches the selectors")
    elif arts:
        picked = arts[0]
    if picked is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version has no artifacts")
    local = _local_path(picked)
    if not local.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact file missing from vault")
    picked.download_count += 1
    await db.flush()
    return FileResponse(
        path=str(local),
        media_type="application/octet-stream",
        filename=picked.file_name,
        headers={
            "X-Aryorithm-SHA256": picked.sha256_checksum,
            "X-Aryorithm-Signature-Ed25519": picked.signature_ed25519,
            # Offline-bundle verification hash for air-gapped Nexus hubs.
            "X-Airgap-Hash": f"sha256:{picked.sha256_checksum}",
        },
    )


# ---------------------------------------------------------------------------
# B. forge upload / safety gate / promote (admin JWT)
# ---------------------------------------------------------------------------
@router.post("/{slug}/versions/{version}/upload-artifact", response_model=UploadArtifactResponse,
             status_code=status.HTTP_201_CREATED)
async def upload_artifact(
    slug: str,
    version: str,
    file: UploadFile = File(...),
    format: str = Form(...),
    precision: str = Form("FP32"),
    target_hardware: str = Form("UNIVERSAL"),
    signature_ed25519: str = Form(...),
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stage a forge-trained artifact (admin). Verified, hashed, WORM-stored."""
    _ = user
    await vault.ensure_seed(db)
    model = await _get_model_or_404(db, slug)
    fmt = (format or "").strip().upper()
    prec = (precision or "").strip().upper()
    if fmt not in vault.MODEL_FORMATS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown format '{format}'")
    if prec not in vault.MODEL_PRECISIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown precision '{precision}'")
    filename = file.filename or "artifact.bin"
    lower = filename.lower()
    if lower.endswith(FORMAT_FORBIDDEN_SUFFIXES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Raw Python pickle uploads are rejected; use .safetensors or .onnx",
        )
    allowed_exts = vault.FORMAT_EXTENSIONS[fmt]
    if not lower.endswith(allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Extension mismatch for {fmt}: expected one of {list(allowed_exts)}",
        )
    blob = await file.read()
    if not blob:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(blob) > settings.MODEL_VAULT_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Artifact exceeds size limit")

    # Authority-root signature check (policy: nothing unverified is servable).
    from app.services.license_service import LicenseKeyError, public_key_b64

    try:
        authority_pub = public_key_b64()
    except LicenseKeyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    if not vault.verify_signature(authority_pub, signature_ed25519, blob):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ed25519 signature does not verify against the Aryorithm Authority Root",
        )

    row = (
        await db.execute(
            select(AIModelVersion).where(AIModelVersion.model_id == model.id, AIModelVersion.version == version)
        )
    ).scalar_one_or_none()
    if row is None:
        row = AIModelVersion(
            model_id=model.id, version=version, rollout_stage="DEVELOPMENT",
            p99_latency_ns=0,
        )
        db.add(row)
        await db.flush()
    dup = (
        await db.execute(
            select(AIModelArtifact).where(
                AIModelArtifact.version_id == row.id,
                AIModelArtifact.format == fmt,
                AIModelArtifact.precision == prec,
                AIModelArtifact.target_hardware == target_hardware,
            )
        )
    ).scalar_one_or_none()
    if dup is not None:
        # WORM immutability: an uploaded artifact can never be replaced.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Artifact already published for this version/format/precision/hardware")

    digest = hashlib.sha256(blob).hexdigest()
    rel = vault.artifact_relpath(slug, version, fmt, filename)
    dest = vault.vault_root() / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(blob)
    (dest.parent / f"{filename}.sig").write_text(signature_ed25519.strip() + "\n", encoding="utf-8")
    db.add(AIModelArtifact(
        version_id=row.id,
        format=fmt,
        precision=prec,
        file_name=filename,
        file_size_bytes=len(blob),
        s3_storage_key=str(rel),
        sha256_checksum=digest,
        signature_ed25519=signature_ed25519.strip(),
        target_hardware=target_hardware,
    ))
    await db.flush()
    await _refresh_version_metadata(model, row, db)
    return UploadArtifactResponse(status="STAGED", version=version, format=fmt, sha256=digest, file_size_bytes=len(blob))


@router.post("/{slug}/versions/{version}/verify-safety", response_model=VerifySafetyResponse)
async def verify_safety(
    slug: str,
    version: str,
    body: VerifySafetyRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Record a golden-attack safety gate verdict (admin)."""
    _ = user
    await vault.ensure_seed(db)
    model = await _get_model_or_404(db, slug)
    row = (
        await db.execute(
            select(AIModelVersion).where(AIModelVersion.model_id == model.id, AIModelVersion.version == version)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version '{version}' not found")
    if body.golden_recall < 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Golden Safety Gate Failed. Recall must equal 100% on zero-day attack vectors.",
        )
    row.golden_safety_verified = True
    row.golden_recall_score = body.golden_recall
    row.last_gate_run_id = body.safety_gate_run_id
    row.tested_attacks_count = body.tested_attacks_count
    row.false_positive_rate = body.false_positive_rate
    await db.flush()
    return VerifySafetyResponse(version=version, golden_safety_verified=True, golden_recall_score=body.golden_recall)


@router.post("/{slug}/versions/{version}/promote", response_model=PromoteResponse)
async def promote_version(
    slug: str,
    version: str,
    body: PromoteRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Move a version between rollout stages (admin, canary OTA control)."""
    _ = user
    await vault.ensure_seed(db)
    model = await _get_model_or_404(db, slug)
    row = (
        await db.execute(
            select(AIModelVersion).where(AIModelVersion.model_id == model.id, AIModelVersion.version == version)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version '{version}' not found")
    if body.target_stage == "FLEET_PRODUCTION" and not row.golden_safety_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FLEET_PRODUCTION requires a passing golden safety gate first",
        )
    row.rollout_stage = body.target_stage
    await db.flush()
    return PromoteResponse(version=version, rollout_stage=body.target_stage)


async def _refresh_version_metadata(model: AIModel, row: AIModelVersion, db: AsyncSession) -> None:
    """Rewrite the version dir's metadata.json after an upload."""
    import json as _json

    arts = await _artifacts_for(db, row.id)
    manifest = vault.version_metadata(
        model.id,
        {
            "version": row.version,
            "rollout_stage": str(getattr(row.rollout_stage, "value", row.rollout_stage)),
            "golden_safety_verified": bool(row.golden_safety_verified),
            "golden_recall_score": row.golden_recall_score,
            "base_accuracy": row.base_accuracy,
            "p99_latency_ns": row.p99_latency_ns,
            "training_dataset_summary": row.training_dataset_summary,
            "release_notes": row.release_notes,
        },
        [
            {
                "format": str(getattr(a.format, "value", a.format)),
                "file_name": a.file_name,
                "file_size_bytes": a.file_size_bytes,
                "sha256": a.sha256_checksum,
            }
            for a in arts
        ],
    )
    meta_path = vault.vault_root() / "models" / model.slug / row.version / "metadata.json"
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(_json.dumps(manifest, indent=2), encoding="utf-8")
