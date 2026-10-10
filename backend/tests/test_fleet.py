"""Fleet management route tests (sync, topology, nodes, groups, ZTP, kernel rules)."""

import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user, nexus_key_headers

needs_db = pytest.mark.asyncio

SYNC_BODY = {
    "tenant_id": "tenant-dev-local",
    "nodes_count": 1,
    "nexus_id": "NEXUS-01",
    "nodes": [
        {
            "node_id": "NODE-01",
            "site": "Substation-01",
            "status": "ONLINE",
            "cpu_pct": 12.5,
            "ebpf_drops": 7,
            "mitigation_latency_us": 0.84,
            "sensors": [
                {"sensor_id": "PLC-0001", "protocol": "MODBUS_TCP", "status": "ACTIVE"}
            ],
        }
    ],
}


@needs_db
async def test_sync_topology_and_nodes(client):
    ac, factory = client
    token, _, _ = await make_user(factory)

    r = await ac.post("/api/v1/fleet/sync", json=SYNC_BODY, headers=auth_headers(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "synced" and body["synced"] == 1 and body["sensors_synced"] == 1

    r = await ac.get("/api/v1/fleet/topology", headers=auth_headers(token))
    assert r.status_code == 200
    topo = r.json()
    assert set(topo) >= {"tenant_id", "nexus", "summary"}
    assert topo["nexus"][0]["nodes"][0]["node_id"] == "NODE-01"

    r = await ac.get("/api/v1/fleet/nodes", headers=auth_headers(token))
    assert r.status_code == 200
    assert any(n["node_id"] == "NODE-01" for n in r.json())
    r = await ac.get("/api/v1/fleet/nodes", params={"status": "NONEXISTENT"}, headers=auth_headers(token))
    assert r.json() == []

    r = await ac.get("/api/v1/fleet/nodes/NODE-01", headers=auth_headers(token))
    assert r.status_code == 200 and r.json()["node_id"] == "NODE-01"
    r = await ac.get("/api/v1/fleet/nodes/NODE-404", headers=auth_headers(token))
    assert r.status_code == 404


@needs_db
async def test_sync_api_key_and_unauthorized(client):
    ac, factory = client
    await make_user(factory)
    r = await ac.post("/api/v1/fleet/sync", json=SYNC_BODY, headers=nexus_key_headers())
    assert r.status_code == 200
    r = await ac.post("/api/v1/fleet/sync", json=SYNC_BODY)
    assert r.status_code == 401
    r = await ac.get("/api/v1/fleet/topology")
    assert r.status_code == 401


@needs_db
async def test_node_restart_and_decommission(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)
    await ac.post("/api/v1/fleet/sync", json=SYNC_BODY, headers=auth_headers(admin_token))

    r = await ac.post("/api/v1/fleet/nodes/NODE-01/restart", json={"reason": "config reload"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["status"] == "RESTART_DISPATCHED"
    r = await ac.post("/api/v1/fleet/nodes/NODE-01/restart", json={"reason": "x"},
                      headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.delete("/api/v1/fleet/nodes/NODE-404", headers=auth_headers(admin_token))
    assert r.status_code == 404
    r = await ac.delete("/api/v1/fleet/nodes/NODE-01", headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["status"] == "DECOMMISSIONED"
    r = await ac.get("/api/v1/fleet/nodes/NODE-01", headers=auth_headers(admin_token))
    assert r.status_code == 404


@needs_db
async def test_groups_and_enclaves(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.get("/api/v1/fleet/groups", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()) == 3  # default zones

    r = await ac.post("/api/v1/fleet/groups",
                      json={"group_id": "LAB", "description": "Lab", "scada_mode": False, "max_latency_us": 500},
                      headers=auth_headers(admin_token))
    assert r.status_code == 201 and r.json()["group_id"] == "LAB"
    r = await ac.get("/api/v1/fleet/groups", headers=auth_headers(admin_token))
    assert any(g["group_id"] == "LAB" for g in r.json())
    r = await ac.post("/api/v1/fleet/groups", json={"group_id": "   "}, headers=auth_headers(admin_token))
    assert r.status_code == 400
    r = await ac.post("/api/v1/fleet/groups", json={"group_id": "X"}, headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.get("/api/v1/fleet/enclaves", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()) == 3
    r = await ac.post("/api/v1/fleet/enclaves", json={"enclave_id": "LAB-ENCLAVE"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["status"] == "CREATED"


@needs_db
async def test_ztp_and_kernel_rules(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="a@example.com")

    r = await ac.post("/api/v1/fleet/provisioning/tokens", json={"enclave_id": "CRITICAL_OT", "valid_days": 7},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and set(r.json()) >= {"token", "expires_at"}

    r = await ac.post("/api/v1/fleet/provisioning/enroll",
                      json={"tpm_quote": "q", "dmi_uuid": "d", "token": "t"})
    assert r.status_code == 200 and r.json()["assigned_node_id"] == "NODE-new01"

    r = await ac.get("/api/v1/fleet/kernel-rules", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.post("/api/v1/fleet/kernel-rules/purge", json={"ip": "198.51.100.45"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 200 and r.json()["status"] == "PURGED_FLEET_WIDE"
