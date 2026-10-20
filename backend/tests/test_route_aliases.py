"""Trailing-slash alias routes (``include_in_schema=False``) parity tests.

Every collection router registers both ``""`` and ``"/"`` variants (e.g.
``GET /api/v1/plans`` and ``GET /api/v1/plans/``). The slash variants are
real routes — not 307 redirects — so keep them reachable and returning the
same payloads as their canonical twins.
"""

import json
import shutil
from pathlib import Path

import pytest

from app.config import settings
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio
TENANT_HDR = "X-Tenant-ID"


def _normalize(value):
    """Make list ordering irrelevant: alias parity is about payload content.

    Both calls run the same handler; row order can differ between them on
    MySQL when the ORDER BY key ties, so sort nested lists canonically.
    """
    if isinstance(value, list):
        return sorted((_normalize(v) for v in value), key=lambda v: json.dumps(v, sort_keys=True))
    if isinstance(value, dict):
        return {k: _normalize(v) for k, v in value.items()}
    return value


@needs_db
async def test_get_alias_routes_match_canonical(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)
    h = auth_headers(token)

    cases = [
        ("/api/v1/plugins", None),                          # public catalog
        ("/api/v1/hub/packages", None),                     # public package list
        ("/api/v1/hub/pcaps", None),                        # public PCAP vault
        ("/api/v1/hub/datasets", None),                     # public SLAB datasets
        ("/api/v1/hub/scenarios", None),                    # public twin scenarios
        ("/api/v1/model-vault", None),                      # public model vault
        ("/api/v1/plans", None),                            # public pricing matrix
        ("/api/v1/licenses", h),                            # tenant licenses
        ("/api/v1/blueprints", h),                          # visual threat blueprints
        ("/api/v1/models", {**h, TENANT_HDR: tenant_id}),   # needs tenant header
    ]
    for path, headers in cases:
        # The first call may auto-seed; reloaded rows are stable across
        # engines (MySQL truncates seeded datetime microseconds on reload,
        # the source session serves them in-memory).
        warmup = await ac.get(path, headers=headers)
        assert warmup.status_code == 200, (path, warmup.text)
        canonical = await ac.get(path, headers=headers)
        alias = await ac.get(path + "/", headers=headers)
        assert canonical.status_code == 200, (path, canonical.text)
        assert alias.status_code == 200, (path + "/", alias.text)
        assert _normalize(alias.json()) == _normalize(canonical.json()), path


@needs_db
async def test_hub_publish_alias(client):
    from tests.test_hub_publish import _ed25519_keypair, _mint_token

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="alias-dev@example.com")
    token = await _mint_token(factory, user_id)
    priv, pub = _ed25519_keypair()

    blob = b"PCAP1:alias\n" + b"\x00" * 64
    sig = priv.sign(blob).hex()
    manifest = {
        "slug": "alias-pcap",
        "title": "Alias Capture",
        "category": "MALWARE_C2",
        "target_protocol": "DNS",
        "author_public_key": pub,
    }
    files = {"file": ("alias.pcap", blob, "application/octet-stream")}
    data = {"asset_type": "pcap", "manifest": json.dumps(manifest), "signature": sig}

    # Publish writes the blob under <HUB_PACKAGE_DIR>/pcaps/<slug>/ on the
    # real filesystem — remove exactly what this test creates.
    artifacts = Path(settings.HUB_PACKAGE_DIR) / "pcaps" / "alias-pcap"
    try:
        r = await ac.post(
            "/api/v1/hub/publish/",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            data=data,
        )
        assert r.status_code == 201, r.text
        assert r.json()["asset_id"] == "pcap-alias-pcap"

        # unauthenticated alias is still gated like the canonical route
        r = await ac.post(
            "/api/v1/hub/publish/",
            headers={"Authorization": "Bearer bogus"},
            files=files,
            data=data,
        )
        assert r.status_code == 401
    finally:
        shutil.rmtree(artifacts, ignore_errors=True)
