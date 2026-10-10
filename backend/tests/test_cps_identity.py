"""CPS verticals + identity & behavior route tests."""

import pytest
from sqlalchemy import select

from app.models.dfir import ITDREvent, ZTNASession
from app.models.threat import ScadaEvent
from app.models.user import UserRole
from tests.conftest import auth_headers, make_user, nexus_key_headers

needs_db = pytest.mark.asyncio


@needs_db
async def test_cps_endpoints(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)
    h = auth_headers(token)

    for path in ("/api/v1/cps/medical/scanners", "/api/v1/cps/medical/pacs-events",
                 "/api/v1/cps/maritime/vessels"):
        r = await ac.get(path, headers=h)
        assert r.status_code == 200 and isinstance(r.json(), list)

    async with factory() as db:
        db.add(ScadaEvent(tenant_id=tenant_id, node_node_id="NODE-01", site="S1", protocol="DICOM",
                          plc_ip="10.0.0.5", attacker_ip="10.0.0.9", function_code="C-STORE"))
        await db.commit()
    r = await ac.get("/api/v1/cps/medical/pacs-events", headers=h)
    assert r.status_code == 200
    assert any(e["event_id"].startswith("MED-SEC-") for e in r.json())


@needs_db
async def test_itdr_and_revoke(client):
    ac, factory = client
    admin_token, _, tenant_id = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.get("/api/v1/threats/itdr/events", headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json() == []

    async with factory() as db:
        db.add(ITDREvent(tenant_id=tenant_id, incident_id="ITDR-1", targeted_user="jdoe@corp.local",
                         attacker_ip="10.0.0.9", attack_technique="Kerberoasting", encryption="RC4"))
        await db.commit()
    r = await ac.get("/api/v1/threats/itdr/events", headers=auth_headers(admin_token))
    assert len(r.json()) == 1 and r.json()[0]["encryption_type_requested"] == "RC4"

    r = await ac.post("/api/v1/threats/itdr/revoke-session",
                      json={"user_principal_name": "ghost@corp.local"}, headers=auth_headers(admin_token))
    assert r.status_code == 404
    r = await ac.post("/api/v1/threats/itdr/revoke-session",
                      json={"user_principal_name": "jdoe@corp.local", "reason": "compromised"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["status"] == "SESSION_REVOKED"
    r = await ac.post("/api/v1/threats/itdr/revoke-session",
                      json={"user_principal_name": "jdoe@corp.local"},
                      headers=auth_headers(analyst_token))
    assert r.status_code == 403


@needs_db
async def test_bot_evaluate(client):
    ac, factory = client
    token, _, _ = await make_user(factory)

    r = await ac.post("/api/v1/bot/evaluate", json={"session_id": "s1", "kinematic_vectors": []},
                      headers=auth_headers(token))
    assert r.status_code == 200 and r.json()["verdict"] == "HUMAN_VERIFIED"

    vectors = [{"x": float(i), "y": 0.0, "dt_ms": 10.0} for i in range(5)]
    r = await ac.post("/api/v1/bot/evaluate",
                      json={"session_id": "s2", "kinematic_vectors": vectors, "keystroke_jitter_ms": 0.01},
                      headers=nexus_key_headers())
    body = r.json()
    assert r.status_code == 200 and body["verdict"] == "AUTOMATED_BOT"
    assert body["attribution_factors"]

    r = await ac.post("/api/v1/bot/evaluate", json={"session_id": "s3"})
    assert r.status_code == 401


@needs_db
async def test_ztna_sessions(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)
    h = auth_headers(token)

    async with factory() as db:
        db.add(ZTNASession(tenant_id=tenant_id, user_email="ops@corp.local", risk_score=0.9,
                           factors=["impossible-travel"], enclaves=["CRITICAL_OT"], quarantined=True))
        db.add(ZTNASession(tenant_id=tenant_id, user_email="dev@corp.local", risk_score=0.1))
        await db.commit()

    r = await ac.get("/api/v1/ztna/sessions", headers=h)
    assert r.status_code == 200
    by_email = {s["user_email"]: s for s in r.json()}
    assert by_email["ops@corp.local"]["risk_tier"] == "CRITICAL"
    assert by_email["ops@corp.local"]["automated_action"] == "ENCLAVE_ACCESS_QUARANTINED"
    assert by_email["dev@corp.local"]["risk_tier"] == "LOW"
