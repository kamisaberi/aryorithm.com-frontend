"""Shared helpers for Hub production blueprints and official appliances.

Keeping the parsing, storage, signature and matrix logic here means both
routers enforce the same rules and the tests can exercise them directly.
"""

from __future__ import annotations

import hashlib
import json
import mmap
import re
import tarfile
import uuid
import zipfile
from pathlib import Path
from typing import Any

import yaml
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.hub_appliances import HubApplianceRelease
from app.services import hub_service as hub

# ---------------------------------------------------------------------------
# public matrix vocabulary
# ---------------------------------------------------------------------------
SUPPORTED_ARCHITECTURES: list[dict[str, Any]] = [
    {
        "id": "x86_64-openvino",
        "label": "Intel x86_64 (CPU / Iris Xe / NPU OpenVINO)",
        "target_hardware": "INTEL_OPENVINO",
        "recommended_for": "Standard IPCs, Advantech, Siemens Microbox",
    },
    {
        "id": "aarch64-jetson",
        "label": "NVIDIA Jetson (Orin / Xavier / CUDA TensorRT)",
        "target_hardware": "NVIDIA_TENSORRT",
        "recommended_for": "NVIDIA Jetson Edge Boxes, Smart Substations",
    },
    {
        "id": "aarch64-rknn",
        "label": "Rockchip ARM64 (RK3588 NPU)",
        "target_hardware": "ROCKCHIP_RKNN",
        "recommended_for": "Orange Pi 5, Low-Power Embedded Edge",
    },
    {
        "id": "x86_64-generic",
        "label": "Generic Linux x86_64 (No Hardware NPU)",
        "target_hardware": "GENERIC_CPU",
        "recommended_for": "VMware ESXi, KVM, Bare-Metal Servers",
    },
]

SUPPORTED_INDUSTRIES: list[dict[str, Any]] = [
    {"id": "water", "label": "Drinking Water & Wastewater Utilities", "protocols": ["MODBUS", "PROFINET"]},
    {"id": "energy", "label": "Electrical Grid & Substations", "protocols": ["IEC_104", "DNP3", "C37_118"]},
    {"id": "5g_factory", "label": "Smart Factory & Private 5G Core", "protocols": ["GTP_U", "S7COMM", "PROFINET"]},
    {"id": "chemical", "label": "Chemical & Refining Safety (SIS)", "protocols": ["TRISTATION", "MODBUS"]},
    {"id": "aerospace", "label": "Aerospace, UAV & Ground Stations", "protocols": ["CCSDS", "STANAG_4586"]},
    {"id": "general", "label": "General Industrial CPS Defense", "protocols": ["ALL_PROTOCOLS"]},
]

SUPPORTED_LICENSES: list[dict[str, Any]] = [
    {"id": "community", "label": "Community Evaluation (Free, 1 Node Limit)", "node_limit": 1},
    {"id": "enterprise", "label": "Enterprise Operational (Multi-Node Fleet Sync)", "node_limit": 50},
    {"id": "sovereign", "label": "Critical Sovereign (Air-Gapped, Unlimited Nodes)", "node_limit": 0},
]

MATRIX_ARCHITECTURE_IDS = {item["id"] for item in SUPPORTED_ARCHITECTURES}
MATRIX_INDUSTRY_IDS = {item["id"] for item in SUPPORTED_INDUSTRIES}
MATRIX_LICENSE_IDS = {item["id"] for item in SUPPORTED_LICENSES}

DEFAULT_APPLIANCE_VERSION = "2.5.0"
BLUEPRINT_EXTENSIONS = (".blueprint", ".tar.gz", ".tgz", ".zip", ".tar")
APPLIANCE_EXTENSIONS = (".aryopack",)
_RAW_DAG_MAX_BYTES = 2 * 1024 * 1024
_CHUNK_SIZE = 1024 * 1024


# ---------------------------------------------------------------------------
# manifest / field parsing
# ---------------------------------------------------------------------------
def parse_manifest(raw: str, field: str = "manifest") -> dict:
    """Parse the multipart ``manifest``/``metadata`` JSON string into an object."""
    text = (raw or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} must be a non-empty JSON object",
        )
    try:
        data = json.loads(text)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} is not valid JSON: {exc}",
        ) from exc
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} must be a JSON object",
        )
    return data


