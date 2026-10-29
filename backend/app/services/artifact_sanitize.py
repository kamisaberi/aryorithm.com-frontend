"""Public-visibility safety checks for PCAPs and blueprints.

The checks are deliberately conservative: a capture or blueprint that still
contains obvious credential material, private-key blocks, or a malformed wire
format cannot be promoted to public visibility.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from app.services import hub_assets as assets

_SECRET_PATTERNS = (
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", re.I),
    re.compile(rb"\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+/=-]{20,}", re.I),
    re.compile(rb"\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[=:]\s*[^\s\"']{6,}", re.I),
    re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
)
class SanitizationError(ValueError):
    def __init__(self, issues: list[str]):
        self.issues = issues
        super().__init__("; ".join(issues))


def _scan_bytes(blob: bytes, label: str) -> list[str]:
    issues = []
    for pattern in _SECRET_PATTERNS:
        match = pattern.search(blob)
        if match:
            issues.append(f"{label} contains credential-like material: {match.group(0)[:40]!r}")
    return issues


def _scan_text(text: str, label: str) -> list[str]:
    return _scan_bytes((text or "").encode("utf-8", errors="replace"), label)


async def validate_public_artifact(db, view) -> None:
    """Raise :class:`SanitizationError` when public promotion is unsafe."""
    issues: list[str] = []
    blob, path, _digest = await assets._artifact_blob(db, view)

    if view.asset_type == "pcap":
        data = blob if blob is not None else path.read_bytes()[: 8 * 1024 * 1024]
        issues.extend(_scan_bytes(data[: 8 * 1024 * 1024], "PCAP"))

    elif view.asset_type == "blueprint":
        raw_dag = (getattr(view.source, "raw_dag_yaml", "") or "").strip()
        if raw_dag:
            try:
                parsed = yaml.safe_load(raw_dag)
            except yaml.YAMLError as exc:
                issues.append(f"blueprint raw DAG is not valid YAML: {exc}")
                parsed = None
            if parsed is not None:
                issues.extend(_scan_text(raw_dag, "blueprint raw DAG"))
        data = blob if blob is not None else path.read_bytes()[: 8 * 1024 * 1024]
        issues.extend(_scan_bytes(data[: 8 * 1024 * 1024], "blueprint bundle"))
        # A bundle is usually an archive; scan its embedded text members.
        try:
            import tarfile
            import zipfile

            if zipfile.is_zipfile(path):
                with zipfile.ZipFile(path) as archive:
                    for info in archive.infolist():
                        if info.is_dir() or info.file_size > 2 * 1024 * 1024:
                            continue
                        issues.extend(
                            _scan_bytes(
                                archive.read(info)[: 2 * 1024 * 1024],
                                f"blueprint::{info.filename}",
                            )
                        )
            elif tarfile.is_tarfile(path):
                with tarfile.open(path, mode="r:*") as archive:
                    for member in archive.getmembers():
                        if not member.isfile() or member.size > 2 * 1024 * 1024:
                            continue
                        handle = archive.extractfile(member)
                        if handle is not None:
                            issues.extend(
                                _scan_bytes(
                                    handle.read(2 * 1024 * 1024),
                                    f"blueprint::{member.name}",
                                )
                            )
        except (OSError, ValueError, RuntimeError):
            pass

    issues.extend(_scan_text(view.readme_markdown or "", "readme"))
    issues.extend(_scan_text(str(view.manifest or {}), "manifest"))

    # De-duplicate while preserving order.
    deduped = list(dict.fromkeys(issues))
    if deduped:
        raise SanitizationError(deduped)
