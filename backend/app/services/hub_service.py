"""Aryorithm Hub business logic: manifest linter, semver, search, seed.

Pure helpers where possible (no FastAPI imports) so routers *and* tests
share them. SQLite-friendly throughout — full-text search is a denormalized
``search_text`` LIKE match (upgrade path: Postgres tsvector / Meilisearch).
"""

import base64
import hashlib
import io
import json
import re
import secrets
import tarfile
import time
from datetime import datetime, timezone

import yaml

# ---------------------------------------------------------------------------
# vocabularies (single source of truth for filters + linter)
# ---------------------------------------------------------------------------
CATEGORIES = (
    "industrial-ot",
    "energy-utilities",
    "healthcare-iot",
    "aviation-defense",
    "ai-models",
    "wasm-micro-rules",
)
RUNTIMES = ("NATIVE_CPP20", "WASM_SANDBOX", "LUAJIT", "ONNX_NEURAL_WEIGHTS")
SILICON_TARGETS = ("UNIVERSAL", "INTEL_OPENVINO", "NVIDIA_TENSORRT", "ROCKCHIP_RKNN", "HAILO_HAILORT")
VERIFICATION_TIERS = ("OFFICIAL_CORE", "ENTERPRISE_AUDITED", "COMMUNITY_VERIFIED", "EXPERIMENTAL")
SORTS = ("popular", "recent", "latency", "alpha")

_MANIFEST_ID_RE = re.compile(r"^[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+$")
_SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.\-]+)?$")


# ---------------------------------------------------------------------------
# semver
# ---------------------------------------------------------------------------
def semver_key(version: str) -> tuple[int, int, int, str]:
    """Sort key for ``major.minor.patch``; garbage sorts below everything."""
    m = _SEMVER_RE.match((version or "").strip())
    if not m:
        return (-1, -1, -1, version or "")
    return (int(m.group(1)), int(m.group(2)), int(m.group(3)), "")


def is_newer(a: str, b: str) -> bool:
    return semver_key(a) > semver_key(b)


# ---------------------------------------------------------------------------
# key / signature codecs (accept hex with optional 0x prefix, or base64)
# ---------------------------------------------------------------------------
def decode_key_material(raw: str, expect_len: int, what: str) -> bytes:
    s = (raw or "").strip()
    if s.lower().startswith("0x"):
        s = s[2:]
    try:
        if len(s) == expect_len * 2:
            return bytes.fromhex(s)
    except ValueError:
        pass
    try:
        blob = base64.b64decode(s)
    except Exception as exc:
        raise ValueError(f"{what} is neither hex nor base64") from exc
    if len(blob) != expect_len:
        raise ValueError(f"{what} must decode to exactly {expect_len} bytes")
    return blob


def verify_ed25519(public_key_raw: str, signature_raw: str, payload: bytes) -> bool:
    """Verify an Ed25519 signature. Returns True/False (never raises)."""
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives.asymmetric import ed25519

        pub = ed25519.Ed25519PublicKey.from_public_bytes(decode_key_material(public_key_raw, 32, "public key"))
        sig = decode_key_material(signature_raw, 64, "signature")
        pub.verify(sig, payload)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# splugin.yaml manifest linter
