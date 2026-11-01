"""Member-facing upload/list API: session auth, no developer token required."""

import json

import pytest

from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


def _manifest(slug: str) -> dict:
    return {
        "slug": slug,
        "name": "Member Package",
        "tier": "lua",
        "version": "1.0.0",
        "sector": "Water",
        "short_description": "uploaded from the member workspace",
        "technical_details": "session-authenticated upload",
    }


@needs_db
async def test_member_upload_accepts_sso_cookie_and_owned_scope(
    client, tmp_path, monkeypatch
):
    from app.config import settings

    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))
    ac, factory = client
    _token, _user_id, _tenant_id = await make_user(
        factory, email="member-upload@example.com"
    )
    other_token, _other_id, _other_tenant = await make_user(
        factory, email="member-other@example.com"
    )

    # Login establishes the shared SSO cookies. The upload below deliberately
    # sends no Authorization header, proving the member session is sufficient.
    r = await ac.post(
        "/api/v1/auth/login",
        json={"email": "member-upload@example.com", "password": "password123"},
    )
    assert r.status_code == 200, r.text
    assert "ary_access" in ac.cookies

    r = await ac.post(
        "/api/v1/member/artifacts",
        files={
            "file": (
                "member-pkg.spkg",
                b"SPKG1:member\n" + b"\x00" * 64,
                "application/octet-stream",
            )
        },
        data={
            "asset_type": "package",
            "manifest": json.dumps(_manifest("member-pkg")),
            "visibility": "private",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["asset_type"] == "package"
    assert body["slug"] == "member-pkg"
    assert body["visibility"] == "private"
    assert body["detail"]["owner_user_id"]

    r = await ac.get("/api/v1/member/artifacts")
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1
    assert r.json()["results"][0]["slug"] == "member-pkg"

    r = await ac.get("/api/v1/member/artifacts", params={"scope": "owned"})
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1

    # The dashboard workspace uses the same owned scope.
    r = await ac.get("/api/v1/workspace/artifacts", params={"scope": "owned"})
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1
    assert r.json()["results"][0]["slug"] == "member-pkg"

    # Another member cannot see the private upload in their owned scope.
    r = await ac.get(
        "/api/v1/member/artifacts",
        headers=auth_headers(other_token),
        params={"scope": "owned"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 0


@needs_db
async def test_member_shared_scope_lists_artifacts_shared_to_user(
    client, tmp_path, monkeypatch
):
    from app.config import settings

    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))
    ac, factory = client
    owner_token, _owner_id, _owner_tenant = await make_user(
        factory, email="member-share-owner@example.com"
    )
    grantee_token, grantee_id, _grantee_tenant = await make_user(
        factory, email="member-share-grantee@example.com"
    )

    r = await ac.post(
        "/api/v1/member/artifacts",
        headers=auth_headers(owner_token),
        files={
            "file": (
                "shared-member-pkg.spkg",
                b"SPKG1:member-share\n" + b"\x00" * 48,
                "application/octet-stream",
            )
        },
        data={
            "asset_type": "package",
            "manifest": json.dumps(_manifest("shared-member-pkg")),
            "visibility": "private",
        },
    )
    assert r.status_code == 201, r.text

    r = await ac.post(
        "/api/v1/hub/assets/package/shared-member-pkg/shares",
        headers=auth_headers(owner_token),
        json={
            "grantee_type": "user",
            "grantee_id": grantee_id,
            "permission": "VIEW",
        },
    )
    assert r.status_code == 201, r.text

    r = await ac.get(
        "/api/v1/member/artifacts",
        headers=auth_headers(grantee_token),
        params={"scope": "shared"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1
    assert r.json()["results"][0]["slug"] == "shared-member-pkg"
    assert "VIEW" in r.json()["results"][0]["permissions"]

    r = await ac.get(
        "/api/v1/member/artifacts",
        headers=auth_headers(grantee_token),
        params={"scope": "owned"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 0
