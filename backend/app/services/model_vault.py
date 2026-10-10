"""Cloud Model Vault helpers: seed catalog, vault layout, signing.

Disk layout mirrors the S3 URI scheme one-to-one so a future object-store
migration is a path-prefix swap::

    <MODEL_VAULT_DIR>/models/{slug}/{version}/{format_dir}/{file}
    <MODEL_VAULT_DIR>/models/{slug}/{version}/metadata.json
    <MODEL_VAULT_DIR>/models/{slug}/{version}/{format_dir}/{file}.sig

Seed artifacts are deterministic placeholder bytes (same stand-in philosophy
as ``sentinel_packages.build_spkg_bytes``); their stored sha256 values are
the REAL hashes of those bytes. Seed signatures use an ephemeral key
(hub precedent) — only forge-uploaded artifacts carry authority signatures.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

# Format slug -> on-disk directory (mirrors the spec's S3 layout).
FORMAT_DIRS = {
    "ONNX": "onnx",
    "SAFETENSORS": "safetensors",
    "OPENVINO_IR": "openvino_ir",
    "TENSORRT_ENGINE": "tensorrt_engine",
    "RKNN": "rknn",
    "HAILO_HEF": "hailo_hef",
}

# Accepted upload extensions per format. Raw Python pickles are rejected
# everywhere (policy: no .pt/.pth/.pkl/.pickle remote-code risk in loaders).
FORMAT_EXTENSIONS = {
    "ONNX": (".onnx",),
    "SAFETENSORS": (".safetensors",),
    "OPENVINO_IR": (".xml", ".bin"),
    "TENSORRT_ENGINE": (".engine",),
    "RKNN": (".rknn",),
    "HAILO_HEF": (".hef",),
}
FORBIDDEN_EXTENSIONS = (".pt", ".pth", ".pkl", ".pickle")

MODEL_TIERS = ("FOUNDATION", "COMMUNITY", "ENTERPRISE_CUSTOM")
MODEL_FORMATS = tuple(FORMAT_DIRS)
MODEL_PRECISIONS = ("INT8", "FP16", "FP32", "DYNAMIC")
ROLLOUT_STAGES = ("DEVELOPMENT", "SHADOW_MODE", "CANARY_5_PERCENT", "FLEET_PRODUCTION", "DEPRECATED")

# Latest-version resolution: highest rollout stage wins, then version string.
_STAGE_RANK = {s: i for i, s in enumerate(ROLLOUT_STAGES)}

SEED_MODELS: list[dict] = [
    {
        "id": "aryo-netflow-mae-v2",
        "slug": "netflow-mae-v2",
        "name": "NetFlow Tabular Masked Autoencoder v2",
        "tier": "FOUNDATION",
        "domain": "NETWORK_DETECTION",
        "architecture": "Tabular-MAE-32D",
        "author": "Aryorithm AI Research Lab",
        "short_description": "32-dimensional tabular NetFlow/IPFIX anomaly detector trained with self-supervised stochastic masking.",
        "technical_description": "Trained on over 42 million real industrial and enterprise NetFlow vectors using 30% random feature masking and InfoNCE contrastive representation learning. High reconstruction residuals directly trigger Microsecond Residual Decomposition (MRD XAI) in < 80 nanoseconds.",
        "input_tensor_shape": "[1, 32] (Float32 NetFlow Feature Vector)",
        "output_tensor_shape": "[1, 32] (Reconstructed Residual Vector)",
        "version": {
            "version": "v2.1.0",
            "rollout_stage": "FLEET_PRODUCTION",
            "golden_safety_verified": True,
            "golden_recall_score": 1.0,
            "base_accuracy": 0.9984,
            "p99_latency_ns": 75000,
            "training_dataset_summary": "CIC-IDS-2017 + UNSW-NB15 + Substation Baselines",
            "release_notes": "Added INT8 quantization optimization for Intel OpenVINO NPU.",
        },
        "artifacts": [
            {
                "format": "ONNX",
                "precision": "INT8",
                "file_name": "netflow_mae_v2_int8.onnx",
                "file_size_bytes": 142540,
                "target_hardware": "UNIVERSAL",
            },
            {
                "format": "SAFETENSORS",
                "precision": "FP32",
                "file_name": "netflow_mae_v2_weights.safetensors",
                "file_size_bytes": 524288,
                "target_hardware": "UNIVERSAL",
            },
        ],
    },
    {
        "id": "aryo-scada-kinematic-v1",
        "slug": "scada-kinematic-v1",
        "name": "SCADA Physical Actuator Trajectory Scorer",
        "tier": "FOUNDATION",
        "domain": "SCADA_PHYSICAL",
        "architecture": "Temporal-CNN-1D",
        "author": "Aryorithm AI Research Lab",
        "short_description": "Physical actuator kinematics tracker detecting Stuxnet-like micro-drift and frequency resonance.",
        "technical_description": "Evaluates physical sensor feedback against commanded PLC states across Modbus, DNP3, and S7Comm. Detects subtle valve drift, pump speed anomalies, and fluid pressure manipulation before mechanical damage occurs.",
        "input_tensor_shape": "[1, 16, 64] (16 physical sensors across 64-step rolling window)",
        "output_tensor_shape": "[1, 1] (Physical Drift Anomaly Score [0.0 - 1.0])",
        "version": {
            "version": "v1.0.0",
            "rollout_stage": "FLEET_PRODUCTION",
            "golden_safety_verified": True,
            "golden_recall_score": 1.0,
            "base_accuracy": 0.9991,
            "p99_latency_ns": 110000,
            "training_dataset_summary": "Tennessee Eastman Process + SWaT Water Testbed",
            "release_notes": "Initial release validated against Industroyer and Triton physical traces.",
        },
        "artifacts": [
            {
                "format": "ONNX",
                "precision": "FP16",
                "file_name": "scada_kinematic_v1_fp16.onnx",
                "file_size_bytes": 284160,
                "target_hardware": "UNIVERSAL",
            }
        ],
    },
    {
        "id": "aryo-ja4-c2-transformer-v1",
        "slug": "ja4-c2-transformer-v1",
        "name": "TLS JA4 C2 Beaconing Sequence Transformer",
        "tier": "FOUNDATION",
        "domain": "ENCRYPTED_TRAFFIC",
        "architecture": "Mini-Transformer-4L",
        "author": "Aryorithm AI Research Lab",
        "short_description": "Identifies Cobalt Strike, Mythic, and Sliver C2 beaconing over encrypted TLS without payload decryption.",
        "technical_description": "Inspects TLS ClientHello extensions, cipher suite ordering, and inter-arrival packet jitter. Employs a 4-layer transformer backbone to identify malware beaconing patterns while preserving end-to-end payload encryption.",
        "input_tensor_shape": "[1, 32, 16] (Sequence of 32 TLS handshakes)",
        "output_tensor_shape": "[1, 4] (Classification: Clean, CobaltStrike, Sliver, CustomC2)",
        "version": {
            "version": "v1.0.0",
            "rollout_stage": "FLEET_PRODUCTION",
            "golden_safety_verified": True,
            "golden_recall_score": 1.0,
            "base_accuracy": 0.9972,
            "p99_latency_ns": 95000,
            "training_dataset_summary": "Malware Traffic Analysis + Real Cobalt Strike PCAPs",
            "release_notes": "Validated against JA4/JA4S fingerprinted traffic.",
        },
        "artifacts": [
            {
                "format": "ONNX",
                "precision": "FP16",
                "file_name": "ja4_transformer_v1.onnx",
                "file_size_bytes": 395120,
                "target_hardware": "UNIVERSAL",
            }
        ],
    },
]


def vault_root() -> Path:
    return Path(settings.MODEL_VAULT_DIR)


def artifact_relpath(slug: str, version: str, format: str, file_name: str) -> Path:
    """Vault-relative path mirroring the S3 URI scheme."""
    return Path("models") / slug / version / FORMAT_DIRS[format] / file_name


def build_seed_bytes(seed_text: str, size: int) -> bytes:
    """Deterministic placeholder artifact bytes (header + sha256 stream)."""
    header = f"ARYOMODEL1:{seed_text}\n".encode("utf-8")
    out = bytearray(header)
    counter = 0
    while len(out) < size:
        out += hashlib.sha256(f"{seed_text}:{counter}".encode()).digest()
        counter += 1
    return bytes(out[:size])


def sign_bytes(private_key, payload: bytes) -> str:
    """Ed25519-sign payload, hex-encoded signature."""
    return private_key.sign(payload).hex()


def verify_signature(public_key_raw: str, signature_raw: str, payload: bytes) -> bool:
    """Verify Ed25519 signature (hex with optional 0x, or base64 key/sig)."""
    import base64

    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives.asymmetric import ed25519

        def _decode(raw: str, expect: int) -> bytes:
            s = raw.strip()
            if s.lower().startswith("0x"):
                s = s[2:]
            if len(s) == expect * 2:
                return bytes.fromhex(s)
            blob = base64.b64decode(s)
            if len(blob) != expect:
                raise ValueError("bad length")
            return blob

        pub = ed25519.Ed25519PublicKey.from_public_bytes(_decode(public_key_raw, 32))
        sig = _decode(signature_raw, 64)
        pub.verify(sig, payload)
        return True
    except Exception:
        return False


def version_metadata(model_id: str, version: dict, artifacts: list[dict]) -> dict:
    """The ``metadata.json`` training-audit manifest for one version dir."""
    return {
        "model_id": model_id,
        "version": version["version"],
        "rollout_stage": version["rollout_stage"],
        "golden_safety_verified": version["golden_safety_verified"],
        "golden_recall_score": version["golden_recall_score"],
        "base_accuracy": version["base_accuracy"],
        "p99_latency_ns": version["p99_latency_ns"],
        "training_dataset_summary": version["training_dataset_summary"],
        "release_notes": version.get("release_notes", ""),
        "artifacts": artifacts,
    }


def latest_of(versions: list) -> object | None:
    """Highest rollout stage wins, tie-broken by version string descending."""
    if not versions:
        return None
    return sorted(
        versions,
        key=lambda v: (_STAGE_RANK.get(v.rollout_stage, -1), v.version),
        reverse=True,
    )[0]


async def ensure_seed(db) -> None:
    """Insert the 3 seed models once (idempotent, skips existing ids).

    Writes deterministic artifact bytes + `.sig` sidecars + `metadata.json`
    into the vault, computing real sha256 values. Seed signatures use an
    ephemeral key (dev-seed only, hub precedent).
    """
    import json as _json

    from sqlalchemy import select

    from app.models.modelvault import AIModel, AIModelArtifact, AIModelVersion

    from cryptography.hazmat.primitives.asymmetric import ed25519

    existing = {row[0] for row in (await db.execute(select(AIModel.id))).all()}
    missing = [spec for spec in SEED_MODELS if spec["id"] not in existing]
    if not missing:
        return

    seed_key = ed25519.Ed25519PrivateKey.generate()
    for spec in missing:
        model = AIModel(
            id=spec["id"],
            slug=spec["slug"],
            name=spec["name"],
            tier=spec["tier"],
            domain=spec["domain"],
            architecture=spec["architecture"],
            author=spec["author"],
            short_description=spec["short_description"],
            technical_description=spec["technical_description"],
            input_tensor_shape=spec["input_tensor_shape"],
            output_tensor_shape=spec["output_tensor_shape"],
        )
        db.add(model)
        await db.flush()
        v = spec["version"]
        version = AIModelVersion(
            model_id=model.id,
            version=v["version"],
            rollout_stage=v["rollout_stage"],
            golden_safety_verified=v["golden_safety_verified"],
            golden_recall_score=v["golden_recall_score"],
            base_accuracy=v["base_accuracy"],
            p99_latency_ns=v["p99_latency_ns"],
            training_dataset_summary=v["training_dataset_summary"],
            release_notes=v.get("release_notes", ""),
        )
        db.add(version)
        await db.flush()
        manifest_entries = []
        for art in spec["artifacts"]:
            blob = build_seed_bytes(f"{spec['id']}:{v['version']}:{art['file_name']}", art["file_size_bytes"])
            digest = hashlib.sha256(blob).hexdigest()
            sig = sign_bytes(seed_key, blob)
            rel = artifact_relpath(spec["slug"], v["version"], art["format"], art["file_name"])
            dest = vault_root() / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(blob)
            (dest.parent / f"{art['file_name']}.sig").write_text(sig + "\n", encoding="utf-8")
            db.add(AIModelArtifact(
                version_id=version.id,
                format=art["format"],
                precision=art.get("precision", "FP32"),
                file_name=art["file_name"],
                file_size_bytes=len(blob),
                s3_storage_key=str(Path("models") / spec["slug"] / v["version"] / FORMAT_DIRS[art["format"]] / art["file_name"]),
                sha256_checksum=digest,
                signature_ed25519=sig,
                target_hardware=art.get("target_hardware", "UNIVERSAL"),
            ))
            manifest_entries.append({
                "format": art["format"],
                "file_name": art["file_name"],
                "file_size_bytes": len(blob),
                "sha256": digest,
            })
        meta_path = vault_root() / "models" / spec["slug"] / v["version"] / "metadata.json"
        meta_path.write_text(
            _json.dumps(version_metadata(spec["id"], v, manifest_entries), indent=2),
            encoding="utf-8",
        )
    await db.flush()
