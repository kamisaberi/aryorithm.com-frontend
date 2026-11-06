"""Scenario Graph Studio API tests.

Covers ``/api/v1/matrix-scenarios``: palette, tenant-scoped CRUD, five
compile rules, binary bundle downloads, Hub publication/slug isolation,
launch queue/dispatch and RBAC.
"""

import copy
import io
import json
import tarfile

import pytest
import yaml

from app.config import settings
from app.models.fleet import Node, NodeStatus
from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio

SAMPLE_GRAPH = {
    "scenario_id": "water_treatment_alpha",
    "name": "Water Treatment Alpha",
    "target_sector": "CRITICAL_INFRASTRUCTURE",
    "description": "Purdue water-treatment plant with Modbus coil injection.",
    "subnets": [
        {
            "id": "dmz",
            "name": "Level 3 DMZ",
            "cidr": "192.168.10.0/24",
            "gateway": "192.168.10.1",
            "internal": False,
            "purdue_level": 3,
        },
        {
            "id": "control",
            "name": "Level 1 SCADA Control",
            "cidr": "10.240.1.0/24",
            "gateway": "10.240.1.1",
            "internal": True,
            "purdue_level": 1,
        },
        {
            "id": "fieldbus",
            "name": "Level 0 Process Fieldbus",
            "cidr": "172.16.50.0/24",
            "gateway": "172.16.50.1",
            "internal": True,
            "purdue_level": 0,
        },
    ],
    "nodes": [
        {
            "id": "intake_plc",
            "name": "Intake Pump PLC",
            "type": "ARCHETYPE_PLC",
            "subnet_id": "control",
            "ip": "10.240.1.10",
            "image": "sentinel-matrix/device-runtime:latest",
            "protocols": ["MODBUS_TCP", "S7COMM"],
            "ports": ["502:502", "102:102"],
            "config": {"registers": {"40001": "flow_rate"}},
            "x": 40,
            "y": 120,
        },
        {
            "id": "chlorine_plc",
            "name": "Chlorine Pump ODE Twin",
            "type": "MOCK_PLC_ODE",
            "subnet_id": "fieldbus",
            "ip": "172.16.50.20",
            "image": "sentinel-matrix/mock-plc:latest",
            "protocols": ["MODBUS_TCP", "S7COMM"],
            "ports": ["15501:502"],
            "config": {"physics": "rk4_dosing"},
            "x": 340,
            "y": 120,
        },
        {
            "id": "vibration_probe",
            "name": "IFM Vibration Probe",
            "type": "SENSOR_VIBRATION",
            "subnet_id": "fieldbus",
            "ip": "172.16.50.30",
            "image": "",
            "protocols": ["MODBUS_TCP"],
            "ports": ["15502:15502"],
            "config": {},
            "x": 340,
            "y": 260,
        },
        {
            "id": "red_team",
            "name": "Red Team Attacker",
            "type": "ADVERSARY_NODE",
            "subnet_id": "control",
            "ip": "10.240.1.99",
            "image": "sentinel-matrix/adversary:latest",
            "protocols": [],
            "ports": [],
            "config": {"tools": ["nmap", "mbpoll"]},
            "x": 40,
            "y": 300,
        },
    ],
    "links": [
        {
            "id": "attack_fc05",
            "source_node_id": "red_team",
            "target_node_id": "intake_plc",
            "kind": "ATTACK",
            "label": "FC05 coil override",
            "protocol": "MODBUS_TCP",
            "config": {
                "payload_hex": "00010000000601050064ff00",
                "timestamp_sec": 30,
                "vector": "modbus_unauthorized_coil_write",
            },
        },
        {
            "id": "process_bus",
            "source_node_id": "intake_plc",
            "target_node_id": "chlorine_plc",
            "kind": "ETHERNET",
            "label": "Process bus",
            "protocol": "MODBUS_TCP",
            "config": {},
        },
        {
            "id": "vibration_stream",
            "source_node_id": "vibration_probe",
            "target_node_id": "intake_plc",
            "kind": "TELEMETRY",
            "label": "Vibration stream",
            "protocol": "MODBUS_TCP",
            "config": {},
        },
    ],
}


