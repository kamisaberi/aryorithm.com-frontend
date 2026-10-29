"""Copy-on-write artifact forking and lineage helpers.

A fork gets its own source row and slug, while bytes are hard-linked when the
filesystem supports it (falling back to a normal copy).  All seven artifact
types are supported by the same metadata lineage table.
"""

from __future__ import annotations

import os
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.models.hub_assets import HubAssetMeta
from app.services import hub_assets as assets
from app.services import hub_service as hub

_SLUG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_slug(value: str) -> str:
    slug = (value or "").strip()
    if not slug or len(slug) > 128 or not _SLUG_RE.fullmatch(slug):
        raise ValueError(
            "new_slug must contain only letters, numbers, dots, underscores and hyphens"
        )
    return slug


def _copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(source, destination)
        return
    except OSError:
        pass
    shutil.copy2(source, destination)


def _copy_tree(source: Path, destination: Path) -> None:
    if not source.exists():
        return
    for current, _dirs, files in os.walk(source):
        relative = Path(current).relative_to(source)
        target_dir = destination / relative
        target_dir.mkdir(parents=True, exist_ok=True)
        for name in files:
            _copy_file(Path(current) / name, target_dir / name)


async def _unique_slug(db, asset_type: str, requested: str, source_slug: str) -> str:
    from app.services.hub_assets import _fetch_source

    if requested:
        slug = _safe_slug(requested)
        if await _fetch_source(db, asset_type, slug) is not None:
            raise ValueError(f"An asset with slug '{slug}' already exists")
        return slug
    for _ in range(10):
        candidate = f"{source_slug}-fork-{uuid.uuid4().hex[:6]}"
        if await _fetch_source(db, asset_type, candidate) is None:
            return candidate
    raise ValueError("Could not allocate a unique fork slug")


