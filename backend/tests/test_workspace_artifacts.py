"""Workspace artifact upload, listing, detail, edit and delete flows."""

import json

import pytest

from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


def _manifest(slug: str, name: str = "Workspace Package"):
    return {
        "slug": slug,
        "name": name,
        "tier": "lua",
        "version": "1.0.0",
        "sector": "Water",
        "short_description": "workspace only",
        "technical_details": "not public",
    }


async def _upload(ac, token, slug: str, visibility: str = "private"):
    return await ac.post(
        "/api/v1/workspace/artifacts",
        headers=auth_headers(token),
        files={
            "file": (
                f"{slug}.spkg",
                b"SPKG1:workspace\n" + b"\x00" * 64,
                "application/octet-stream",
            )
        },
        data={
            "asset_type": "package",
            "manifest": json.dumps(_manifest(slug)),
            "visibility": visibility,
        },
    )


@needs_db
async def test_workspace_upload_defaults_private_and_supports_crud(client, tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))
    ac, factory = client
    token, _user_id, _tenant_id = await make_user(factory, email="workspace-owner@example.com")
    other_token, _other_id, _other_tenant = await make_user(
        factory, email="workspace-other@example.com"
    )

    r = await _upload(ac, token, "workspace-pkg")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["visibility"] == "private"
    assert body["detail"]["visibility"] == "private"

    # Anonymous and other-tenant callers cannot read the private asset.
    assert (await ac.get("/api/v1/hub/assets/package/workspace-pkg")).status_code == 404
    assert (
        await ac.get(
            "/api/v1/hub/assets/package/workspace-pkg",
            headers=auth_headers(other_token),
        )
    ).status_code == 404

    # Owner sees it in the private workspace.
    r = await ac.get(
        "/api/v1/workspace/artifacts",
        headers=auth_headers(token),
        params={"scope": "private"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 1
    assert r.json()["results"][0]["slug"] == "workspace-pkg"

    r = await ac.get(
        "/api/v1/workspace/artifacts/package/workspace-pkg",
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["permissions"] == ["VIEW", "FORK", "DEPLOY", "ADMIN"]

    r = await ac.patch(
        "/api/v1/workspace/artifacts/package/workspace-pkg",
        headers=auth_headers(token),
        json={"description": "updated description", "readme_markdown": "# Updated"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["description"] == "updated description"

    r = await ac.delete(
        "/api/v1/workspace/artifacts/package/workspace-pkg",
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "revoked"

    assert (
        await ac.get(
            "/api/v1/hub/assets/package/workspace-pkg",
            headers=auth_headers(token),
        )
    ).status_code == 404