def manifest_value(meta: dict, *keys: str, default: Any = None) -> Any:
    """Read a value from the manifest or its nested ``metadata`` object."""
    containers = [meta]
    nested = meta.get("metadata")
    if isinstance(nested, dict):
        containers.append(nested)
    for container in containers:
        for key in keys:
            if key in container and container[key] is not None:
                return container[key]
    return default


def as_float(value: Any, default: float, field: str) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} must be numeric",
        ) from exc


def normalize_dependencies(raw: Any) -> dict[str, list[str]]:
    if isinstance(raw, dict):
        packages = raw.get("packages", raw.get("required_packages", []))
        models = raw.get("models", raw.get("required_models", []))
    elif isinstance(raw, list):
        packages, models = raw, []
    else:
        packages, models = [], []

    def _clean(values: Any) -> list[str]:
        if isinstance(values, (str, int, float)):
            values = [values]
        if not isinstance(values, (list, tuple, set)):
            return []
        result: list[str] = []
        for value in values:
            text = str(value).strip()
            if text and text not in result:
                result.append(text)
        return result

    return {"packages": _clean(packages), "models": _clean(models)}


def normalize_hardware_binding(raw: Any) -> dict:
    return dict(raw) if isinstance(raw, dict) else {}


def normalize_sla(raw: Any, fallback_latency: float) -> tuple[dict, float]:
    sla = dict(raw) if isinstance(raw, dict) else {}
    max_latency = as_float(
        sla.get("max_pipeline_latency_us"),
        fallback_latency,
        "max_pipeline_latency_us",
    )
    critical = as_float(
        sla.get("critical_clearing_time_ms"),
        0.0,
        "critical_clearing_time_ms",
    )
    sla["max_pipeline_latency_us"] = max_latency
    sla.setdefault("critical_clearing_time_ms", critical)
    return sla, max_latency


def raw_dag_from_manifest(meta: dict) -> str:
    """Return a raw YAML DAG embedded in the manifest, if present."""
    for key in ("raw_dag_yaml", "raw_dag", "model_routes_yaml", "dag_yaml", "model_routes"):
        value = manifest_value(meta, key, default=None)
        if isinstance(value, str) and value.strip():
            return value
        if isinstance(value, (dict, list)):
            return yaml.safe_dump(value, sort_keys=False)
    return ""


# ---------------------------------------------------------------------------
# slugs, filenames, keys, signatures
# ---------------------------------------------------------------------------
def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug


def validate_slug(value: str) -> str:
    slug = (value or "").strip()
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="slug is required",
        )
    if len(slug) > 128 or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", slug):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="slug may contain only letters, numbers, dots, underscores and hyphens (max 128)",
        )
    return slug


def safe_filename(filename: str | None, slug: str, default_suffix: str, allowed: tuple[str, ...]) -> str:
    raw = (filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", raw)
    name = name.strip(" .")
    if not name:
        name = f"{slug}{default_suffix}"
    lowered = name.lower()
    if not any(lowered.endswith(ext) for ext in allowed):
        expected = ", ".join(allowed)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"file must use one of the accepted extensions: {expected}",
        )
    return name


def normalize_public_key(raw: str, field: str = "author_public_key") -> str:
    try:
        return hub.decode_key_material(raw, 32, field).hex()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc


def normalize_signature(raw: str, field: str = "signature") -> str:
    signature = (raw or "").strip()
    if signature.lower().startswith("0x"):
        signature = signature[2:]
    if len(signature) != 128 or not re.fullmatch(r"[0-9a-fA-F]{128}", signature):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} must be a 64-byte Ed25519 hex string (128 hex characters)",
        )
    return signature.lower()


# ---------------------------------------------------------------------------
# storage + verification
# ---------------------------------------------------------------------------
def blueprint_root() -> Path:
    return Path(settings.HUB_BLUEPRINTS_DIR).expanduser()


