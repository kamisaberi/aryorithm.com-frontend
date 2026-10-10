"""Administration settings route tests."""

import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


@needs_db
async def test_api_keys(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.get("/api/v1/settings/api-keys", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.get("/api/v1/settings/api-keys", headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.post("/api/v1/settings/api-keys", json={"name": "ops", "scopes": ["read"]},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["api_key"].startswith("ary_live_")

    r = await ac.delete("/api/v1/settings/api-keys/key_001", headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json() == {"status": "REVOKED", "key_id": "key_001"}


@needs_db
async def test_webhooks_billing_audit(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    h = auth_headers(admin_token)

    r = await ac.get("/api/v1/settings/webhooks", headers=h)
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.post("/api/v1/settings/webhooks",
                      json={"url": "https://ops.example.com/hook", "events": ["threat"]}, headers=h)
    assert r.status_code == 200 and r.json() == {"webhook_id": "wh_new01", "status": "ACTIVE"}

    r = await ac.get("/api/v1/settings/billing", headers=h)
    assert r.status_code == 200
    assert r.json()["licensed_nodes"] == 150

    r = await ac.get("/api/v1/settings/audit-logs", headers=h)
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.get("/api/v1/settings/audit-logs", params={"limit": 201}, headers=h)
    assert r.status_code == 422