def _payload(scenario_id: str = "water_treatment_alpha"):
    payload = copy.deepcopy(SAMPLE_GRAPH)
    payload["scenario_id"] = scenario_id
    return payload


async def _make_online_node(factory, tenant_id: str, node_id: str = "matrix-node-01"):
    async with factory() as db:
        db.add(
            Node(
                node_id=node_id,
                site="Plant A",
                hostname="matrix-node-01.plant.local",
                status=NodeStatus.ONLINE,
                tenant_id=tenant_id,
            )
        )
        await db.commit()


@needs_db
async def test_scenario_studio_crud_compile_bundle_and_hub(client, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "hub"))
    monkeypatch.setattr(
        settings, "MATRIX_SCENARIO_DIR", str(tmp_path / "matrix-scenarios")
    )

    ac, factory = client
    token, _user_id, _tenant_id = await make_user(factory)
    h = auth_headers(token)

    # Palette is available to any authenticated user.
    r = await ac.get("/api/v1/matrix-scenarios/palette", headers=h)
    assert r.status_code == 200, r.text
    palette = r.json()
    assert [category["category"] for category in palette["categories"]] == [
        "NETWORKS",
        "PLCS_AND_CONTROLLERS",
        "FIELD_SENSORS",
        "SIMULATION_ACTORS",
    ]
    item_types = [
        item["type"]
        for category in palette["categories"]
        for item in category["items"]
    ]
    assert item_types == [
        "SUBNET_BRIDGE",
        "SUBNET_AIRGAP",
        "ARCHETYPE_PLC",
        "ARCHETYPE_IED",
        "MOCK_PLC_ODE",
        "SENSOR_VIBRATION",
        "SENSOR_LIDAR",
        "SENSOR_POWER",
        "SENSOR_CAMERA",
        "ADVERSARY_NODE",
        "TRAFFIC_GENERATOR",
        "GPU_FORGE_WORKER",
    ]
    networks = palette["categories"][0]["items"]
    assert networks[0]["default_subnet"] == "10.240.0.0/24"
    assert networks[1]["internal"] is True
    plc = palette["categories"][1]["items"][0]
    assert plc["protocols"] == ["MODBUS_TCP", "S7COMM"]
    assert plc["default_ports"] == [502, 102]
    assert plc["image"] == "sentinel-matrix/device-runtime:latest"

    # Empty library, then create.
    r = await ac.get("/api/v1/matrix-scenarios", headers=h)
    assert r.status_code == 200 and r.json() == []
    r = await ac.post("/api/v1/matrix-scenarios", json=_payload(), headers=h)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["scenario_id"] == "water_treatment_alpha"
    assert created["status"] == "DRAFT"
    assert created["subnet_count"] == 3
    assert created["node_count"] == 4
    assert created["link_count"] == 3

    # List is lightweight and counts normalized children.
    r = await ac.get("/api/v1/matrix-scenarios", headers=h)
    assert r.status_code == 200, r.text
    listed = r.json()
    assert len(listed) == 1
    assert listed[0]["subnet_count"] == 3
    assert listed[0]["node_count"] == 4
    assert listed[0]["link_count"] == 3
    assert "nodes" not in listed[0] and "subnets" not in listed[0]

    # Detail reconstructs the visual graph.
    r = await ac.get("/api/v1/matrix-scenarios/water_treatment_alpha", headers=h)
    assert r.status_code == 200, r.text
    detail = r.json()
    assert {item["id"] for item in detail["subnets"]} == {
        "dmz",
        "control",
        "fieldbus",
    }
    assert detail["nodes"][0]["type"] == "ARCHETYPE_PLC"
    assert detail["nodes"][0]["config"]["registers"]["40001"] == "flow_rate"
    assert detail["links"][0]["kind"] == "ATTACK"
    assert detail["compiled_yaml"] is None

    # POST is an upsert by tenant + scenario_id.
    updated = _payload()
    updated["name"] = "Water Treatment Alpha v2"
    updated["nodes"] = updated["nodes"][:3]
    updated["links"] = updated["links"][1:]
    r = await ac.post("/api/v1/matrix-scenarios", json=updated, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["node_count"] == 3
    assert r.json()["status"] == "DRAFT"

    # Compile emits scenario.yaml with nodes/devices aliases and attack waves.
    r = await ac.post(
        "/api/v1/matrix-scenarios/water_treatment_alpha/compile", headers=h
    )
    assert r.status_code == 200, r.text
    compiled = r.json()
    assert compiled["status"] == "VALIDATED"
    assert compiled["valid"] is True
    assert compiled["errors"] == []
    assert compiled["compiled_at"]
    assert any("EMPTY_SUBNET" in issue["code"] for issue in compiled["issues"])
    document = yaml.safe_load(compiled["compiled_yaml"])
    assert document["version"] == "2.0"
    assert set(document["networks"]) == {"dmz", "control", "fieldbus"}
    assert document["networks"]["control"]["internal"] is True
    assert document["nodes"]["intake_plc"]["ip"] == "10.240.1.10"
    assert document["devices"]["intake_plc"]["image"] == (
        "sentinel-matrix/device-runtime:latest"
    )
    assert document["nodes"]["vibration_probe"]["image"] == (
        "sentinel-matrix/device-runtime:latest"
    )
    assert document["execution"]["attack_waves"] == []
    assert document["links"][0]["kind"] == "ETHERNET"

    # Binary bundle download.
    r = await ac.post(
        "/api/v1/matrix-scenarios/water_treatment_alpha/bundle", headers=h
    )
    assert r.status_code == 200, r.text
    assert r.content[:2] == b"\x1f\x8b"
    assert r.headers["content-type"].startswith("application/gzip")
    checksum = r.headers["x-checksum-sha256"]
    assert len(checksum) == 64
    assert "scenario_water_treatment_alpha_v2.tar.gz" in r.headers[
        "content-disposition"
    ]
    with tarfile.open(fileobj=io.BytesIO(r.content), mode="r:gz") as archive:
        assert set(archive.getnames()) == {
            "scenario.yaml",
            "manifest.json",
            "README.md",
        }
        manifest = json.loads(
            archive.extractfile("manifest.json").read().decode("utf-8")
        )
        assert manifest["kind"] == "MatrixScenario"
        assert manifest["scenario_id"] == "water_treatment_alpha"
        assert manifest["subnets"][0]["id"] == "dmz"
        assert manifest["compiled_sha256"]

    r = await ac.get("/api/v1/matrix-scenarios/water_treatment_alpha", headers=h)
    detail = r.json()
    assert detail["status"] == "BUNDLED"
    assert detail["bundle_name"] == "scenario_water_treatment_alpha_v2.tar.gz"
    assert detail["bundle_sha256"] == checksum
    assert detail["bundle_size_bytes"] > 0

    # Publish to Hub creates the public scenario row and download route.
    r = await ac.post(
        "/api/v1/matrix-scenarios/water_treatment_alpha/bundle?publish_to_hub=true",
        headers=h,
    )
    assert r.status_code == 200, r.text
    hub_slug = r.headers["x-hub-slug"]
    published_checksum = r.headers["x-checksum-sha256"]
    assert hub_slug == "water_treatment_alpha"
    r = await ac.get(f"/api/v1/hub/scenarios/{hub_slug}", headers=h)
    assert r.status_code == 200, r.text
    hub = r.json()
    assert hub["name"] == "Water Treatment Alpha v2"
    assert hub["node_topology"]["intake_plc"]["type"] == "ARCHETYPE_PLC"
    assert hub["network_subnet"] == "192.168.10.0/24"
    r = await ac.get(f"/api/v1/hub/scenarios/{hub_slug}/download", headers=h)
    assert r.status_code == 200
    assert r.content[:2] == b"\x1f\x8b"
    assert r.headers["x-checksum-sha256"] == published_checksum

    r = await ac.get("/api/v1/matrix-scenarios/water_treatment_alpha", headers=h)
    detail = r.json()
    assert detail["hub_slug"] == hub_slug
    assert detail["hub_url"].endswith(f"/scenarios/{hub_slug}")
    assert detail["bundle_sha256"] == published_checksum

    # Delete removes the graph and every normalized child.
    r = await ac.delete(
        "/api/v1/matrix-scenarios/water_treatment_alpha", headers=h
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "DELETED"
    r = await ac.get("/api/v1/matrix-scenarios", headers=h)
    assert r.json() == []
    r = await ac.get("/api/v1/matrix-scenarios/water_treatment_alpha", headers=h)
    assert r.status_code == 404


@needs_db
async def test_scenario_studio_compile_rejects_all_topology_rules(client):
    ac, factory = client
    token, _user_id, _tenant_id = await make_user(factory)
    h = auth_headers(token)

    invalid = _payload("scenario_invalid")
    # 1. overlapping CIDR
    invalid["subnets"][2]["cidr"] = "10.240.1.128/25"
    invalid["subnets"][2]["gateway"] = "10.240.1.129"
    # 2. duplicate / gateway IP
    invalid["nodes"][3]["ip"] = "10.240.1.10"
    # 3. host port collision with intake_plc:502
    invalid["nodes"][3]["ports"] = ["502:9999"]
    # 4. air-gap WAN egress
    invalid["nodes"][0]["config"]["wan_egress"] = True
    # extra invalid mapping and unknown palette type
    invalid["nodes"][2]["ports"] = ["not-a-port"]
    invalid["nodes"][2]["type"] = "ROGUE_RUNTIME"

    r = await ac.post("/api/v1/matrix-scenarios", json=invalid, headers=h)
    assert r.status_code == 201, r.text
    r = await ac.post(
        "/api/v1/matrix-scenarios/scenario_invalid/compile", headers=h
    )
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    assert detail["status"] == "INVALID_TOPOLOGY"
    codes = {issue["code"] for issue in detail["issues"]}
    assert {
        "CIDR_OVERLAP",
        "IP_COLLISION",
        "HOST_PORT_COLLISION",
        "AIRGAP_WAN_EGRESS",
        "INVALID_PORT_MAPPING",
        "UNKNOWN_NODE_TYPE",
    } <= codes
    assert any("overlap" in message for message in detail["errors"])

    # Compile also rejects a node on the .1 host and an unmediated route link.
    routed = _payload("scenario_routed")
    routed["nodes"][3]["ip"] = "10.240.1.1"
    routed["nodes"].append(
        {
            "id": "dmz_historian",
            "name": "DMZ Historian",
            "type": "GPU_FORGE_WORKER",
            "subnet_id": "dmz",
            "ip": "192.168.10.20",
            "image": "sentinel-matrix/forge:latest",
            "protocols": [],
            "ports": [],
            "config": {},
            "x": 40,
            "y": 420,
        }
    )
    routed["links"].append(
        {
            "id": "wan_route",
            "source_node_id": "red_team",
            "target_node_id": "dmz_historian",
            "kind": "ROUTE",
            "label": "Unmediated WAN route",
            "protocol": "",
            "config": {},
        }
    )
    r = await ac.post("/api/v1/matrix-scenarios", json=routed, headers=h)
    assert r.status_code == 201, r.text
    r = await ac.post(
        "/api/v1/matrix-scenarios/scenario_routed/compile", headers=h
    )
    assert r.status_code == 400, r.text
    codes = {issue["code"] for issue in r.json()["detail"]["issues"]}
    assert "IP_GATEWAY_CONFLICT" in codes
    assert "AIRGAP_ROUTE" in codes

    # A valid graph compiles even when warnings remain (empty subnet).
    r = await ac.post(
        "/api/v1/matrix-scenarios/water_treatment_alpha/compile", headers=h
    )
    assert r.status_code == 404  # not created in this test


@needs_db
async def test_scenario_studio_rbac_and_tenant_isolation(client):
    ac, factory = client
    admin_token, _admin_id, _tenant_id = await make_user(
        factory, email="studio-admin@example.com"
    )
    analyst_token, _analyst_id, _analyst_tenant = await make_user(
        factory,
        email="studio-analyst@example.com",
        role=UserRole.SECOPS_ANALYST,
    )
    outsider_token, _outsider_id, _outsider_tenant = await make_user(
        factory, email="studio-outsider@example.com"
    )
    admin_h = auth_headers(admin_token)
    analyst_h = auth_headers(analyst_token)
    outsider_h = auth_headers(outsider_token)

    r = await ac.post("/api/v1/matrix-scenarios", json=_payload(), headers=admin_h)
    assert r.status_code == 201, r.text

    # Readers see their own tenant only.
    r = await ac.get("/api/v1/matrix-scenarios", headers=analyst_h)
    assert r.status_code == 200 and r.json() == []
    r = await ac.get("/api/v1/matrix-scenarios/palette", headers=analyst_h)
    assert r.status_code == 200
    r = await ac.get(
        "/api/v1/matrix-scenarios/water_treatment_alpha", headers=analyst_h
    )
    assert r.status_code == 404

    # Analysts cannot mutate, compile, bundle or launch.
    for method, path, kwargs in (
        ("post", "/api/v1/matrix-scenarios", {"json": _payload("nope")}),
        ("post", "/api/v1/matrix-scenarios/water_treatment_alpha/compile", {}),
        ("post", "/api/v1/matrix-scenarios/water_treatment_alpha/bundle", {}),
        ("post", "/api/v1/matrix-scenarios/water_treatment_alpha/launch", {}),
        ("delete", "/api/v1/matrix-scenarios/water_treatment_alpha", {}),
    ):
        r = await getattr(ac, method)(path, headers=analyst_h, **kwargs)
        assert r.status_code == 403, (path, r.status_code, r.text)

    # Another tenant cannot read or delete.
    r = await ac.get("/api/v1/matrix-scenarios", headers=outsider_h)
    assert r.status_code == 200 and r.json() == []
    r = await ac.get(
        "/api/v1/matrix-scenarios/water_treatment_alpha", headers=outsider_h
    )
    assert r.status_code == 404
    r = await ac.delete(
        "/api/v1/matrix-scenarios/water_treatment_alpha", headers=outsider_h
    )
    assert r.status_code == 404

    # Unauthenticated access is rejected.
    r = await ac.get("/api/v1/matrix-scenarios")
    assert r.status_code == 401
    r = await ac.get("/api/v1/matrix-scenarios/palette")
    assert r.status_code == 401


@needs_db
async def test_scenario_studio_hub_slug_collision_is_tenant_isolated(
    client, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "hub"))
    monkeypatch.setattr(
        settings, "MATRIX_SCENARIO_DIR", str(tmp_path / "matrix-scenarios")
    )

    ac, factory = client
    token_one, _user_one, _tenant_one = await make_user(
        factory, email="studio-one@example.com"
    )
    token_two, _user_two, tenant_two = await make_user(
        factory, email="studio-two@example.com"
    )
    h_one = auth_headers(token_one)
    h_two = auth_headers(token_two)

    one = _payload("shared_scenario")
    one["name"] = "Tenant One Water Plant"
    two = _payload("shared_scenario")
    two["name"] = "Tenant Two Water Plant"
    assert (
        await ac.post("/api/v1/matrix-scenarios", json=one, headers=h_one)
    ).status_code == 201
    assert (
        await ac.post("/api/v1/matrix-scenarios", json=two, headers=h_two)
    ).status_code == 201

    r = await ac.post(
        "/api/v1/matrix-scenarios/shared_scenario/bundle?publish_to_hub=true",
        headers=h_one,
    )
    assert r.status_code == 200, r.text
    assert r.headers["x-hub-slug"] == "shared_scenario"
    checksum_one = r.headers["x-checksum-sha256"]

    r = await ac.post(
        "/api/v1/matrix-scenarios/shared_scenario/bundle?publish_to_hub=true",
        headers=h_two,
    )
    assert r.status_code == 200, r.text
    prefix = tenant_two.replace("-", "")[:8]
    assert r.headers["x-hub-slug"] == f"{prefix}-shared_scenario"
    checksum_two = r.headers["x-checksum-sha256"]
    assert checksum_two != checksum_one

    r = await ac.get("/api/v1/hub/scenarios/shared_scenario", headers=h_one)
    assert r.status_code == 200
    assert r.json()["name"] == "Tenant One Water Plant"
    r = await ac.get(
        f"/api/v1/hub/scenarios/{prefix}-shared_scenario", headers=h_one
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Tenant Two Water Plant"

    r = await ac.get("/api/v1/matrix-scenarios/shared_scenario", headers=h_one)
    assert r.json()["hub_slug"] == "shared_scenario"
    r = await ac.get("/api/v1/matrix-scenarios/shared_scenario", headers=h_two)
    assert r.json()["hub_slug"] == f"{prefix}-shared_scenario"


@needs_db
async def test_scenario_studio_generated_id_launch_and_input_validation(client):
    ac, factory = client
    token, _user_id, tenant_id = await make_user(factory)
    h = auth_headers(token)

    payload = _payload()
    payload.pop("scenario_id")
    r = await ac.post("/api/v1/matrix-scenarios", json=payload, headers=h)
    assert r.status_code == 201, r.text
    generated_id = r.json()["scenario_id"]
    assert generated_id.startswith("scen_")

    # Queue when no Matrix agent is online.
    r = await ac.post(
        f"/api/v1/matrix-scenarios/{generated_id}/launch", headers=h
    )
    assert r.status_code == 202, r.text
    queued = r.json()
    assert queued["status"] == "QUEUED"
    assert queued["agent_id"] is None
    assert queued["compiled_sha256"]

    # Dispatch when an online agent exists and the caller selects it.
    await _make_online_node(factory, tenant_id)
    r = await ac.post(
        f"/api/v1/matrix-scenarios/{generated_id}/launch",
        json={"agent_id": "matrix-node-01"},
        headers=h,
    )
    assert r.status_code == 200, r.text
    launched = r.json()
    assert launched["status"] == "DISPATCHED"
    assert launched["agent_id"] == "matrix-node-01"
    assert launched["agent_status"] == "ONLINE"

    r = await ac.get(f"/api/v1/matrix-scenarios/{generated_id}", headers=h)
    detail = r.json()
    assert detail["status"] == "LAUNCHED"
    assert detail["last_launch_id"] == launched["launch_id"]
    assert detail["last_launch_status"] == "DISPATCHED"
    assert detail["last_launch_agent_id"] == "matrix-node-01"

    # Schema boundary: duplicate child ids and blank names are rejected.
    duplicate = _payload("duplicate_subnet")
    duplicate["subnets"].append(copy.deepcopy(duplicate["subnets"][0]))
    r = await ac.post("/api/v1/matrix-scenarios", json=duplicate, headers=h)
    assert r.status_code == 400
    assert "Subnet ids must be unique" in r.json()["detail"]

    blank = _payload("blank_name")
    blank["name"] = "   "
    r = await ac.post("/api/v1/matrix-scenarios", json=blank, headers=h)
    assert r.status_code == 400

    bad_id = _payload("bad id with spaces")
    r = await ac.post("/api/v1/matrix-scenarios", json=bad_id, headers=h)
    assert r.status_code == 400

    # Invalid child types/levels fail at the pydantic boundary.
    bad_level = _payload("bad_level")
    bad_level["subnets"][0]["purdue_level"] = 9
    r = await ac.post("/api/v1/matrix-scenarios", json=bad_level, headers=h)
    assert r.status_code == 422

    bad_position = _payload("bad_position")
    bad_position["nodes"][0]["x"] = -1
    r = await ac.post("/api/v1/matrix-scenarios", json=bad_position, headers=h)
    assert r.status_code == 422