def appliance_root() -> Path:
    return Path(settings.HUB_APPLIANCES_DIR).expanduser()


def artifact_path(root: Path, relative: str) -> Path:
    root_resolved = root.resolve()
    candidate = (root_resolved / relative).resolve()
    if not candidate.is_relative_to(root_resolved):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")
    return candidate


async def save_upload(upload: UploadFile, destination: Path, max_bytes: int) -> tuple[int, str]:
    """Stream an upload to ``destination`` and return (size, sha256)."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    try:
        with destination.open("wb") as out:
            while True:
                chunk = await upload.read(_CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Upload exceeds the configured limit ({max_bytes} bytes)",
                    )
                digest.update(chunk)
                out.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is empty",
        )
    return size, digest.hexdigest()


def verify_file_signature(public_key: str, signature: str, path: Path) -> bool:
    """Verify an Ed25519 signature over a stored file without loading it all."""
    try:
        if path.stat().st_size == 0:
            return False
        with path.open("rb") as handle:
            with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as mapped:
                return hub.verify_ed25519(public_key, signature, mapped)
    except (OSError, ValueError):
        try:
            return hub.verify_ed25519(public_key, signature, path.read_bytes())
        except OSError:
            return False


def extract_raw_dag_from_path(path: Path, filename: str) -> str:
    """Best-effort read of ``model_routes.yaml`` from a blueprint archive."""
    lowered = (filename or "").lower()

    if zipfile.is_zipfile(path):
        try:
            with zipfile.ZipFile(path) as archive:
                for info in archive.infolist():
                    if info.is_dir() or info.file_size > _RAW_DAG_MAX_BYTES:
                        continue
                    base = Path(info.filename).name.lower()
                    if base in ("model_routes.yaml", "model_routes.yml"):
                        with archive.open(info) as handle:
                            return handle.read(_RAW_DAG_MAX_BYTES + 1).decode(
                                "utf-8", errors="replace"
                            )
        except (OSError, zipfile.BadZipFile, RuntimeError, EOFError):
            pass

    try:
        with tarfile.open(path, mode="r:*") as archive:
            for member in archive.getmembers():
                if not member.isfile() or member.size > _RAW_DAG_MAX_BYTES:
                    continue
                base = Path(member.name).name.lower()
                if base in ("model_routes.yaml", "model_routes.yml"):
                    handle = archive.extractfile(member)
                    if handle is not None:
                        return handle.read(_RAW_DAG_MAX_BYTES + 1).decode(
                            "utf-8", errors="replace"
                        )
    except (OSError, tarfile.TarError, EOFError):
        pass

    if lowered.endswith((".yaml", ".yml")) and path.stat().st_size <= _RAW_DAG_MAX_BYTES:
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return ""
    return ""


async def latest_appliance_version(db: AsyncSession) -> str:
    rows = (
        await db.execute(
            select(HubApplianceRelease.version)
            .where(HubApplianceRelease.is_active.is_(True))
            .distinct()
        )
    ).scalars().all()
    if not rows:
        return DEFAULT_APPLIANCE_VERSION
    return max(rows, key=hub.semver_key)


def matrix_payload(latest_version: str) -> dict:
    return {
        "latest_version": latest_version,
        "supported_architectures": [dict(item) for item in SUPPORTED_ARCHITECTURES],
        "supported_industries": [
            {**dict(item), "protocols": list(item["protocols"])}
            for item in SUPPORTED_INDUSTRIES
        ],
        "supported_licenses": [dict(item) for item in SUPPORTED_LICENSES],
    }


def authority_public_key() -> str:
    """Configured Authority-root verify key (base64/hex), for .aryopack uploads."""
    explicit = (settings.ARYORITHM_AUTHORITY_PUBLIC_KEY_B64 or "").strip()
    if explicit:
        return explicit
    from app.services.license_service import LicenseKeyError, public_key_b64

    try:
        return public_key_b64()
    except LicenseKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Aryorithm Authority verify key is not configured: {exc}",
        ) from exc


def temp_upload_path(root: Path, slug: str) -> Path:
    return root / f".{slug}.{uuid.uuid4().hex}.upload"
