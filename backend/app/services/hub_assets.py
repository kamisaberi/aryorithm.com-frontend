"""Unified read model across the five Hub asset catalogs.

The public API exposes ``/hub/catalog``, ``/hub/search`` and
``/hub/assets/{asset_type}/{slug}`` over data that already lives in five
separate tables.  This module normalises those rows into one ``AssetView``
without duplicating or migrating the underlying catalogs.

Signatures for seeded/stand-in artifacts are generated lazily with a
deterministic deployment key derived from ``SECRET_KEY`` (the repo already
uses ephemeral keys for seeded model artifacts).  Real publications persist
their author signature and enrolled public key in ``hub_asset_meta``.
"""

from __future__ import annotations

import difflib
import hashlib
import os
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import func, select

from app.config import settings
from app.models.hub_assets import HubAssetMeta
from app.services import hub_access as access
from app.services import hub_service as hub

ASSET_TYPES = (
    "package",
    "model",
    "dataset",
    "pcap",
    "scenario",
    "blueprint",
    "appliance",
)
ASSET_TYPE_ALIASES = {
    "package": "package",
    "packages": "package",
    "model": "model",
    "models": "model",
    "dataset": "dataset",
    "datasets": "dataset",
    "pcap": "pcap",
    "pcaps": "pcap",
    "scenario": "scenario",
    "scenarios": "scenario",
    "blueprint": "blueprint",
    "blueprints": "blueprint",
    "appliance": "appliance",
    "appliances": "appliance",
}

_LIBRARY_DIRS = {"pcap": "pcaps", "dataset": "datasets", "scenario": "scenarios"}
_LIBRARY_LABELS = {"pcap": "PCAP", "dataset": "Dataset", "scenario": "Scenario"}
_BLUEPRINT_TYPE = "blueprint"
_APPLIANCE_TYPE = "appliance"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def normalize_asset_type(value: str) -> str:
    key = (value or "").strip().lower()
    resolved = ASSET_TYPE_ALIASES.get(key)
    if resolved is None:
        raise ValueError(f"Unknown asset_type '{value}'. Use one of: {', '.join(ASSET_TYPES)}.")
    return resolved


def _enum_value(value: Any) -> str:
    return str(getattr(value, "value", value))


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _timestamp(value: datetime | None) -> float:
    normalized = _as_utc(value)
    return normalized.timestamp() if normalized else 0.0


@lru_cache(maxsize=1)
def seed_private_key():
    from cryptography.hazmat.primitives.asymmetric import ed25519

    seed = hashlib.sha256(f"aryorithm-hub-seed-v1:{settings.SECRET_KEY}".encode()).digest()
    return ed25519.Ed25519PrivateKey.from_private_bytes(seed)


@lru_cache(maxsize=1)
def seed_public_key_hex() -> str:
    return seed_private_key().public_key().public_bytes_raw().hex()


def _seed_signature(blob: bytes) -> str:
    return seed_private_key().sign(blob).hex()


def _readme_package(row) -> str:
    return (
        f"# {row.name}\n\n"
        f"{row.short_description}\n\n"
        "## Technical details\n\n"
        f"{row.technical_details}\n\n"
        "## Installation\n\n"
        "```bash\n"
        f"{row.install_command}\n"
        "```\n\n"
        "## Runtime contract\n\n"
        f"- Tier: `{row.tier}` ({row.tier_display})\n"
        f"- Language: `{row.language}`\n"
        f"- Target protocol: `{row.target_protocol}`\n"
        f"- Default port: `{row.default_port}`\n"
        f"- Mitigation: `{row.mitigation_action}`\n"
        f"- Latency SLA: `{row.latency_display}`\n"
    )


def _readme_pcap(row) -> str:
    mitre = "\n".join(f"- `{m}`" for m in (row.mitre_attack_ids or [])) or "- None recorded"
    return (
        f"# {row.title}\n\n"
        f"{row.short_description}\n\n"
        "## Technical analysis\n\n"
        f"{row.technical_analysis}\n\n"
        "## Capture metadata\n\n"
        f"- Category: `{_enum_value(row.category)}`\n"
        f"- Protocol: `{row.target_protocol}`\n"
        f"- Attack: {row.attack_type}\n"
        f"- Source: {row.source_origin}\n"
        f"- Packets: `{row.packet_count}` over `{row.duration_seconds}` seconds\n\n"
        "## MITRE ATT&CK\n\n"
        f"{mitre}\n"
    )


def _readme_dataset(row) -> str:
    doi = f"- DOI: [{row.doi_citation}](https://doi.org/{row.doi_citation})\n" if row.doi_citation else ""
    return (
        f"# {row.name}\n\n"
        f"{row.short_description}\n\n"
        "## Dataset card\n\n"
        f"- Format: `{_enum_value(row.format)}`\n"
        f"- Tensor dimension: `{row.tensor_dimension}`\n"
        f"- Records: `{row.total_records}` (`{row.normal_records_count}` normal / "
        f"`{row.anomalous_records_count}` anomalous)\n"
        f"- Normalization: {row.normalization_method}\n"
        f"- Source benchmark: {row.source_benchmark}\n"
        f"- Throughput: {row.streaming_throughput_eps or 'not recorded'}\n"
        f"{doi}\n"
        "## Citation\n\n"
        f"{row.paper_reference}\n"
    )


def _readme_scenario(row) -> str:
    attacks = "\n".join(f"- {a}" for a in (row.replayed_attacks or [])) or "- None recorded"
    nodes = "\n".join(
        f"- `{name}` — {spec.get('ip', '?')} ({spec.get('role', 'node')})"
        for name, spec in (row.node_topology or {}).items()
        if isinstance(spec, dict)
    ) or "- Not recorded"
    return (
        f"# {row.name}\n\n"
        f"{row.short_description}\n\n"
        "## Technical walkthrough\n\n"
        f"{row.technical_walkthrough}\n\n"
        "## Topology\n\n"
        f"- Subnet: `{row.network_subnet}`\n"
        f"{nodes}\n\n"
        "## Replayed attacks\n\n"
        f"{attacks}\n\n"
        "## Expected mitigation\n\n"
        f"{row.expected_mitigation_sla}\n\n"
        "## Pull command\n\n"
        "```bash\n"
        f"{row.cli_pull_command}\n"
        "```\n"
    )


