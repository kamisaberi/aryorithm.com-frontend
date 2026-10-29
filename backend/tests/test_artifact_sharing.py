"""Direct shares, received shares and expiring signed share links."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


async def _upload_private(ac, token, slug: str):
    return await ac.post(
        "/api/v1/workspace/artifacts",
        headers=auth_headers(token),
        files={
            "file": (
                f"{slug}.spkg",
                b"SPKG1:sharing\n" + b"\x00" * 48,
                "application/octet-stream",
            )
        },
        data={
            "asset_type": "package",
            "manifest": json.dumps(
                {
                    "slug": slug,
                    "name": "Shared Package",
                    "tier": "lua",
                    "sector": "Energy",
                    "short_description": "share me",
                    "technical_details": "body",
                }
            ),
            "visibility": "private",
        },
    )


@needs_db
async def test_direct_share_received_and_expiring_link(client, tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))
    ac, factory = client
    owner_token, _owner_id, _owner_tenant = await make_user(
        factory, email="share-owner@example.com"
    )
    grantee_token, grantee_id, _grantee_tenant = await make_user(
        factory, email="share-grantee@example.com"
    )

    r = await _upload_private(ac, owner_token, "shared-pkg")
    assert r.status_code == 201, r.text
    assert (
        await ac.get(
            "/api/v1/hub/assets/package/shared-pkg",
            headers=auth_headers(grantee_token),
        )
    ).status_code == 404

    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    r = await ac.post(
        "/api/v1/hub/assets/package/shared-pkg/shares",
        headers=auth_headers(owner_token),
        json={
            "grantee_type": "user",
            "grantee_id": grantee_id,
            "permission": "VIEW",
            "expires_at": expires,
        },
    )
    assert r.status_code == 201, r.text
    share_id = r.json()["id"]

    r = await ac.get(
        "/api/v1/hub/assets/package/shared-pkg",
        headers=auth_headers(grantee_token),
    )
    assert r.status_code == 200, r.text
    assert "VIEW" in r.json()["permissions"]

    r = await ac.get(
        "/api/v1/hub/shares/received", headers=auth_headers(grantee_token)
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1
    assert r.json()["results"][0]["slug"] == "shared-pkg"

    r = await ac.post(
        "/api/v1/hub/assets/package/shared-pkg/share-links",
        headers=auth_headers(owner_token),
        json={"permission": "VIEW", "expires_in_hours": 1, "max_uses": 1},
    )
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    assert token and "." in token

    r = await ac.get(f"/api/v1/hub/shares/links/{token}")
    assert r.status_code == 200, r.text
    assert r.json()["asset"]["slug"] == "shared-pkg"
    assert r.json()["asset"]["visibility"] == "private"

    r = await ac.get(
        "/api/v1/hub/assets/package/shared-pkg/download",
        params={"share_token": token},
    )
    assert r.status_code == 200, r.text

    # max_uses=1: the link is now exhausted.
    assert (await ac.get(f"/api/v1/hub/shares/links/{token}")).status_code == 404

    r = await ac.delete(
        f"/api/v1/hub/assets/package/shared-pkg/shares/{share_id}",
        headers=auth_headers(owner_token),
    )
    assert r.status_code == 200, r.text
    assert (
        await ac.get(
            "/api/v1/hub/assets/package/shared-pkg",
            headers=auth_headers(grantee_token),
        )
    ).status_code == 404
