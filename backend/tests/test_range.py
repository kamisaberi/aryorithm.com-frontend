"""Cyber-range route tests (twins, replay, instances, resilience)."""

import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


@needs_db
async def test_twins_and_replay(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.get("/api/v1/range/twins", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()) == 2

    r = await ac.post("/api/v1/range/twins", json={"name": "lab"}, headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["status"] == "PROVISIONED"
    r = await ac.post("/api/v1/range/twins", json={"name": "lab"}, headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.post("/api/v1/range/twins/TWIN-OT-SUBSTATION/start", headers=auth_headers(admin_token))
    assert r.json() == {"status": "RUNNING", "sandbox_ip": "10.240.0.1"}
    r = await ac.post("/api/v1/range/twins/TWIN-OT-SUBSTATION/stop", headers=auth_headers(admin_token))
    assert r.json()["status"] == "TERMINATED"

    r = await ac.post("/api/v1/range/attacks/replay", json={"malware": "industroyer", "target": "substation"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["frames_injected"] == 120

    r = await ac.get("/api/v1/range/blueprints", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()) == 4


@needs_db
async def test_instance_lifecycle(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")

    r = await ac.post("/api/v1/range/instances/provision",
                      json={"blueprint_id": "NOPE"}, headers=auth_headers(admin_token))
    assert r.status_code == 400
    r = await ac.post("/api/v1/range/instances/provision",
                      json={"blueprint_id": "TWIN-SUBSTATION-ALPHA", "enclave_name": "lab"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 202, r.text
    inst = r.json()["instance_id"]
    assert r.json()["status"] == "INITIALIZING"

    r = await ac.get("/api/v1/range/instances", headers=auth_headers(admin_token))
    assert any(i["instance_id"] == inst and i["status"] == "RUNNING" for i in r.json())

    r = await ac.post(f"/api/v1/range/instances/{inst}/resume", headers=auth_headers(admin_token))
    assert r.status_code == 404  # only PAUSED instances resume
    r = await ac.post(f"/api/v1/range/instances/{inst}/pause", headers=auth_headers(admin_token))
    assert r.json()["status"] == "PAUSED"
    r = await ac.post(f"/api/v1/range/instances/{inst}/resume", headers=auth_headers(admin_token))
    assert r.json()["status"] == "RUNNING"
    r = await ac.delete(f"/api/v1/range/instances/{inst}", headers=auth_headers(admin_token))
    assert r.json()["status"] == "TERMINATED"
    r = await ac.post(f"/api/v1/range/instances/{inst}/pause", headers=auth_headers(admin_token))
    assert r.status_code == 404


@needs_db
async def test_resilience_and_certify(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    h = auth_headers(admin_token)

    r = await ac.get("/api/v1/range/resilience/score", headers=h)
    assert r.status_code == 200 and "resilience_score" in r.json()
    r = await ac.get("/api/v1/range/resilience/bench", headers=h)
    assert r.status_code == 200 and len(r.json()["tested_malware_profiles"]) == 3
    r = await ac.get("/api/v1/range/resilience/history", headers=h)
    assert r.status_code == 200 and len(r.json()) >= 2
    assert set(r.json()[0]) == {"score", "evaluated_at"}

    r = await ac.post("/api/v1/range/resilience/certify", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "resilience_certificate.pdf" in r.headers["content-disposition"]