def _readme_blueprint(row) -> str:
    deps = row.dependencies_json or {}
    packages = "\n".join(f"- `{p}`" for p in deps.get("packages", [])) or "- None recorded"
    models = "\n".join(f"- `{m}`" for m in deps.get("models", [])) or "- None recorded"
    return (
        f"# {row.name}\n\n"
        f"{row.description}\n\n"
        "## Deployment contract\n\n"
        f"- Target site: `{row.target_site or 'any'}`\n"
        f"- Industry: `{row.industry}`\n"
        f"- Architecture: `{row.target_architecture}`\n"
        f"- Primary interface: `{row.primary_interface}`\n"
        f"- Max pipeline latency: `{row.max_pipeline_latency_us} us`\n\n"
        "## Dependencies\n\n"
        f"{packages}\n\n"
        f"{models}\n"
    )


def _readme_appliance(row) -> str:
    return (
        f"# {row.title}\n\n"
        "Official Aryorithm air-gapped appliance release.\n\n"
        "## Release matrix\n\n"
        f"- Architecture: `{row.architecture}`\n"
        f"- Industry: `{row.industry}`\n"
        f"- License tier: `{row.license_tier}`\n"
        f"- Version: `{row.version}`\n"
        f"- Health checks: `{row.verified_health_checks}`\n\n"
        "## Installation\n\n"
        "```bash\n"
        f"sudo ./{row.file_name}\n"
        "```\n"
    )


def _readme_model(model, version, artifact) -> str:
    release_notes = getattr(version, "release_notes", "") or ""
    return (
        f"# {model.name}\n\n"
        f"{model.short_description}\n\n"
        "## Technical description\n\n"
        f"{model.technical_description}\n\n"
        "## Architecture\n\n"
        f"- Domain: `{model.domain}`\n"
        f"- Architecture: `{model.architecture}`\n"
        f"- Input: `{model.input_tensor_shape}`\n"
        f"- Output: `{model.output_tensor_shape}`\n"
        f"- Latest version: `{version.version}`\n"
        f"- Artifact: `{artifact.file_name}` ({artifact.file_size_bytes} bytes)\n\n"
        "## Release notes\n\n"
        f"{release_notes or 'No release notes recorded.'}\n"
    )


# ---------------------------------------------------------------------------
# normalised view
# ---------------------------------------------------------------------------
@dataclass
class AssetView:
    asset_type: str
    id: str
    slug: str
    name: str
    tier: str
    version: str
    description: str
    author: str
    author_public_key: str
    target_protocol: str
    latency_sla_ns: int
    latency_display: str
    downloads: int
    size_bytes: int
    verified_signature: bool
    compliance: list[str]
    published_at: datetime | None
    industry: str
    sha256: str
    file_name: str
    manifest: dict
    readme_markdown: str
    benchmark: dict
    source: Any
    meta: HubAssetMeta | None = None
    artifact: Any | None = None
    artifact_path: Path | None = None
    permissions: list[str] = field(default_factory=list)

    @property
    def download_url(self) -> str:
        return f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/download"

    @property
    def signature_status(self) -> str:
        if self.meta is not None and self.meta.signature:
            return "Ed25519_VALID"
        return "Ed25519_VALID" if self.verified_signature else "UNSIGNED"

    @property
    def visibility(self) -> str:
        return access.visibility_of(self)

    @property
    def owner_user_id(self) -> str | None:
        return access.owner_user_id(self)

    @property
    def owner_tenant_id(self) -> str | None:
        return access.owner_tenant_id(self)

    @property
    def forked_from(self) -> dict | None:
        return access.forked_from(self)

    @property
    def fork_count(self) -> int:
        return int(self.meta.fork_count or 0) if self.meta is not None else 0

    @property
    def orphaned_root(self) -> bool:
        return bool(self.meta.orphaned_root) if self.meta is not None else False

    def list_item(self) -> dict:
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "asset_type": self.asset_type,
            "tier": self.tier,
            "version": self.version,
            "author": self.author,
            "author_public_key": self.author_public_key,
            "target_protocol": self.target_protocol,
            "latency_sla_ns": self.latency_sla_ns,
            "downloads": self.downloads,
            "size_bytes": self.size_bytes,
            "verified_signature": self.verified_signature,
            "compliance": list(self.compliance),
            "published_at": hub.to_zulu(self.published_at),
            "description": self.description,
            "industry": self.industry,
            "download_url": self.download_url,
            "visibility": self.visibility,
            "owner_user_id": self.owner_user_id,
            "owner_tenant_id": self.owner_tenant_id,
            "forked_from": self.forked_from,
            "fork_count": self.fork_count,
            "orphaned_root": self.orphaned_root,
            "permissions": list(self.permissions),
        }

    def detail(self) -> dict:
        payload = self.list_item()
        payload.update(
            {
                "merkle_sha256": self.sha256,
                "signature_status": self.signature_status,
                "file_size": self.size_bytes,
                "manifest": dict(self.manifest or {}),
                "readme_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/readme",
                "sla_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/sla",
                "signature_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/signature",
                "fork_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/fork",
                "forks_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/forks",
                "lineage_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/lineage",
                "shares_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/shares",
                "share_links_url": f"/api/v1/hub/assets/{self.asset_type}/{self.slug}/share-links",
            }
        )
        return payload


# ---------------------------------------------------------------------------
# loading
# ---------------------------------------------------------------------------
async def ensure_seeded(db) -> None:
    """Make sure all five catalogs are populated (idempotent)."""
    from app.services import hub_library as lib
    from app.services import model_vault as vault
    from app.services import sentinel_packages as spkg

    await spkg.ensure_seed(db)
    await lib.ensure_seed(db)
    await vault.ensure_seed(db)


async def _meta_map(db) -> dict[tuple[str, str], HubAssetMeta]:
    rows = (await db.execute(select(HubAssetMeta))).scalars().all()
    return {(m.asset_type, m.slug): m for m in rows}


def _package_view(row, meta: HubAssetMeta | None) -> AssetView:
    from app.services import sentinel_packages as spkg

    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "id": row.id,
            "name": row.name,
            "slug": row.slug,
            "version": row.version,
            "asset_type": "package",
            "tier": row.tier,
            "target_protocol": row.target_protocol,
            "default_port": row.default_port,
            "latency_sla_ns": row.latency_sla_ns,
            "mitigation_action": row.mitigation_action,
            "compliance": list(row.compliance_tags or []),
            "short_description": row.short_description,
        }
    return AssetView(
        asset_type="package",
        id=row.id,
        slug=row.slug,
        name=row.name,
        tier=row.tier,
        version=row.version,
        description=row.short_description,
        author=meta.author if meta and meta.author else row.author,
        author_public_key=(meta.public_key if meta and meta.public_key else seed_public_key_hex()),
        target_protocol=row.target_protocol,
        latency_sla_ns=int(row.latency_sla_ns or 0),
        latency_display=row.latency_display,
        downloads=int(meta.download_count or 0) if meta else 0,
        size_bytes=int(row.package_file_size_bytes or 0),
        verified_signature=True if meta is None else bool(meta.signature),
        compliance=list(meta.compliance or row.compliance_tags or []) if meta else list(row.compliance_tags or []),
        published_at=row.created_at,
        industry=row.sector,
        sha256=(meta.sha256 if meta and meta.sha256 else spkg.spkg_sha256(row)),
        file_name=(meta.file_name if meta and meta.file_name else row.package_file_name),
        manifest=manifest,
        readme_markdown=(meta.readme_markdown if meta and meta.readme_markdown else _readme_package(row)),
        benchmark={
            "tier": row.tier,
            "tier_display": row.tier_display,
            "latency_sla_ns": row.latency_sla_ns,
            "latency_display": row.latency_display,
            "mitigation_action": row.mitigation_action,
            "default_port": row.default_port,
        },
        source=row,
        meta=meta,
    )


