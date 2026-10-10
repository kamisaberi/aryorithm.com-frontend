"""Threat-model inventory, OTA, and subscription-plan route tests."""

import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio
TENANT_HDR = "X-Tenant-ID"


@needs_db
async def test_model_inventory_and_download(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)
    h = {**auth_headers(token), TENANT_HDR: tenant_id}

    r = await ac.get("/api/v1/models", headers=auth_headers(token))
    assert r.status_code == 422  # X-Tenant-ID is required

    r = await ac.get("/api/v1/models", headers=h)
    assert r.status_code == 200
    assert len(r.json()) >= 2
    assert set(r.json()[0]) >= {"filename", "sha256", "size_bytes", "download_url", "stage"}

    r = await ac.get("/api/v1/models/../evil.onnx", headers=h)
    assert r.status_code in (400, 404)
    r = await ac.get("/api/v1/models/unknown-model.onnx", headers=h)
    assert r.status_code == 404
    # seeded rows reference the API path but ship no local binary
    r = await ac.get("/api/v1/models/network_threat_v1.onnx", headers=h)
    assert r.status_code == 404


@needs_db
async def test_ota_lifecycle(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)
    h, ha = auth_headers(admin_token), auth_headers(analyst_token)

    r = await ac.get("/api/v1/ota/status", headers=h)
    assert r.status_code == 200 and set(r.json()) >= {"stable_version", "candidate_version", "stage"}

    r = await ac.post("/api/v1/ota/stage",
                      json={"version": "v9.9", "sha256": "ab" * 32, "url": "https://x.invalid/m.onnx"}, headers=h)
    assert r.status_code == 200 and r.json()["stage"] == "SHADOW_MODE"
    r = await ac.post("/api/v1/ota/stage",
                      json={"version": "v9.9", "sha256": "ab" * 32, "url": "https://x.invalid/m.onnx"}, headers=ha)
    assert r.status_code == 403

    r = await ac.post("/api/v1/ota/advance", headers=h)
    assert "CANARY" in r.json()["stage"] or "FLEET" in r.json()["stage"]
    r = await ac.post("/api/v1/ota/advance", headers=h)
    assert r.status_code == 200
    r = await ac.post("/api/v1/ota/rollback", headers=h)
    assert r.status_code == 200 and "active" in r.json()


@needs_db
async def test_plans_matrix_and_patches(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.get("/api/v1/plans")
    assert r.status_code == 200  # public
    body = r.json()
    assert {p["slug"] for p in body["plans"]} == {"community", "enterprise", "critical", "sovereign"}
    assert {i["category"] for i in body["items"]} == {"software_tier", "security_subsystem",
                                                     "industrial_plugin", "cloud_saas"}
    assert len(body["items"]) >= 90
    item_id = body["items"][0]["id"]

    r = await ac.patch("/api/v1/plans/enterprise", json={"price_display": "€349"},
                       headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["price_display"] == "€349"
    r = await ac.patch("/api/v1/plans/nope", json={"price_display": "€0"}, headers=auth_headers(admin_token))
    assert r.status_code == 404
    r = await ac.patch("/api/v1/plans/enterprise", json={"price_display": "€0"},
                       headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.patch(f"/api/v1/plans/items/{item_id}", json={"item_sub": "patched"},
                       headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["item_sub"] == "patched"
    r = await ac.patch("/api/v1/plans/items/00000000-0000-0000-0000-000000000000",
                       json={}, headers=auth_headers(admin_token))
    assert r.status_code == 404
