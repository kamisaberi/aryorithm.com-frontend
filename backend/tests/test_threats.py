"""Threat defense route tests."""

import pytest
from sqlalchemy import select

from app.models.threat import RansomwareHash, ScadaEvent
from tests.conftest import auth_headers, make_user, nexus_key_headers

needs_db = pytest.mark.asyncio


@needs_db
async def test_events_and_validation(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    r = await ac.get("/api/v1/threats/events", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) == 2 and r.json()[0]["threat_id"] == "threat-001"
    r = await ac.get("/api/v1/threats/events", params={"limit": 201}, headers=auth_headers(token))
    assert r.status_code == 422
    r = await ac.get("/api/v1/threats/events")
    assert r.status_code == 401


@needs_db
async def test_broadcast_feeds_global_feed(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    r = await ac.post("/api/v1/threats/broadcast", json={"ip": "198.51.100.77"},
                      headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json() == {"status": "broadcast_dispatched", "target_ip": "198.51.100.77"}

    r = await ac.get("/api/v1/threats/global-feed", params={"verbose": "true"},
                     headers=nexus_key_headers())
    assert r.status_code == 200
    assert any(row["ip"] == "198.51.100.77" for row in r.json())

    r = await ac.get("/api/v1/threats/global-feed", headers=nexus_key_headers())
    assert r.status_code == 200 and r.json() == [{"ip": "185.220.101.5"}]
    r = await ac.get("/api/v1/threats/global-feed")
    assert r.status_code == 401


@needs_db
async def test_static_lists(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)
    r = await ac.get("/api/v1/threats/collective-bus", headers=h)
    assert r.status_code == 200 and r.json()[0]["rule_id"] == "RULE-441"
    r = await ac.get("/api/v1/threats/mitre", headers=h)
    assert {m["technique_id"] for m in r.json()} == {"T0855", "T1059", "T1071"}
    r = await ac.get("/api/v1/threats/identity-bot", headers=h)
    assert r.json() == {"impossible_velocity_hits": 4, "bot_kinematic_blocks": 22}
    r = await ac.get("/api/v1/threats/xai", headers=h)
    assert r.status_code == 200
    assert r.json()[0]["attributions"][0]["rank"] == 1


@needs_db
async def test_scada_and_ransomware_from_db(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)
    h = auth_headers(token)
    async with factory() as db:
        db.add(ScadaEvent(tenant_id=tenant_id, node_node_id="NODE-01", site="S1", protocol="MODBUS_TCP",
                          attacker_ip="10.0.0.9", function_code="FC16"))
        db.add(ScadaEvent(tenant_id=tenant_id, node_node_id="NODE-01", site="S1", protocol="DNP3",
                          attacker_ip="10.0.0.10", function_code="FC3"))
        db.add(RansomwareHash(tenant_id=tenant_id, sha256="aa" * 32, process_name="evil.exe",
                              detected_entropy=7.9, burst_iops=5000, reported_by_site="S1",
                              status="ACTIVE"))
        db.add(RansomwareHash(tenant_id=None, sha256="bb" * 32, process_name="worm.exe",
                              detected_entropy=7.5, burst_iops=100, reported_by_site="GLOBAL",
                              status="ACTIVE"))
        await db.commit()

    r = await ac.get("/api/v1/threats/scada", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["summary"]["modbus_violations_total"] == 1
    assert body["summary"]["dnp3_anomalies_total"] == 1
    assert len(body["recent_events"]) == 2
    r = await ac.get("/api/v1/threats/scada", params={"protocol": "modbus_tcp"}, headers=h)
    assert len(r.json()["recent_events"]) == 1

    r = await ac.get("/api/v1/threats/ransomware-hashes", headers=h)
    assert r.status_code == 200 and len(r.json()) == 2