def _pcap_view(row, meta: HubAssetMeta | None) -> AssetView:
    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "name": row.title,
            "slug": row.slug,
            "version": "1.0.0",
            "asset_type": "pcap",
            "category": _enum_value(row.category),
            "target_protocol": row.target_protocol,
            "attack_type": row.attack_type,
            "source_origin": row.source_origin,
            "packet_count": row.packet_count,
            "duration_seconds": row.duration_seconds,
            "mitre_attack_ids": list(row.mitre_attack_ids or []),
        }
    return AssetView(
        asset_type="pcap",
        id=row.id,
        slug=row.slug,
        name=row.title,
        tier="pcap",
        version=(meta.version if meta and meta.version else "1.0.0"),
        description=row.short_description,
        author=(meta.author if meta and meta.author else "Aryorithm Research"),
        author_public_key=(meta.public_key if meta and meta.public_key else seed_public_key_hex()),
        target_protocol=row.target_protocol,
        latency_sla_ns=0,
        latency_display="",
        downloads=int(row.download_count or 0),
        size_bytes=int(row.file_size_bytes or 0),
        verified_signature=True if meta is None else bool(meta.signature),
        compliance=list(meta.compliance or []) if meta else [],
        published_at=row.created_at,
        industry=_enum_value(row.category),
        sha256=row.sha256_checksum,
        file_name=(meta.file_name if meta and meta.file_name else row.file_name),
        manifest=manifest,
        readme_markdown=(meta.readme_markdown if meta and meta.readme_markdown else _readme_pcap(row)),
        benchmark={
            "category": _enum_value(row.category),
            "target_protocol": row.target_protocol,
            "attack_type": row.attack_type,
            "source_origin": row.source_origin,
            "packet_count": row.packet_count,
            "duration_seconds": row.duration_seconds,
            "mitre_attack_ids": list(row.mitre_attack_ids or []),
        },
        source=row,
        meta=meta,
    )


def _dataset_view(row, meta: HubAssetMeta | None) -> AssetView:
    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "name": row.name,
            "slug": row.slug,
            "version": "1.0.0",
            "asset_type": "dataset",
            "format": _enum_value(row.format),
            "tensor_dimension": row.tensor_dimension,
            "total_records": row.total_records,
            "normalization_method": row.normalization_method,
            "source_benchmark": row.source_benchmark,
        }
    return AssetView(
        asset_type="dataset",
        id=row.id,
        slug=row.slug,
        name=row.name,
        tier=_enum_value(row.format),
        version=(meta.version if meta and meta.version else "1.0.0"),
        description=row.short_description,
        author=(meta.author if meta and meta.author else "Aryorithm Research"),
        author_public_key=(meta.public_key if meta and meta.public_key else seed_public_key_hex()),
        target_protocol="SLAB",
        latency_sla_ns=0,
        latency_display="",
        downloads=int(row.download_count or 0),
        size_bytes=int(row.file_size_bytes or 0),
        verified_signature=True if meta is None else bool(meta.signature),
        compliance=list(meta.compliance or []) if meta else [],
        published_at=row.created_at,
        industry=row.source_benchmark or "Research",
        sha256=row.sha256_checksum,
        file_name=(meta.file_name if meta and meta.file_name else row.file_name),
        manifest=manifest,
        readme_markdown=(meta.readme_markdown if meta and meta.readme_markdown else _readme_dataset(row)),
        benchmark={
            "format": _enum_value(row.format),
            "tensor_dimension": row.tensor_dimension,
            "total_records": row.total_records,
            "normal_records_count": row.normal_records_count,
            "anomalous_records_count": row.anomalous_records_count,
            "normalization_method": row.normalization_method,
            "source_benchmark": row.source_benchmark,
            "streaming_throughput_eps": row.streaming_throughput_eps,
        },
        source=row,
        meta=meta,
    )


def _scenario_view(row, meta: HubAssetMeta | None) -> AssetView:
    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "name": row.name,
            "slug": row.slug,
            "version": "1.0.0",
            "asset_type": "scenario",
            "complexity": _enum_value(row.complexity),
            "target_sector": row.target_sector,
            "network_subnet": row.network_subnet,
            "node_topology": dict(row.node_topology or {}),
            "replayed_attacks": list(row.replayed_attacks or []),
            "expected_mitigation_sla": row.expected_mitigation_sla,
        }
    return AssetView(
        asset_type="scenario",
        id=row.id,
        slug=row.slug,
        name=row.name,
        tier="scenario",
        version=(meta.version if meta and meta.version else "1.0.0"),
        description=row.short_description,
        author=(meta.author if meta and meta.author else "Aryorithm Research"),
        author_public_key=(meta.public_key if meta and meta.public_key else seed_public_key_hex()),
        target_protocol="MULTI_PROTOCOL",
        latency_sla_ns=0,
        latency_display=row.expected_mitigation_sla,
        downloads=int(row.download_count or 0),
        size_bytes=int(row.file_size_bytes or 0),
        verified_signature=True if meta is None else bool(meta.signature),
        compliance=list(meta.compliance or []) if meta else [],
        published_at=row.created_at,
        industry=row.target_sector,
        sha256=row.sha256_checksum,
        file_name=(meta.file_name if meta and meta.file_name else row.file_name),
        manifest=manifest,
        readme_markdown=(meta.readme_markdown if meta and meta.readme_markdown else _readme_scenario(row)),
        benchmark={
            "complexity": _enum_value(row.complexity),
            "network_subnet": row.network_subnet,
            "node_topology": dict(row.node_topology or {}),
            "replayed_attacks": list(row.replayed_attacks or []),
            "expected_mitigation_sla": row.expected_mitigation_sla,
        },
        source=row,
        meta=meta,
    )


