"""Visibility transitions and public-PCAP sanitization."""

import json

import pytest

from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


async def _upload_package(ac, token, slug: str):
    return await ac.post(
        "/api/v1/workspace/artifacts",
        headers=auth_headers(token),
        files={
            "file": (
                f"{slug}.spkg",
                b"SPKG1:visibility\n" + b"\x00" * 48,
                "application/octet-stream",
            )
        },
        data={
            "asset_type": "package",
            "manifest": json.dumps(
                {
                    "slug": slug,
                    "name": "Visibility Package",
                    "tier": "lua",
                    "sector": "Water",
                    "short_description": "private by default",
                    "technical_details": "body",
                }
            ),
            "visibility": "private",
        },
    )


@needs_db
async def test_visibility_transitions_and_public_sanitization(
    client, tmp_path, monkeypatch
):
    from app.config import settings

    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))
    ac, factory = client
    token, _user_id, _tenant_id = await make_user(
        factory, email="visibility-owner@example.com"
    )

    r = await _upload_package(ac, token, "visibility-pkg")
    assert r.status_code == 201, r.text
    assert (await ac.get("/api/v1/hub/assets/package/visibility-pkg")).status_code == 404

    r = await ac.put(
        "/api/v1/hub/assets/package/visibility-pkg/visibility",
        headers=auth_headers(token),
        json={"visibility": "public"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["visibility"] == "public"
    assert (await ac.get("/api/v1/hub/assets/package/visibility-pkg")).status_code == 200

    r = await ac.put(
        "/api/v1/hub/assets/package/visibility-pkg/visibility",
        headers=auth_headers(token),
        json={"visibility": "private"},
    )
    assert r.status_code == 200, r.text
    assert (await ac.get("/api/v1/hub/assets/package/visibility-pkg")).status_code == 404

    # A malformed capture is still private-usable, but cannot be promoted.
    r = await ac.post(
        "/api/v1/workspace/artifacts",
        headers=auth_headers(token),
        files={
            "file": (
                "unsafe.pcap",
                b"NOT-A-PCAP\npassword=supersecret\n" + b"\x00" * 64,
                "application/vnd.tcpdump.pcap",
            )
        },
        data={
            "asset_type": "pcap",
            "manifest": json.dumps(
                {
                    "slug": "unsafe-capture",
                    "title": "Unsafe Capture",
                    "category": "MALWARE_C2",
                    "target_protocol": "TCP",
                    "short_description": "not sanitized",
                }
            ),
            "visibility": "private",
        },
    )
    assert r.status_code == 201, r.text
    r = await ac.put(
        "/api/v1/hub/assets/pcap/unsafe-capture/visibility",
        headers=auth_headers(token),
        json={"visibility": "public"},
    )
    assert r.status_code == 422, r.text
    assert "issues" in r.json()["detail"]