# ---------------------------------------------------------------------------
def lint_manifest(manifest_yaml: str) -> dict:
    """Lint a raw ``splugin.yaml``.

    Returns ``{"valid", "errors"[{field,message}], "warnings"[{code,message}],
    "parsed_metadata"{id,version,runtime}}``. Shape mirrors the API spec so
    the router can return it verbatim (200 when valid, 422 when not).
    """
    errors: list[dict] = []
    warnings: list[dict] = []

    try:
        doc = yaml.safe_load(manifest_yaml or "")
    except yaml.YAMLError as exc:
        return {
            "valid": False,
            "errors": [{"field": "manifest", "message": f"YAML parse error: {exc}"}],
            "warnings": [],
            "parsed_metadata": {},
        }
    if not isinstance(doc, dict):
        return {
            "valid": False,
            "errors": [{"field": "manifest", "message": "Top-level YAML mapping required"}],
            "warnings": [],
            "parsed_metadata": {},
        }

    schema_version = doc.get("schema_version")
    if not schema_version:
        errors.append({"field": "schema_version", "message": "Missing required field"})
    elif str(schema_version) != "1.0.0":
        warnings.append({
            "code": "SCHEMA_VERSION_DRIFT",
            "message": f"Schema {schema_version} is newer than linter 1.0.0; unknown fields ignored.",
        })

    meta = doc.get("metadata") or {}
    pkg_id = meta.get("id", "")
    version = str(meta.get("version", ""))
    if not pkg_id or not _MANIFEST_ID_RE.match(str(pkg_id)):
        errors.append({"field": "metadata.id", "message": 'Required as "author/name" (letters, digits, . _ -)'})
    if not _SEMVER_RE.match(version):
        errors.append({"field": "metadata.version", "message": "Required semantic version (major.minor.patch)"})
    if not meta.get("title"):
        warnings.append({"code": "MISSING_TITLE", "message": "metadata.title absent; catalog falls back to the slug."})
    if not meta.get("description"):
        warnings.append({"code": "MISSING_DESCRIPTION", "message": "metadata.description absent; catalog card will be sparse."})

    runtime = doc.get("runtime") or {}
    runtime_type = runtime.get("type", "")
    if runtime_type not in RUNTIMES:
        errors.append({"field": "runtime.type", "message": f"Required one of: {', '.join(RUNTIMES)}"})
    elif runtime_type == "NATIVE_CPP20" and not runtime.get("abi_version"):
        errors.append({"field": "runtime.abi_version", "message": "Field 'runtime.abi_version' is required for NATIVE_CPP20 plugins."})

    network = doc.get("network") or {}
    for port in network.get("default_ports") or []:
        if not isinstance(port, int) or not 1 <= port <= 65535:
            errors.append({"field": "network.default_ports", "message": f"Port {port!r} exceeds valid TCP/UDP range (1-65535)."})

    silicon = doc.get("silicon") or {}
    for target in silicon.get("supported") or []:
        if target not in SILICON_TARGETS:
            errors.append({"field": "silicon.supported", "message": f"Unknown silicon target {target!r} (expected one of: {', '.join(SILICON_TARGETS)})"})

    capabilities = doc.get("capabilities") or []
    if "CAP_NET_ADMIN" in capabilities:
        warnings.append({
            "code": "CAP_NET_ADMIN_REQUIRED",
            "message": "Package requests CAP_NET_ADMIN. Will require manual review for Official tier.",
        })

    security = doc.get("security") or {}
    if "max_memory_mb" in security:
        mem = security["max_memory_mb"]
        if not isinstance(mem, int) or mem <= 0:
            errors.append({"field": "security.max_memory_mb", "message": "Must be a positive integer (MB)."})

    parsed = {"id": pkg_id, "version": version, "runtime": runtime_type} if not errors else {}
    return {"valid": not errors, "errors": errors, "warnings": warnings, "parsed_metadata": parsed}


# ---------------------------------------------------------------------------
# search helpers
# ---------------------------------------------------------------------------
def build_search_text(title: str, description: str, tags: list, mitre_ids: list) -> str:
    parts = [title or "", description or "", *[str(t) for t in (tags or [])], *[str(m) for m in (mitre_ids or [])]]
    return " ".join(parts).lower()