def _blueprint_view(row, meta: HubAssetMeta | None) -> AssetView:
    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "name": row.name,
            "slug": row.slug,
            "version": row.version,
            "asset_type": "blueprint",
            "target_site": row.target_site,
            "industry": row.industry,
            "target_architecture": row.target_architecture,
            "primary_interface": row.primary_interface,
            "max_pipeline_latency_us": row.max_pipeline_latency_us,
            "dependencies": dict(row.dependencies_json or {}),
            "hardware_binding": dict(row.hardware_binding_json or {}),
            "sla_guarantees": dict(row.sla_guarantees_json or {}),
        }
    compliance = list(meta.compliance or []) if meta else []
    return AssetView(
        asset_type=_BLUEPRINT_TYPE,
        id=row.id,
        slug=row.slug,
        name=row.name,
        tier="blueprint",
        version=row.version,
        description=row.description,
        author=(meta.author if meta and meta.author else row.author),
        author_public_key=(meta.public_key if meta and meta.public_key else row.author_public_key),
        target_protocol=row.primary_interface,
        latency_sla_ns=int(float(row.max_pipeline_latency_us or 0.0) * 1000),
        latency_display=f"{float(row.max_pipeline_latency_us or 0.0):g} us",
        downloads=int(row.downloads or 0),
        size_bytes=int(row.file_size_bytes or 0),
        verified_signature=bool(row.verified_signature),
        compliance=compliance,
        published_at=row.created_at,
        industry=row.industry,
        sha256=row.sha256,
        file_name=row.file_name,
        manifest=manifest,
        readme_markdown=(meta.readme_markdown if meta and meta.readme_markdown else _readme_blueprint(row)),
        benchmark={
            "target_architecture": row.target_architecture,
            "primary_interface": row.primary_interface,
            "max_pipeline_latency_us": row.max_pipeline_latency_us,
            "dependencies": dict(row.dependencies_json or {}),
            "hardware_binding": dict(row.hardware_binding_json or {}),
            "sla_guarantees": dict(row.sla_guarantees_json or {}),
        },
        source=row,
        meta=meta,
    )


def _appliance_view(row, meta: HubAssetMeta | None) -> AssetView:
    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "name": row.title,
            "slug": row.slug,
            "version": row.version,
            "asset_type": "appliance",
            "architecture": row.architecture,
            "industry": row.industry,
            "license_tier": row.license_tier,
            "verified_health_checks": row.verified_health_checks,
        }
    compliance = list(meta.compliance or []) if meta else []
    return AssetView(
        asset_type=_APPLIANCE_TYPE,
        id=row.id,
        slug=row.slug,
        name=row.title,
        tier=row.license_tier,
        version=row.version,
        description="Official Aryorithm air-gapped appliance release.",
        author=(meta.author if meta and meta.author else "Aryorithm Authority"),
        author_public_key=(meta.public_key if meta and meta.public_key else ""),
        target_protocol=row.architecture,
        latency_sla_ns=0,
        latency_display="",
        downloads=int(row.download_count or 0),
        size_bytes=int(row.file_size_bytes or 0),
        verified_signature=True,
        compliance=compliance,
        published_at=row.created_at,
        industry=row.industry,
        sha256=row.sha256_checksum,
        file_name=row.file_name,
        manifest=manifest,
        readme_markdown=(meta.readme_markdown if meta and meta.readme_markdown else _readme_appliance(row)),
        benchmark={
            "architecture": row.architecture,
            "industry": row.industry,
            "license_tier": row.license_tier,
            "verified_health_checks": row.verified_health_checks,
        },
        source=row,
        meta=meta,
    )


async def _model_view(
    db, model, meta: HubAssetMeta | None, *, allow_deprecated: bool = False
) -> AssetView | None:
    from app.models.modelvault import AIModelArtifact, AIModelVersion
    from app.services import model_vault as vault

    versions = list((await db.execute(select(AIModelVersion).where(AIModelVersion.model_id == model.id))).scalars().all())
    live = [v for v in versions if _enum_value(v.rollout_stage) != "DEPRECATED"]
    if not live and not allow_deprecated:
        return None
    latest = vault.latest_of(live)
    if latest is None:
        latest = vault.latest_of(versions)
    if latest is None:
        return None
    artifacts = list(
        (
            await db.execute(
                select(AIModelArtifact)
                .where(AIModelArtifact.version_id == latest.id)
                .order_by(AIModelArtifact.file_name)
            )
        )
        .scalars()
        .all()
    )
    if not artifacts:
        return None
    preferred = next(
        (
            a
            for a in artifacts
            if _enum_value(a.format) == "ONNX" and _enum_value(a.precision) == "INT8"
        ),
        None,
    )
    preferred = preferred or next((a for a in artifacts if _enum_value(a.format) == "ONNX"), artifacts[0])
    artifact = preferred
    artifact_path = vault.vault_root() / artifact.s3_storage_key

    # If publication metadata points at a specific artifact, prefer it so the
    # generic download and signature headers always describe the same bytes.
    if meta is not None and meta.sha256:
        matching = next((a for a in artifacts if a.sha256_checksum == meta.sha256), None)
        if matching is not None:
            artifact = matching
            artifact_path = vault.vault_root() / matching.s3_storage_key

    manifest = dict(meta.manifest or {}) if meta else {}
    if not manifest:
        manifest = {
            "name": model.name,
            "slug": model.slug,
            "version": latest.version,
            "asset_type": "model",
            "tier": _enum_value(model.tier),
            "domain": model.domain,
            "architecture": model.architecture,
            "input_tensor_shape": model.input_tensor_shape,
            "output_tensor_shape": model.output_tensor_shape,
            "format": _enum_value(artifact.format),
            "precision": _enum_value(artifact.precision),
            "target_hardware": artifact.target_hardware,
            "golden_safety_verified": bool(latest.golden_safety_verified),
        }
    total_downloads = sum(int(a.download_count or 0) for a in artifacts)
    return AssetView(
        asset_type="model",
        id=model.id,
        slug=model.slug,
        name=model.name,
        tier=_enum_value(model.tier).lower(),
        version=latest.version,
        description=model.short_description,
        author=(meta.author if meta and meta.author else model.author),
        author_public_key=(meta.public_key if meta and meta.public_key else seed_public_key_hex()),
        target_protocol=model.domain,
        latency_sla_ns=int(latest.p99_latency_ns or 0),
        latency_display=f"{int(latest.p99_latency_ns or 0)} ns p99",
        downloads=total_downloads,
        size_bytes=int(artifact.file_size_bytes or 0),
        verified_signature=bool(latest.golden_safety_verified) if meta is None else bool(meta.signature),
        compliance=list(meta.compliance or []) if meta else (
            ["GOLDEN_SAFETY_GATE"] if latest.golden_safety_verified else []
        ),
        published_at=latest.created_at,
        industry=model.domain,
        sha256=artifact.sha256_checksum,
        file_name=(meta.file_name if meta and meta.file_name else artifact.file_name),
        manifest=manifest,
        readme_markdown=(
            meta.readme_markdown
            if meta and meta.readme_markdown
            else _readme_model(model, latest, artifact)
        ),
        benchmark={
            "p99_latency_ns": latest.p99_latency_ns,
            "golden_safety_verified": bool(latest.golden_safety_verified),
            "golden_recall_score": latest.golden_recall_score,
            "base_accuracy": latest.base_accuracy,
            "format": _enum_value(artifact.format),
            "precision": _enum_value(artifact.precision),
            "target_hardware": artifact.target_hardware,
            "model_size_bytes": artifact.file_size_bytes,
            "training_dataset_summary": latest.training_dataset_summary,
        },
        source=model,
        meta=meta,
        artifact=artifact,
        artifact_path=artifact_path,
    )


