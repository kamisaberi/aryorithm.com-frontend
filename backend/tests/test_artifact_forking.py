"""Forking, lineage and orphaned-root preservation for unified artifacts."""

import hashlib
import json

import pytest
from cryptography.hazmat.primitives.asymmetric import ed25519

from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


def _keypair():
    private = ed25519.Ed25519PrivateKey.generate()
    return private, private.public_key().public_bytes_raw().hex()


async def _publish_public_package(ac, token, slug: str):
    private, public = _keypair()
    blob = b"SPKG1:fork-source\n" + b"\x00" * 64
    manifest = {
        "slug": slug,
        "name": "Fork Source",
        "tier": "lua",
        "version": "1.0.0",
        "sector": "Water",
        "short_description": "public source",
        "technical_details": "source",
        "author_public_key": public,
    }
    r = await ac.post(
        "/api/v1/hub/publish",
        headers=auth_headers(token),
        files={"file": (f"{slug}.spkg", blob, "application/octet-stream")},
        data={
            "asset_type": "package",
            "manifest": json.dumps(manifest),
            "signature": private.sign(blob).hex(),
            "visibility": "public",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


@needs_db
async def test_fork_is_private_and_parent_delete_preserves_children(
    client, tmp_path, monkeypatch
):
    from app.config import settings

    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))
    ac, factory = client
    owner_token, _owner_id, _owner_tenant = await make_user(
        factory, email="fork-owner@example.com"
    )
    forker_token, forker_id, forker_tenant = await make_user(
        factory, email="fork-user@example.com"
    )
    await _publish_public_package(ac, owner_token, "fork-source")

    r = await ac.post(
        "/api/v1/hub/assets/package/fork-source/fork",
        headers=auth_headers(forker_token),
        json={},
    )
    assert r.status_code == 201, r.text
    child = r.json()
    assert child["visibility"] == "private"
    assert child["owner_user_id"] == forker_id
    assert child["owner_tenant_id"] == forker_tenant
    assert child["forked_from"] == {
        "asset_type": "package",
        "slug": "fork-source",
    }

    # Other tenants cannot see the private fork, even though its parent is public.
    stranger_token, _stranger_id, _stranger_tenant = await make_user(
        factory, email="fork-stranger@example.com"
    )
    assert (
        await ac.get(
            f"/api/v1/hub/assets/package/{child['slug']}",
            headers=auth_headers(stranger_token),
        )
    ).status_code == 404

    r = await ac.get(
        f"/api/v1/hub/assets/package/{child['slug']}/lineage",
        headers=auth_headers(forker_token),
    )
    assert r.status_code == 200, r.text
    lineage = r.json()
    assert lineage["asset"]["slug"] == child["slug"]
    assert lineage["ancestors"][0]["slug"] == "fork-source"

    r = await ac.delete(
        "/api/v1/hub/assets/package/fork-source",
        headers=auth_headers(owner_token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "orphaned_root"
    assert r.json()["orphaned_root"] is True

    # The parent is hidden, but the child remains downloadable by its owner.
    assert (await ac.get("/api/v1/hub/assets/package/fork-source")).status_code == 404
    r = await ac.get(
        f"/api/v1/hub/assets/package/{child['slug']}/download",
        headers=auth_headers(forker_token),
    )
    assert r.status_code == 200, r.text
    assert hashlib.sha256(r.content).hexdigest()