async def _clone_package(db, source, slug: str):
    from app.models.hub import SentinelPackage
    from app.services import sentinel_packages as spkg

    file_name = source.package_file_name
    destination = spkg.package_dir() / slug / file_name
    source_path = spkg.artifact_file(source)
    if source_path is not None:
        _copy_file(source_path, destination)
    else:
        blob, _ = await spkg.resolve_artifact_bytes(db, source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(blob)
    row = SentinelPackage(
        id=f"fork.{slug}.{uuid.uuid4().hex[:8]}",
        slug=slug,
        name=source.name,
        version=source.version,
        tier=source.tier,
        tier_display=source.tier_display,
        language=source.language,
        author=source.author,
        verified=source.verified,
        sector=source.sector,
        target_protocol=source.target_protocol,
        default_port=source.default_port,
        latency_sla_ns=source.latency_sla_ns,
        latency_display=source.latency_display,
        mitigation_action=source.mitigation_action,
        compliance_tags=list(source.compliance_tags or []),
        short_description=source.short_description,
        technical_details=source.technical_details,
        package_file_name=file_name,
        package_file_size_bytes=source.package_file_size_bytes,
        signature_algorithm=source.signature_algorithm,
        install_command=source.install_command,
        artifact_path=str(destination.relative_to(spkg.package_dir())),
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(row)
    await db.flush()
    return row


async def _clone_library(db, asset_type: str, source, slug: str):
    from app.models.hub import HubDataset, HubPcap, HubScenario
    from app.services import hub_library as lib

    kind = assets._LIBRARY_DIRS[asset_type]
    source_path, _digest = await lib.resolve_artifact(db, kind, source)
    destination = lib.vault_root(kind) / slug / source.file_name
    _copy_file(source_path, destination)
    rel_path = str(destination.relative_to(lib.vault_root(kind)))
    common = dict(
        id=f"fork-{asset_type}-{slug}-{uuid.uuid4().hex[:8]}",
        slug=slug,
        file_name=source.file_name,
        file_size_bytes=source.file_size_bytes,
        sha256_checksum=source.sha256_checksum,
        short_description=source.short_description,
        download_count=0,
        artifact_path=rel_path,
        created_at=_now(),
    )
    if asset_type == "pcap":
        row = HubPcap(
            **common,
            title=source.title,
            category=source.category,
            target_protocol=source.target_protocol,
            attack_type=source.attack_type,
            source_origin=source.source_origin,
            packet_count=source.packet_count,
            duration_seconds=source.duration_seconds,
            mitre_attack_ids=list(source.mitre_attack_ids or []),
            recommended_spkg_id=source.recommended_spkg_id,
            technical_analysis=source.technical_analysis,
        )
    elif asset_type == "dataset":
        row = HubDataset(
            **common,
            name=source.name,
            format=source.format,
            tensor_dimension=source.tensor_dimension,
            total_records=source.total_records,
            normal_records_count=source.normal_records_count,
            anomalous_records_count=source.anomalous_records_count,
            normalization_method=source.normalization_method,
            source_benchmark=source.source_benchmark,
            doi_citation=source.doi_citation,
            paper_reference=source.paper_reference,
            streaming_throughput_eps=source.streaming_throughput_eps,
        )
    else:
        row = HubScenario(
            **common,
            name=source.name,
            complexity=source.complexity,
            target_sector=source.target_sector,
            network_subnet=source.network_subnet,
            node_topology=dict(source.node_topology or {}),
            replayed_attacks=list(source.replayed_attacks or []),
            expected_mitigation_sla=source.expected_mitigation_sla,
            cli_pull_command=source.cli_pull_command,
            technical_walkthrough=source.technical_walkthrough,
        )
    db.add(row)
    await db.flush()
    return row


async def _clone_model(db, source, slug: str):
    from app.models.modelvault import AIModel, AIModelArtifact, AIModelVersion
    from app.services import model_vault as vault

    new_id = f"fork-{slug}-{uuid.uuid4().hex[:8]}"
    model = AIModel(
        id=new_id,
        slug=slug,
        name=source.name,
        tier=source.tier,
        domain=source.domain,
        architecture=source.architecture,
        author=source.author,
        short_description=source.short_description,
        technical_description=source.technical_description,
        input_tensor_shape=source.input_tensor_shape,
        output_tensor_shape=source.output_tensor_shape,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(model)
    await db.flush()
    versions = list(
        (
            await db.execute(
                select(AIModelVersion).where(AIModelVersion.model_id == source.id)
            )
        )
        .scalars()
        .all()
    )
    for version in versions:
        new_version = AIModelVersion(
            id=str(uuid.uuid4()),
            model_id=new_id,
            version=version.version,
            rollout_stage=version.rollout_stage,
            golden_safety_verified=version.golden_safety_verified,
            golden_recall_score=version.golden_recall_score,
            base_accuracy=version.base_accuracy,
            p99_latency_ns=version.p99_latency_ns,
            training_dataset_summary=version.training_dataset_summary,
            release_notes=version.release_notes,
            last_gate_run_id=version.last_gate_run_id,
            tested_attacks_count=version.tested_attacks_count,
            false_positive_rate=version.false_positive_rate,
            created_at=_now(),
        )
        db.add(new_version)
        await db.flush()
        artifacts = list(
            (
                await db.execute(
                    select(AIModelArtifact).where(
                        AIModelArtifact.version_id == version.id
                    )
                )
            )
            .scalars()
            .all()
        )
        for artifact in artifacts:
            key = artifact.s3_storage_key
            prefix = f"models/{source.slug}/"
            if key.startswith(prefix):
                new_key = key.replace(prefix, f"models/{slug}/", 1)
            else:
                new_key = f"models/{slug}/{version.version}/{Path(key).name}"
            db.add(
                AIModelArtifact(
                    id=str(uuid.uuid4()),
                    version_id=new_version.id,
                    format=artifact.format,
                    precision=artifact.precision,
                    file_name=artifact.file_name,
                    file_size_bytes=artifact.file_size_bytes,
                    s3_storage_key=new_key,
                    sha256_checksum=artifact.sha256_checksum,
                    signature_ed25519=artifact.signature_ed25519,
                    target_hardware=artifact.target_hardware,
                    download_count=0,
                    created_at=_now(),
                )
            )
    await db.flush()
    source_dir = vault.vault_root() / "models" / source.slug
    _copy_tree(source_dir, vault.vault_root() / "models" / slug)
    return model


async def _clone_blueprint(db, source, slug: str):
    from app.models.hub_blueprints import HubBlueprint
    from app.services import hub_marketplace as marketplace

    root = marketplace.blueprint_root()
    source_path = marketplace.artifact_path(root, source.file_path)
    destination = root / slug / source.file_name
    _copy_file(source_path, destination)
    row = HubBlueprint(
        id=str(uuid.uuid4()),
        slug=slug,
        name=source.name,
        version=source.version,
        target_site=source.target_site,
        industry=source.industry,
        target_architecture=source.target_architecture,
        description=source.description,
        primary_interface=source.primary_interface,
        max_pipeline_latency_us=source.max_pipeline_latency_us,
        dependencies_json=dict(source.dependencies_json or {}),
        hardware_binding_json=dict(source.hardware_binding_json or {}),
        sla_guarantees_json=dict(source.sla_guarantees_json or {}),
        raw_dag_yaml=source.raw_dag_yaml,
        sha256=source.sha256,
        author=source.author,
        author_public_key=source.author_public_key,
        signature=source.signature,
        owner_user_id=None,
        file_name=source.file_name,
        file_path=str(destination.relative_to(root)),
        file_size_bytes=source.file_size_bytes,
        downloads=0,
        verified_signature=source.verified_signature,
        is_yanked=False,
        created_at=_now(),
    )
    db.add(row)
    await db.flush()
    return row


async def _clone_appliance(db, source, slug: str):
    from app.models.hub_appliances import HubApplianceRelease
    from app.services import hub_marketplace as marketplace

    root = marketplace.appliance_root()
    source_path = marketplace.artifact_path(root, source.file_path)
    destination = root / slug / source.file_name
    _copy_file(source_path, destination)
    row = HubApplianceRelease(
        id=str(uuid.uuid4()),
        slug=slug,
        title=source.title,
        version=source.version,
        architecture=source.architecture,
        industry=source.industry,
        license_tier=source.license_tier,
        file_name=source.file_name,
        file_path=str(destination.relative_to(root)),
        file_size_bytes=source.file_size_bytes,
        sha256_checksum=source.sha256_checksum,
        authority_signature=source.authority_signature,
        verified_health_checks=source.verified_health_checks,
        download_count=0,
        is_active=True,
        published_by=None,
        created_at=_now(),
    )
    db.add(row)
    await db.flush()
    return row


async def fork_asset(db, source, *, user, new_slug: str | None = None):
    """Fork ``source`` into the caller's private workspace and return the view."""
    slug = await _unique_slug(db, source.asset_type, new_slug or "", source.slug)
    source_meta = await assets._ensure_meta_for_asset(db, source)

    if source.asset_type == "package":
        row = await _clone_package(db, source.source, slug)
    elif source.asset_type in assets._LIBRARY_DIRS:
        row = await _clone_library(db, source.asset_type, source.source, slug)
    elif source.asset_type == "model":
        row = await _clone_model(db, source.source, slug)
    elif source.asset_type == "blueprint":
        row = await _clone_blueprint(db, source.source, slug)
    elif source.asset_type == "appliance":
        row = await _clone_appliance(db, source.source, slug)
    else:
        raise ValueError(f"Forking is not supported for {source.asset_type}")

    if source.asset_type == "blueprint":
        row.owner_user_id = user.id
    if source.asset_type == "appliance":
        row.published_by = user.id

    manifest = dict(source_meta.manifest or source.manifest or {})
    manifest["slug"] = slug
    manifest["forked_from"] = {
        "asset_type": source.asset_type,
        "slug": source.slug,
    }
    meta = HubAssetMeta(
        id=str(uuid.uuid4()),
        asset_type=source.asset_type,
        slug=slug,
        signature=source_meta.signature or "",
        public_key=source_meta.public_key or source.author_public_key,
        sha256=source_meta.sha256 or source.sha256,
        file_name=source_meta.file_name or source.file_name,
        version=source_meta.version or source.version,
        tier=source_meta.tier or source.tier,
        author=source_meta.author or source.author,
        industry=source_meta.industry or source.industry,
        compliance=list(source_meta.compliance or source.compliance or []),
        manifest=manifest,
        readme_markdown=source_meta.readme_markdown or source.readme_markdown,
        download_count=0,
        owner_user_id=user.id,
        tenant_id=user.tenant_id,
        visibility="private",
        forked_from_type=source.asset_type,
        forked_from_slug=source.slug,
        fork_count=0,
        orphaned_root=False,
        yanked=False,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(meta)
    source_meta.fork_count = int(source_meta.fork_count or 0) + 1
    await db.flush()
    return await assets.get_view(db, source.asset_type, slug)


def _meta_ref(meta: HubAssetMeta) -> dict:
    return {
        "asset_type": meta.asset_type,
        "slug": meta.slug,
        "name": (meta.manifest or {}).get("name") or meta.slug,
        "version": meta.version,
        "visibility": meta.visibility,
        "owner_user_id": meta.owner_user_id,
        "owner_tenant_id": meta.tenant_id,
        "forked_from": (
            {
                "asset_type": meta.forked_from_type,
                "slug": meta.forked_from_slug,
            }
            if meta.forked_from_type and meta.forked_from_slug
            else None
        ),
        "fork_count": int(meta.fork_count or 0),
        "created_at": hub.to_zulu(meta.created_at),
    }


async def lineage(db, view) -> dict:
    meta = await assets._ensure_meta_for_asset(db, view)
    ancestors: list[dict] = []
    seen: set[tuple[str, str]] = set()
    current = meta
    while current.forked_from_type and current.forked_from_slug:
        key = (current.forked_from_type, current.forked_from_slug)
        if key in seen:
            break
        seen.add(key)
        parent = (
            await db.execute(
                select(HubAssetMeta).where(
                    HubAssetMeta.asset_type == key[0], HubAssetMeta.slug == key[1]
                )
            )
        ).scalar_one_or_none()
        if parent is None:
            ancestors.append({"asset_type": key[0], "slug": key[1]})
            break
        ancestors.append(_meta_ref(parent))
        current = parent
    descendants = await list_fork_meta(db, view)
    return {
        "asset": _meta_ref(meta),
        "ancestors": list(reversed(ancestors)),
        "children": [_meta_ref(row) for row in descendants],
    }


async def list_fork_meta(db, view) -> list[HubAssetMeta]:
    return list(
        (
            await db.execute(
                select(HubAssetMeta)
                .where(
                    HubAssetMeta.forked_from_type == view.asset_type,
                    HubAssetMeta.forked_from_slug == view.slug,
                    HubAssetMeta.yanked.is_(False),
                )
                .order_by(HubAssetMeta.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def list_forks(db, view) -> list:
    rows = await list_fork_meta(db, view)
    result = []
    for meta in rows:
        child = await assets.get_view(db, meta.asset_type, meta.slug)
        if child is not None:
            result.append(child)
    return result