async def _fetch_source(db, asset_type: str, slug: str):
    await ensure_seeded(db)
    if asset_type == "package":
        from app.models.hub import SentinelPackage

        return (
            await db.execute(select(SentinelPackage).where(SentinelPackage.slug == slug))
        ).scalar_one_or_none()
    if asset_type == "pcap":
        from app.models.hub import HubPcap

        return (
            await db.execute(select(HubPcap).where(HubPcap.slug == slug))
        ).scalar_one_or_none()
    if asset_type == "dataset":
        from app.models.hub import HubDataset

        return (
            await db.execute(select(HubDataset).where(HubDataset.slug == slug))
        ).scalar_one_or_none()
    if asset_type == "scenario":
        from app.models.hub import HubScenario

        return (
            await db.execute(select(HubScenario).where(HubScenario.slug == slug))
        ).scalar_one_or_none()
    if asset_type == _BLUEPRINT_TYPE:
        from app.models.hub_blueprints import HubBlueprint

        return (
            await db.execute(select(HubBlueprint).where(HubBlueprint.slug == slug))
        ).scalar_one_or_none()
    if asset_type == _APPLIANCE_TYPE:
        from app.models.hub_appliances import HubApplianceRelease

        return (
            await db.execute(
                select(HubApplianceRelease).where(HubApplianceRelease.slug == slug)
            )
        ).scalar_one_or_none()
    from app.models.modelvault import AIModel

    return (
        await db.execute(select(AIModel).where(AIModel.slug == slug))
    ).scalar_one_or_none()


async def get_view(
    db,
    asset_type: str,
    slug: str,
    *,
    with_signature: bool = False,
    allow_deprecated: bool = False,
) -> AssetView | None:
    kind = normalize_asset_type(asset_type)
    row = await _fetch_source(db, kind, slug)
    if row is None:
        return None
    meta = (
        await db.execute(
            select(HubAssetMeta).where(
                HubAssetMeta.asset_type == kind, HubAssetMeta.slug == slug
            )
        )
    ).scalar_one_or_none()
    if meta is not None and meta.yanked:
        return None
    if kind == _BLUEPRINT_TYPE and bool(getattr(row, "is_yanked", False)):
        return None
    if kind == _APPLIANCE_TYPE and not bool(getattr(row, "is_active", True)):
        return None
    if kind == "package":
        view = _package_view(row, meta)
    elif kind == "pcap":
        view = _pcap_view(row, meta)
    elif kind == "dataset":
        view = _dataset_view(row, meta)
    elif kind == "scenario":
        view = _scenario_view(row, meta)
    elif kind == _BLUEPRINT_TYPE:
        view = _blueprint_view(row, meta)
    elif kind == _APPLIANCE_TYPE:
        view = _appliance_view(row, meta)
    else:
        view = await _model_view(db, row, meta, allow_deprecated=allow_deprecated)
        if view is None:
            return None
    if with_signature:
        await ensure_asset_signature(db, view)
    return view


# File extensions accepted by the legacy uploader and registry download URLs.
_REFERENCE_SUFFIXES = (
    ".tar.gz",
    ".tar.bz2",
    ".tar.xz",
    ".tgz",
    ".tbz2",
    ".txz",
    ".spkg",
    ".onnx",
    ".slab",
    ".pcapng",
    ".pcap",
    ".zip",
    ".tar",
    ".bin",
)


def _reference_candidates(asset_type: str, reference: str) -> list[str]:
    """Expand a client filename into plausible catalog slugs/file names.

    ``scenario_water_plant.tar.gz`` should resolve the same asset as
    ``water-plant`` when clients append the on-disk archive extension, and
    ``modbus_actuator_guard.spkg`` should resolve ``modbus-actuator-guard``.
    """
    raw = (reference or "").strip()
    if not raw:
        return []
    roots: list[str] = [raw]
    current = raw
    while True:
        lowered = current.lower()
        suffix = next((s for s in _REFERENCE_SUFFIXES if lowered.endswith(s)), None)
        if suffix is None:
            break
        current = current[: -len(suffix)]
        if not current or current == raw:
            break
        roots.append(current)

    prefixes = {
        asset_type,
        f"{asset_type}s",
        "package",
        "packages",
        "model",
        "models",
        "dataset",
        "datasets",
        "pcap",
        "pcaps",
        "scenario",
        "scenarios",
        "blueprint",
        "blueprints",
        "appliance",
        "appliances",
    }
    candidates: list[str] = []

    def add(value: str) -> None:
        if not value:
            return
        for variant in (
            value,
            value.lower(),
            value.replace("_", "-"),
            value.replace("-", "_"),
            value.lower().replace("_", "-"),
            value.lower().replace("-", "_"),
        ):
            if variant and variant not in candidates:
                candidates.append(variant)

    for root in roots:
        add(root)
        lowered = root.lower()
        for prefix in prefixes:
            for separator in ("_", "-"):
                marker = f"{prefix}{separator}"
                if lowered.startswith(marker) and len(root) > len(marker):
                    add(root[len(marker):])
    return candidates


