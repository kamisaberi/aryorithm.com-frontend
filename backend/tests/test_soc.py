"""MDR SOC + emergency support route tests."""

import pytest
from sqlalchemy import select

from app.models.range import MDRIncident
from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


@needs_db
async def test_incident_message_flow(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/soc/incidents", headers=h)
    assert r.status_code == 200 and r.json() == []

    async with factory() as db:
        db.add(MDRIncident(tenant_id=tenant_id, incident_id="MDR-1", severity="HIGH",
                           target_site="Substation-01", protocol="MODBUS_TCP",
                           threat_summary="Coil storm", assigned_analyst="Omar"))
        await db.commit()

    r = await ac.get("/api/v1/soc/incidents", headers=h)
    assert len(r.json()) == 1 and r.json()[0]["in_kernel_drop_verified"] is True

    r = await ac.get("/api/v1/soc/incidents/MDR-1", headers=h)
    assert r.status_code == 200
    assert r.json()["messages"] == [] and r.json()["pcap_links"] == ["/api/v1/dfir/pcaps?limit=20"]
    r = await ac.get("/api/v1/soc/incidents/MDR-404", headers=h)
    assert r.status_code == 404

    r = await ac.post("/api/v1/soc/incidents/MDR-1/messages",
                      json={"author": "Omar", "author_role": "analyst", "body": "Contained at breaker 4"},
                      headers=h)
    assert r.status_code == 200 and r.json()["body"] == "Contained at breaker 4"
    r = await ac.get("/api/v1/soc/incidents/MDR-1", headers=h)
    assert len(r.json()["messages"]) == 1

    r = await ac.post("/api/v1/soc/incidents/MDR-1/messages", json={"body": "   "}, headers=h)
    assert r.status_code == 400
    r = await ac.post("/api/v1/soc/incidents/MDR-404/messages", json={"body": "hi"}, headers=h)
    assert r.status_code == 404


@needs_db
async def test_emergency_dispatch_flow(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.post("/api/v1/support/emergency-dispatch", json={"affected_enclave": "CRITICAL_OT"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ENGINEERS_PAGED" and body["sla_window_minutes"] == 15
    assert len(body["assigned_responders"]) == 2 and body["emergency_bridge_link"].startswith("https://")

    r = await ac.post("/api/v1/support/emergency-dispatch", json={"affected_enclave": "  "},
                      headers=auth_headers(admin_token))
    assert r.status_code == 400
    r = await ac.post("/api/v1/support/emergency-dispatch", json={"affected_enclave": "X"},
                      headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.get("/api/v1/support/sla-history", headers=auth_headers(admin_token))
    assert r.status_code == 200
    assert r.json()[0]["status"] == "PAGED" and r.json()[0]["sla_met"] is None