def like_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_zulu(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def timestamp_ns() -> int:
    return time.time_ns()


def new_public_id() -> str:
    return f"pkg-{secrets.token_hex(4)}"


def new_token_id() -> str:
    return f"tok-{secrets.token_hex(2)}"


def new_api_key() -> str:
    return f"ary_hub_live_{secrets.token_hex(16)}"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# air-gapped bundle
# ---------------------------------------------------------------------------
def build_airgap_bundle(plugins: list[dict], target_silicon: str) -> tuple[bytes, str]:
    """Assemble a sneakernet ``.tar.gz``.

    ``plugins`` entries: {slug, version, package_bytes, manifest (dict),
    sha256, signature, min_sentinel_version}. Returns (bytes, filename).
    Verifies offline with the bundled ``VERIFY.sh`` (sha256sum, no network).
    """
    stamp = utcnow().strftime("%Y%m%d")
    filename = f"aryorithm_airgap_bundle_{stamp}.tar.gz"
    manifest = {
        "bundle": "aryorithm-hub-airgap",
        "generated_at": to_zulu(utcnow()),
        "target_silicon": target_silicon,
        "plugins": [
            {
                "slug": p["slug"],
                "version": p["version"],
                "sha256": p["sha256"],
                "signature": p["signature"],
                "min_sentinel_version": p.get("min_sentinel_version", ">= 2.0.0"),
                "file": f"{p['slug']}-{p['version']}.splugin",
            }
            for p in plugins
        ],
    }
    verify_lines = ["#!/bin/sh", "# Offline verification — no network required.", "set -eu", ""]
    for p in plugins:
        fname = f"{p['slug']}-{p['version']}.splugin"
        verify_lines.append(f'echo "{p["sha256"]}  {fname}" | sha256sum -c -')
    verify_lines.append('echo "ALL PACKAGES VERIFIED"')
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for p in plugins:
            fname = f"{p['slug']}-{p['version']}.splugin"
            data = p["package_bytes"]
            info = tarfile.TarInfo(fname)
            info.size = len(data)
            info.mtime = int(utcnow().timestamp())
            tar.addfile(info, io.BytesIO(data))
            meta = json.dumps(p["manifest"], indent=2).encode()
            mi = tarfile.TarInfo(f"{p['slug']}-{p['version']}.manifest.json")
            mi.size = len(meta)
            mi.mtime = info.mtime
            tar.addfile(mi, io.BytesIO(meta))
        for name, payload in (
            ("bundle.manifest.json", json.dumps(manifest, indent=2).encode()),
            ("VERIFY.sh", ("\n".join(verify_lines) + "\n").encode()),
        ):
            info = tarfile.TarInfo(name)
            info.size = len(payload)
            info.mtime = int(utcnow().timestamp())
            if name.endswith(".sh"):
                info.mode = 0o755
            tar.addfile(info, io.BytesIO(payload))
    return buf.getvalue(), filename


# ---------------------------------------------------------------------------
# seed
# ---------------------------------------------------------------------------
async def ensure_seed(db) -> None:
    """Insert the demo catalog once, when the plugins table is empty.

    Same lazy-seed pattern as the plans matrix: keeps fresh checkouts and
    CI functional without running seed scripts. Seed artifacts are signed
    with an ephemeral key whose public half is stored on the seed authors,
    so download/security headers stay self-consistent.
    """
    from sqlalchemy import select

    from app.models.hub import HubAuthor, HubPlugin, HubPluginVersion
    from app.services import hub_catalog as catalog

    existing = (await db.execute(select(HubPlugin.id))).first()
    if existing is not None:
        return

    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519

    seed_key = ed25519.Ed25519PrivateKey.generate()
    seed_pub = base64.b64encode(
        seed_key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw
        )
    ).decode()

    authors: dict[str, HubAuthor] = {}

    def author_for(spec: dict) -> HubAuthor:
        name = spec.get("name", "Community")
        if name not in authors:
            row = HubAuthor(
                name=name,
                avatar_url=spec.get("avatar_url") or "https://hub.aryorithm.com/assets/authors/aryorithm.png",
                verified=bool(spec.get("verified", False)),
                github_handle=spec.get("github_handle", ""),
                website=spec.get("website", ""),
                public_key=seed_pub,
            )
            db.add(row)
            authors[name] = row
        return authors[name]

    for spec in catalog.SEED_PLUGINS:
        author = author_for(spec.get("author") or {})
        plugin = HubPlugin(
            public_id=new_public_id(),
            slug=spec["slug"],
            title=spec["title"],
            short_description=spec.get("short_description", ""),
            category=spec.get("category", "industrial-ot"),
            runtime=spec.get("runtime", "NATIVE_CPP20"),
            supported_silicon=list(spec.get("supported_silicon") or ["UNIVERSAL"]),
            verification_tier=spec.get("verification_tier", "COMMUNITY_VERIFIED"),
            author=author,
            install_count=int(spec.get("install_count", 0)),
            stars_count=int(spec.get("stars_count", 0)),
            fast_path_latency_us=spec.get("fast_path_latency_us"),
            ports=list(spec.get("ports") or []),
            tags=list(spec.get("tags") or []),
            mitre_ids=list(spec.get("mitre_ids") or []),
            repository_url=spec.get("repository_url", ""),
            is_featured=bool(spec.get("is_featured", False)),
            search_text=build_search_text(
                spec["title"], spec.get("short_description", ""),
                spec.get("tags") or [], spec.get("mitre_ids") or [],
            ),
        )
        db.add(plugin)
        for vspec in spec.get("versions") or []:
            manifest_yaml = catalog.seed_manifest_yaml(spec["slug"], vspec["version"], plugin.runtime)
            artifact = (
                f"SPLUGIN\x00{spec['slug']}\x00{vspec['version']}\x00"
                f"{plugin.runtime}\x00seed-artifact".encode()
            )
            digest = sha256_hex(artifact)
            sig = seed_key.sign(artifact).hex()
            db.add(HubPluginVersion(
                plugin=plugin,
                version=vspec["version"],
                changelog=vspec.get("changelog", ""),
                release_date=utcnow(),
                sha256=digest,
                signature=sig,
                package_size_bytes=len(artifact),
                min_sentinel_version=spec.get("min_sentinel_version", ">= 2.0.0"),
                manifest_yaml=manifest_yaml,
                readme_markdown=vspec.get("readme", ""),
                security_envelope=dict(spec.get("security_envelope") or {}),
                dependencies=[],
                artifact_path="",  # seed artifacts live in-DB… see note below
            ))
        await db.flush()

    # NOTE: seed versions carry no on-disk artifact (artifact_path == "").
    # Download synthesizes the same deterministic bytes via seed_artifact()
    # so headers stay consistent without shipping binaries in git.
    await db.flush()


def seed_artifact(slug: str, version: str, runtime: str) -> bytes:
    """Deterministic stand-in bytes for seed-version downloads."""
    return f"SPLUGIN\x00{slug}\x00{version}\x00{runtime}\x00seed-artifact".encode()