def _token_set(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", (value or "").lower()))


def _fuzzy_match_row(rows, candidates: list[str], attributes: tuple[str, ...]):
    """Return a unique row whose slug/filename contains all reference tokens.

    This handles legacy short names such as ``modbus_guard.spkg`` mapping to
    the published ``modbus-actuator-guard`` package without broad substring
    guessing. Ambiguous matches are deliberately ignored.
    """
    wanted_sets = [
        tokens
        for tokens in (_token_set(value) for value in candidates)
        if len(tokens) >= 2
    ]
    if not wanted_sets:
        return None
    matches = []
    for row in rows:
        row_tokens: set[str] = set()
        for attribute in attributes:
            row_tokens |= _token_set(str(getattr(row, attribute, "") or ""))
        if any(tokens.issubset(row_tokens) for tokens in wanted_sets):
            matches.append(row)
            if len(matches) > 1:
                return None
    return matches[0] if matches else None


async def get_view_by_reference(
    db, asset_type: str, reference: str
) -> AssetView | None:
    """Resolve a legacy ``{category}/{filename}`` download reference.

    Slugs are tried first, then the exact ``file_name`` /
    ``package_file_name`` column on the underlying catalog. This preserves
    seeded assets whose published filename differs from their slug.
    """
    kind = normalize_asset_type(asset_type)
    candidates = _reference_candidates(kind, reference)
    for candidate in candidates:
        view = await get_view(db, kind, candidate, allow_deprecated=True)
        if view is not None:
            return view

    await ensure_seeded(db)
    file_values = [value.lower() for value in {reference, *candidates} if value]
    if kind == "package":
        from app.models.hub import SentinelPackage

        row = (
            await db.execute(
                select(SentinelPackage).where(
                    func.lower(SentinelPackage.package_file_name).in_(file_values)
                )
            )
        ).scalar_one_or_none()
        if row is None:
            rows = (await db.execute(select(SentinelPackage))).scalars().all()
            row = _fuzzy_match_row(rows, candidates, ("slug", "package_file_name", "name"))
        return await get_view(db, kind, row.slug, allow_deprecated=True) if row else None

    if kind in _LIBRARY_DIRS:
        from app.models.hub import HubDataset, HubPcap, HubScenario

        model = {"pcap": HubPcap, "dataset": HubDataset, "scenario": HubScenario}[kind]
        row = (
            await db.execute(
                select(model).where(func.lower(model.file_name).in_(file_values))
            )
        ).scalar_one_or_none()
        if row is None:
            rows = (await db.execute(select(model))).scalars().all()
            row = _fuzzy_match_row(rows, candidates, ("slug", "file_name", "title"))
        return await get_view(db, kind, row.slug, allow_deprecated=True) if row else None

    from app.models.modelvault import AIModel, AIModelArtifact, AIModelVersion

    artifact = (
        await db.execute(
            select(AIModelArtifact).where(
                func.lower(AIModelArtifact.file_name).in_(file_values)
            )
        )
    ).scalar_one_or_none()
    if artifact is None:
        artifacts = (await db.execute(select(AIModelArtifact))).scalars().all()
        artifact = _fuzzy_match_row(artifacts, candidates, ("file_name",))
    if artifact is None:
        return None
    version = await db.get(AIModelVersion, artifact.version_id)
    model_row = await db.get(AIModel, version.model_id) if version is not None else None
    if model_row is None:
        return None
    return await get_view(db, "model", model_row.slug, allow_deprecated=True)



async def visible_key_set(db, user, scope: str = "all") -> set[tuple[str, str]]:
    """Return the ``(asset_type, slug)`` keys visible to ``user`` in ``scope``."""
    views = await all_views(db)
    share_map = await access.share_map_for_user(db, user)
    return {
        (view.asset_type, view.slug)
        for view in access.scope_views(views, user, scope, share_map)
    }


async def all_views(db) -> list[AssetView]:
    await ensure_seeded(db)
    metas = await _meta_map(db)
    views: list[AssetView] = []

    from app.models.hub import HubDataset, HubPcap, HubScenario, SentinelPackage
    from app.models.modelvault import AIModel

    packages = (await db.execute(select(SentinelPackage))).scalars().all()
    for row in packages:
        meta = metas.get(("package", row.slug))
        if meta and meta.yanked:
            continue
        views.append(_package_view(row, meta))

    pcaps = (await db.execute(select(HubPcap))).scalars().all()
    for row in pcaps:
        meta = metas.get(("pcap", row.slug))
        if meta and meta.yanked:
            continue
        views.append(_pcap_view(row, meta))

    datasets = (await db.execute(select(HubDataset))).scalars().all()
    for row in datasets:
        meta = metas.get(("dataset", row.slug))
        if meta and meta.yanked:
            continue
        views.append(_dataset_view(row, meta))

    scenarios = (await db.execute(select(HubScenario))).scalars().all()
    for row in scenarios:
        meta = metas.get(("scenario", row.slug))
        if meta and meta.yanked:
            continue
        views.append(_scenario_view(row, meta))

    models = (await db.execute(select(AIModel))).scalars().all()
    for model in models:
        meta = metas.get(("model", model.slug))
        if meta and meta.yanked:
            continue
        view = await _model_view(db, model, meta)
        if view is not None:
            views.append(view)

    from app.models.hub_appliances import HubApplianceRelease
    from app.models.hub_blueprints import HubBlueprint

    blueprints = (await db.execute(select(HubBlueprint))).scalars().all()
    for row in blueprints:
        meta = metas.get((_BLUEPRINT_TYPE, row.slug))
        if row.is_yanked or (meta and meta.yanked):
            continue
        views.append(_blueprint_view(row, meta))

    appliances = (await db.execute(select(HubApplianceRelease))).scalars().all()
    for row in appliances:
        meta = metas.get((_APPLIANCE_TYPE, row.slug))
        if not row.is_active or (meta and meta.yanked):
            continue
        views.append(_appliance_view(row, meta))

    return views


# ---------------------------------------------------------------------------
# search / filter / pagination
# ---------------------------------------------------------------------------
def filter_views(
    views: list[AssetView],
    *,
    query: str = "",
    asset_type: str = "all",
    industry: str | None = None,
) -> list[AssetView]:
    kind = None
    if asset_type and asset_type.strip().lower() not in ("", "all"):
        kind = normalize_asset_type(asset_type)
    needle = (query or "").strip().lower()
    tokens = re.findall(r"[a-z0-9_]+", needle)
    industry_needle = (industry or "").strip().lower()

    matches: list[AssetView] = []
    for view in views:
        if kind is not None and view.asset_type != kind:
            continue
        haystack = " ".join(
            [
                view.slug,
                view.name,
                view.description,
                view.author,
                view.target_protocol,
                view.industry,
                view.version,
                view.tier,
                " ".join(view.compliance),
                " ".join(str(v) for v in view.manifest.values()),
            ]
        ).lower()
        if industry_needle and industry_needle not in haystack:
            continue
        if tokens:
            words = set(re.findall(r"[a-z0-9_]+", haystack))
            matched = True
            for token in tokens:
                if token in haystack:
                    continue
                if difflib.get_close_matches(token, words, n=1, cutoff=0.78):
                    continue
                matched = False
                break
            if not matched:
                continue
        matches.append(view)
    return matches


def sort_views(views: list[AssetView], sort: str) -> list[AssetView]:
    key = (sort or "downloads").strip().lower()
    if key == "downloads":
        return sorted(views, key=lambda v: (-v.downloads, v.name.lower()))
    if key == "latest":
        return sorted(views, key=lambda v: (-_timestamp(v.published_at), v.name.lower()))
    if key == "name":
        return sorted(views, key=lambda v: v.name.lower())
    if key == "sla":
        return sorted(
            views,
            key=lambda v: (
                v.latency_sla_ns <= 0,
                v.latency_sla_ns if v.latency_sla_ns > 0 else 10**18,
                v.name.lower(),
            ),
        )
    raise ValueError(f"Unknown sort '{sort}'. Use one of: downloads, latest, name, sla.")


def paginate(views: list[AssetView], page: int, limit: int) -> dict:
    total = len(views)
    total_pages = max((total + limit - 1) // limit, 1)
    page = max(min(page, total_pages), 1)
    start = (page - 1) * limit
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "results": [v.list_item() for v in views[start : start + limit]],
    }


async def categories(db, views: list[AssetView] | None = None) -> dict:
    views = await all_views(db) if views is None else views
    asset_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    industry_counts: dict[str, int] = {}
    compliance_counts: dict[str, int] = {}
    protocol_counts: dict[str, int] = {}

    for view in views:
        asset_counts[view.asset_type] = asset_counts.get(view.asset_type, 0) + 1
        if view.industry:
            industry_counts[view.industry] = industry_counts.get(view.industry, 0) + 1
        for tag in view.compliance:
            compliance_counts[tag] = compliance_counts.get(tag, 0) + 1
        if view.target_protocol:
            protocol_counts[view.target_protocol] = protocol_counts.get(view.target_protocol, 0) + 1
        category = view.manifest.get("category") if isinstance(view.manifest, dict) else None
        if category:
            category_counts[str(category)] = category_counts.get(str(category), 0) + 1

    return {
        "total": len(views),
        "asset_types": [
            {"asset_type": kind, "count": asset_counts.get(kind, 0)} for kind in ASSET_TYPES
        ],
        "categories": [
            {"name": name, "count": count}
            for name, count in sorted(category_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
        "industries": [
            {"name": name, "count": count}
            for name, count in sorted(industry_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
        "compliance": [
            {"name": name, "count": count}
            for name, count in sorted(compliance_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
        "target_protocols": [
            {"name": name, "count": count}
            for name, count in sorted(protocol_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
    }


# ---------------------------------------------------------------------------
# signatures / artifacts
# ---------------------------------------------------------------------------
async def _artifact_blob(db, view: AssetView) -> tuple[bytes | None, Path | None, str]:
    """Return ``(blob, path, sha256)`` for an asset.

    Package downloads are materialised in memory (legacy behavior); the
    library and model vault paths are streamed from disk.
    """
    if view.asset_type == "package":
        from app.services import sentinel_packages as spkg

        blob, digest = await spkg.resolve_artifact_bytes(db, view.source)
        return blob, None, digest
    if view.asset_type in _LIBRARY_DIRS:
        from app.services import hub_library as lib

        kind = _LIBRARY_DIRS[view.asset_type]
        path, digest = await lib.resolve_artifact(db, kind, view.source)
        return None, path, digest
    if view.asset_type == _BLUEPRINT_TYPE:
        from app.services import hub_marketplace as marketplace

        path = marketplace.artifact_path(
            marketplace.blueprint_root(), view.source.file_path
        )
        if not path.is_file():
            raise FileNotFoundError("Artifact file missing from the blueprint vault")
        return None, path, view.source.sha256
    if view.asset_type == _APPLIANCE_TYPE:
        from app.services import hub_marketplace as marketplace

        path = marketplace.artifact_path(
            marketplace.appliance_root(), view.source.file_path
        )
        if not path.is_file():
            raise FileNotFoundError("Artifact file missing from the appliance vault")
        return None, path, view.source.sha256_checksum
    path = view.artifact_path
    if path is None or not path.is_file():
        raise FileNotFoundError("Artifact file missing from the model vault")
    return None, path, view.sha256


async def ensure_asset_signature(db, view: AssetView) -> HubAssetMeta:
    """Return publication metadata, signing seeded stand-ins on first use."""
    if view.meta is not None and view.meta.signature:
        return view.meta

    blob, path, digest = await _artifact_blob(db, view)
    payload = blob if blob is not None else path.read_bytes()
    signature = _seed_signature(payload)
    meta = view.meta
    if meta is None:
        meta = HubAssetMeta(
            asset_type=view.asset_type,
            slug=view.slug,
            owner_user_id=None,
            visibility="public",
        )
        db.add(meta)
    meta.signature = signature
    meta.public_key = seed_public_key_hex()
    meta.sha256 = digest
    meta.file_name = view.file_name
    meta.version = view.version
    meta.tier = view.tier
    meta.author = view.author
    meta.industry = view.industry
    meta.compliance = list(view.compliance)
    meta.manifest = dict(view.manifest or {})
    meta.readme_markdown = view.readme_markdown
    meta.yanked = False
    await db.flush()

    view.meta = meta
    view.author_public_key = meta.public_key
    view.sha256 = digest
    view.verified_signature = True
    return meta


async def record_publish(
    db,
    *,
    asset_type: str,
    slug: str,
    signature: str,
    public_key: str,
    author: str,
    owner_user_id: str,
    version: str,
    tier: str,
    industry: str,
    compliance: list,
    manifest: dict,
    readme_markdown: str,
    file_name: str,
    sha256: str,
    tenant_id: str | None = None,
    visibility: str = "private",
) -> HubAssetMeta:
    """Persist author signature / ownership for a freshly published asset."""
    kind = normalize_asset_type(asset_type)
    visibility = (visibility or "private").strip().lower()
    if visibility not in ("public", "private"):
        raise ValueError("visibility must be 'public' or 'private'")
    try:
        public_key = hub.decode_key_material(public_key, 32, "public key").hex()
    except ValueError:
        pass
    meta = (
        await db.execute(
            select(HubAssetMeta).where(
                HubAssetMeta.asset_type == kind, HubAssetMeta.slug == slug
            )
        )
    ).scalar_one_or_none()
    if meta is None:
        meta = HubAssetMeta(asset_type=kind, slug=slug)
        db.add(meta)
    meta.signature = signature
    meta.public_key = public_key
    meta.sha256 = sha256
    meta.file_name = file_name
    meta.version = version
    meta.tier = tier
    meta.author = author
    meta.industry = industry
    meta.compliance = list(compliance or [])
    meta.manifest = dict(manifest or {})
    meta.readme_markdown = readme_markdown
    meta.owner_user_id = owner_user_id
    meta.tenant_id = tenant_id
    meta.visibility = visibility
    meta.yanked = False
    meta.orphaned_root = False
    meta.deleted_at = None
    await db.flush()
    return meta


async def signature_bytes(db, view: AssetView) -> tuple[bytes, str]:
    meta = await ensure_asset_signature(db, view)
    try:
        raw = hub.decode_key_material(meta.signature, 64, "signature")
    except ValueError:
        raw = b""
    return raw, meta.public_key


async def resolve_download(db, view: AssetView) -> tuple[bytes | None, Path | None, str, HubAssetMeta]:
    meta = await ensure_asset_signature(db, view)
    blob, path, digest = await _artifact_blob(db, view)
    if view.asset_type == "package":
        meta.download_count = int(meta.download_count or 0) + 1
    elif view.asset_type in _LIBRARY_DIRS:
        view.source.download_count = int(view.source.download_count or 0) + 1
    elif view.asset_type == _BLUEPRINT_TYPE:
        view.source.downloads = int(view.source.downloads or 0) + 1
    elif view.asset_type == _APPLIANCE_TYPE:
        view.source.download_count = int(view.source.download_count or 0) + 1
    elif view.artifact is not None:
        view.artifact.download_count = int(view.artifact.download_count or 0) + 1
    await db.flush()
    return blob, path, digest, meta


# ---------------------------------------------------------------------------
# revocation
# ---------------------------------------------------------------------------
def _safe_unlink(path: Path, root: Path) -> None:
    try:
        resolved = path.resolve()
        root_resolved = root.resolve()
        if resolved.is_relative_to(root_resolved) and resolved.is_file():
            resolved.unlink(missing_ok=True)
    except OSError:
        pass


async def _remove_user_asset(db, view: AssetView) -> None:
    """Physically remove a developer-published asset (non-seed row)."""
    kind = view.asset_type
    if view.meta is not None:
        await db.delete(view.meta)
        await db.flush()

    if kind == "package":
        from app.services import sentinel_packages as spkg

        row = view.source
        root = spkg.package_dir()
        path = spkg.artifact_file(row) or root / row.slug / row.package_file_name
        await db.delete(row)
        await db.flush()
        _safe_unlink(path, root)
        return

    if kind in _LIBRARY_DIRS:
        from app.services import hub_library as lib

        row = view.source
        root = lib.vault_root(_LIBRARY_DIRS[kind])
        path = root / row.artifact_path if row.artifact_path else root / row.slug / row.file_name
        await db.delete(row)
        await db.flush()
        _safe_unlink(path, root)
        return

    if kind == _BLUEPRINT_TYPE:
        from app.services import hub_marketplace as marketplace

        row = view.source
        root = marketplace.blueprint_root()
        path = marketplace.artifact_path(root, row.file_path)
        await db.delete(row)
        await db.flush()
        _safe_unlink(path, root)
        try:
            path.parent.rmdir()
        except OSError:
            pass
        return

    if kind == _APPLIANCE_TYPE:
        from app.services import hub_marketplace as marketplace

        row = view.source
        root = marketplace.appliance_root()
        path = marketplace.artifact_path(root, row.file_path)
        await db.delete(row)
        await db.flush()
        _safe_unlink(path, root)
        try:
            path.parent.rmdir()
        except OSError:
            pass
        return

    from app.models.modelvault import AIModelArtifact, AIModelVersion
    from app.services import model_vault as vault

    rows = list(
        (await db.execute(select(AIModelVersion).where(AIModelVersion.model_id == view.source.id)))
        .scalars()
        .all()
    )
    files: list[Path] = []
    for version in rows:
        artifacts = (
            await db.execute(
                select(AIModelArtifact).where(AIModelArtifact.version_id == version.id)
            )
        ).scalars().all()
        files.extend(vault.vault_root() / artifact.s3_storage_key for artifact in artifacts)
    await db.delete(view.source)
    await db.flush()
    root = vault.vault_root()
    for path in files:
        _safe_unlink(path, root)
    model_dir = root / "models" / view.slug
    try:
        if model_dir.resolve().is_relative_to(root.resolve()):
            shutil.rmtree(model_dir, ignore_errors=True)
    except OSError:
        pass


async def _ensure_meta_for_asset(db, view: AssetView) -> HubAssetMeta:
    """Return metadata for a view, creating a public legacy row if needed."""
    if view.meta is not None:
        return view.meta
    derived_owner = getattr(view.source, "owner_user_id", None)
    if not derived_owner and view.asset_type == _APPLIANCE_TYPE:
        derived_owner = getattr(view.source, "published_by", None)
    meta = HubAssetMeta(
        asset_type=view.asset_type,
        slug=view.slug,
        signature="",
        public_key="",
        sha256=view.sha256,
        file_name=view.file_name,
        version=view.version,
        tier=view.tier,
        author=view.author,
        industry=view.industry,
        compliance=list(view.compliance),
        manifest=dict(view.manifest or {}),
        readme_markdown=view.readme_markdown,
        owner_user_id=derived_owner,
        tenant_id=None,
        visibility="public",
    )
    db.add(meta)
    await db.flush()
    view.meta = meta
    return meta


async def fork_children(db, view: AssetView) -> list[HubAssetMeta]:
    return list(
        (
            await db.execute(
                select(HubAssetMeta).where(
                    HubAssetMeta.forked_from_type == view.asset_type,
                    HubAssetMeta.forked_from_slug == view.slug,
                    HubAssetMeta.yanked.is_(False),
                )
            )
        )
        .scalars()
        .all()
    )


async def revoke_asset(db, view: AssetView) -> str:
    """Delete an asset or preserve it as an orphaned root when forks exist.

    Returns ``"revoked"`` for a full delete/yank and ``"orphaned_root"`` when
    descendants still reference the bytes.  User-owned assets are physically
    removed; seeded/authority assets are soft-yanked so the lazy seeders do
    not resurrect them.
    """
    meta = await _ensure_meta_for_asset(db, view)
    children = await fork_children(db, view)
    if children or int(meta.fork_count or 0) > 0:
        meta.orphaned_root = True
        meta.yanked = True
        meta.deleted_at = datetime.now(timezone.utc)
        await db.flush()
        return "orphaned_root"

    if meta.owner_user_id:
        parent = None
        if meta.forked_from_type and meta.forked_from_slug:
            parent = (
                await db.execute(
                    select(HubAssetMeta).where(
                        HubAssetMeta.asset_type == meta.forked_from_type,
                        HubAssetMeta.slug == meta.forked_from_slug,
                    )
                )
            ).scalar_one_or_none()
        await _remove_user_asset(db, view)
        if parent is not None:
            parent.fork_count = max(int(parent.fork_count or 0) - 1, 0)
        await db.flush()
        return "revoked"

    meta.yanked = True
    meta.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return "revoked"
