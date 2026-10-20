"""Visual Threat Blueprint API tests.

Covers the full editor contract:
``GET/POST/DELETE /blueprints``, ``GET /blueprints/{id}``,
``GET /blueprints/node-catalog``, ``POST /{id}/compile`` and
``POST /{id}/deploy`` — including graph validation, YAML compilation,
RBAC and tenant isolation.
"""

import copy

import pytest
import yaml

from app.models.user import User, UserRole
from app.utils.security import create_access_token, hash_password
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio

SAMPLE_BLUEPRINT = {
    "blueprint_id": "bp_substation_alpha_v2",
    "name": "Substation Alpha SCADA & Thermal Protection",
    "description": (
        "Visual pipeline connecting Modbus TCP ingress to native C++ guard, "
        "OpenVINO MAE model, and Stuxnet HMI blinding interlock"
    ),
    "target_sites": ["PowerGrid-North-01", "Substation-Alpha"],
    "status": "DEPLOYED",
    "nodes": [
        {
            "id": "node_sensor_1",
            "type": "SENSOR_INGRESS",
            "label": "Modbus TCP Ingress",
            "position": {"x": 100, "y": 200},
            "config": {
                "sensor_id": "Substation-Modbus-01",
                "transport": "tcp",
                "port": 502,
            },
        },
        {
            "id": "node_reflex_1",
            "type": "SPKG_REFLEX_GATE",
            "label": "Modbus Actuator Guard",
            "position": {"x": 400, "y": 200},
            "config": {
                "package_id": "org.aryorithm.package.modbus_actuator_guard",
                "tier": "NATIVE_CPP",
                "latency_sla_ns": 120,
            },
        },
        {
            "id": "node_ai_1",
            "type": "SILICON_MODEL",
            "label": "OpenVINO Tabular MAE",
            "position": {"x": 700, "y": 200},
            "config": {
                "model_id": "network_threat_int8.onnx",
                "silicon_target": "INTEL_OPENVINO",
                "threshold_drop": 0.85,
            },
        },
        {
            "id": "node_fusion_1",
            "type": "CROSS_MODAL_FUSION",
            "label": "Stuxnet Anti-Blinding Interlock",
            "position": {"x": 1000, "y": 200},
            "config": {
                "correlation_id": "STUXNET_THERMAL_BLINDING",
                "cyber_sensor_id": "Substation-Modbus-01",
                "physical_sensor_id": "Thermal-Probe-101",
                "physical_min_temp": 120.0,
            },
        },
        {
            "id": "node_action_drop",
            "type": "ACTION_KERNEL_DROP",
            "label": "In-Kernel eBPF Drop (<0.84µs)",
            "position": {"x": 1300, "y": 300},
            "config": {"action": "KERNEL_DROP_AND_ISOLATE"},
        },
    ],
    "edges": [
        {
            "id": "e1",
            "source_node": "node_sensor_1",
            "source_port": "out",
            "target_node": "node_reflex_1",
            "target_port": "in",
        },
        {
            "id": "e2",
            "source_node": "node_reflex_1",
            "source_port": "pass",
            "target_node": "node_ai_1",
            "target_port": "in",
        },
        {
            "id": "e3",
            "source_node": "node_reflex_1",
            "source_port": "drop",
            "target_node": "node_action_drop",
            "target_port": "in",
        },
        {
            "id": "e4",
            "source_node": "node_ai_1",
            "source_port": "pass",
            "target_node": "node_fusion_1",
            "target_port": "cyber_in",
        },
        {
            "id": "e5",
            "source_node": "node_ai_1",
            "source_port": "anomaly",
            "target_node": "node_action_drop",
            "target_port": "in",
        },
        {
            "id": "e6",
            "source_node": "node_fusion_1",
            "source_port": "breach",
            "target_node": "node_action_drop",
            "target_port": "in",
        },
    ],
}

NODE_IDS = {
    "node_sensor_1",
    "node_reflex_1",
    "node_ai_1",
    "node_fusion_1",
    "node_action_drop",
}


def _draft(blueprint_id: str, *, name: str | None = None):
    payload = copy.deepcopy(SAMPLE_BLUEPRINT)
    payload["blueprint_id"] = blueprint_id
    payload["status"] = "DRAFT"
    if name is not None:
        payload["name"] = name
    return payload


async def _create(ac, headers, blueprint_id: str = "bp_substation_alpha_v2"):
    response = await ac.post(
        "/api/v1/blueprints",
        json=_draft(blueprint_id),
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _make_user_in_tenant(factory, tenant_id: str, email: str, role: UserRole):
    """Create an additional user in an existing tenant (RBAC tests)."""
    async with factory() as db:
        user = User(
            email=email,
            password_hash=hash_password("password123"),
            name="Second User",
            role=role,
            tenant_id=tenant_id,
        )
        db.add(user)
        await db.flush()
        token, _ = create_access_token(user.id)
        await db.commit()
        return token


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
@needs_db
async def test_blueprint_crud_lifecycle(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/blueprints", headers=h)
    assert r.status_code == 200 and r.json() == []

    r = await ac.post("/api/v1/blueprints", json=SAMPLE_BLUEPRINT, headers=h)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["blueprint_id"] == "bp_substation_alpha_v2"
    assert created["name"] == SAMPLE_BLUEPRINT["name"]
    assert created["status"] == "DRAFT"  # clients cannot self-deploy
    assert created["node_count"] == 5 and created["edge_count"] == 6
    assert created["target_sites"] == ["PowerGrid-North-01", "Substation-Alpha"]
    assert {n["id"] for n in created["nodes"]} == NODE_IDS
    assert {e["id"] for e in created["edges"]} == {
        "e1", "e2", "e3", "e4", "e5", "e6",
    }
    assert created["compiled_yaml"] is None
    assert created["created_at"] and created["updated_at"]

    # Collection metadata is lightweight: no graph payload.
    r = await ac.get("/api/v1/blueprints", headers=h)
    assert r.status_code == 200
    listed = r.json()
    assert len(listed) == 1
    assert set(listed[0]) >= {
        "blueprint_id",
        "name",
        "node_count",
        "edge_count",
        "status",
        "last_deployed_at",
    }
    assert "nodes" not in listed[0] and "edges" not in listed[0]

    r = await ac.get("/api/v1/blueprints/bp_substation_alpha_v2", headers=h)
    assert r.status_code == 200
    detail = r.json()
    assert detail["description"] == SAMPLE_BLUEPRINT["description"]
    assert detail["nodes"][0]["position"] == {"x": 100.0, "y": 200.0}

    # POST with an existing id updates the same row (no duplicate).
    updated = _draft("bp_substation_alpha_v2", name="Substation Alpha v3")
    updated["nodes"] = updated["nodes"][:1]
    updated["edges"] = []
    r = await ac.post("/api/v1/blueprints", json=updated, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "Substation Alpha v3"
    assert r.json()["node_count"] == 1 and r.json()["edge_count"] == 0
    r = await ac.get("/api/v1/blueprints", headers=h)
    assert len(r.json()) == 1

    # Trailing-slash alias returns the same collection.
    r = await ac.get("/api/v1/blueprints/", headers=h)
    assert r.status_code == 200 and len(r.json()) == 1

    r = await ac.delete("/api/v1/blueprints/bp_missing", headers=h)
    assert r.status_code == 404
    r = await ac.delete("/api/v1/blueprints/bp_substation_alpha_v2", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "DELETED"
    r = await ac.get("/api/v1/blueprints/bp_substation_alpha_v2", headers=h)
    assert r.status_code == 404
    r = await ac.delete("/api/v1/blueprints/bp_substation_alpha_v2", headers=h)
    assert r.status_code == 404


@needs_db
async def test_blueprint_id_generation_and_input_validation(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    payload = _draft("ignored")
    payload.pop("blueprint_id")
    r = await ac.post("/api/v1/blueprints", json=payload, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["blueprint_id"].startswith("bp_")

    r = await ac.post(
        "/api/v1/blueprints",
        json={"name": "   ", "nodes": [], "edges": []},
        headers=h,
    )
    assert r.status_code == 400
    r = await ac.post("/api/v1/blueprints", json={"nodes": []}, headers=h)
    assert r.status_code == 422
    r = await ac.post("/api/v1/blueprints", json={"name": "x"}, headers=h)
    assert r.status_code == 201  # empty draft is allowed until compile


# ---------------------------------------------------------------------------
# Node catalog
# ---------------------------------------------------------------------------
@needs_db
async def test_node_catalog_shape(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/blueprints/node-catalog", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["version"] == "1.0"
    assert set(body["socket_types"]) == {
        "PACKET_STREAM",
        "FEATURE_TENSOR",
        "PASS",
        "MITIGATION",
        "PHYSICAL_TELEMETRY",
    }
    assert [stage["stage"] for stage in body["stages"]] == [1, 2, 3, 4, 5]
    assert len(body["nodes"]) == 16

    by_type = {node["type"] for node in body["nodes"]}
    assert by_type == {
        "SENSOR_INGRESS",
        "SPKG_REFLEX_GATE",
        "SILICON_MODEL",
        "CROSS_MODAL_FUSION",
        "ACTION_KERNEL_DROP",
    }
    flat = {node["catalog_id"]: node for node in body["nodes"]}
    assert flat["ingress_modbus_tcp"]["default_config"]["port"] == 502
    assert flat["ingress_siemens_s7"]["default_config"]["port"] == 102
    assert flat["ingress_iec104"]["default_config"]["port"] == 2404
    assert flat["ingress_dnp3"]["default_config"]["port"] == 20000
    assert flat["ai_openvino_mae"]["default_config"]["silicon_target"] == "INTEL_OPENVINO"
    assert flat["action_kernel_drop"]["latency_sla_ns"] == 840
    assert flat["action_kernel_drop"]["outputs"] == []

    sensor = flat["ingress_modbus_tcp"]
    assert sensor["stage"] == 1
    assert sensor["inputs"] == []
    assert sensor["outputs"][0]["name"] == "out"
    assert sensor["outputs"][0]["socket_type"] == "PACKET_STREAM"
    reflex = flat["reflex_native_cpp"]
    assert {o["name"] for o in reflex["outputs"]} == {"pass", "drop"}
    fusion = flat["fusion_stuxnet_blinding"]
    physical = next(i for i in fusion["inputs"] if i["name"] == "physical_in")
    assert physical["required"] is False


# ---------------------------------------------------------------------------
# Compile
# ---------------------------------------------------------------------------
@needs_db
async def test_compile_sample_blueprint_to_yaml(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)
    await _create(ac, h)

    r = await ac.post(
        "/api/v1/blueprints/bp_substation_alpha_v2/compile", headers=h
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["valid"] is True
    assert body["status"] == "VALIDATED"
    assert body["errors"] == [] and body["warnings"] == []
    assert body["node_count"] == 5 and body["edge_count"] == 6
    assert body["estimated_latency_ns"] > 0
    assert body["compiled_at"]
    assert body["compiled_yaml"]

    doc = yaml.safe_load(body["compiled_yaml"])
    assert doc["apiVersion"] == "aryorithm.io/v1"
    assert doc["kind"] == "ModelRoutes"
    assert doc["metadata"]["blueprint_id"] == "bp_substation_alpha_v2"
    assert doc["metadata"]["target_sites"] == [
        "PowerGrid-North-01",
        "Substation-Alpha",
    ]
    assert [item["stage"] for item in doc["spec"]["pipeline"]] == [1, 2, 3, 4, 5]
    assert len(doc["spec"]["routes"]) == 6
    assert doc["spec"]["mitigation_actions"] == [
        {
            "node_id": "node_action_drop",
            "action": "KERNEL_DROP_AND_ISOLATE",
            "latency_sla_ns": 840,
        }
    ]
    e2 = next(route for route in doc["spec"]["routes"] if route["id"] == "e2")
    assert e2["source"]["socket_type"] == "PASS"
    assert e2["target"]["socket_type"] == "FEATURE_TENSOR"
    assert doc["spec"]["stats"]["node_count"] == 5

    # Compiled state is persisted and exposed to the canvas preview.
    r = await ac.get("/api/v1/blueprints/bp_substation_alpha_v2", headers=h)
    detail = r.json()
    assert detail["status"] == "VALIDATED"
    assert detail["compiled_yaml"] == body["compiled_yaml"]
    assert detail["compiled_at"]

    r = await ac.get("/api/v1/blueprints", headers=h)
    assert r.json()[0]["status"] == "VALIDATED"
    assert r.json()[0]["compiled_at"]


@needs_db
async def test_compile_rejects_invalid_graphs(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    async def compile_payload(blueprint_id, nodes, edges):
        r = await ac.post(
            "/api/v1/blueprints",
            json={
                "blueprint_id": blueprint_id,
                "name": f"Invalid {blueprint_id}",
                "nodes": nodes,
                "edges": edges,
            },
            headers=h,
        )
        assert r.status_code == 201, r.text
        return await ac.post(
            f"/api/v1/blueprints/{blueprint_id}/compile", headers=h
        )

    # Empty graph.
    r = await compile_payload("bp_empty", [], [])
    assert r.status_code == 400
    detail = r.json()["detail"]
    assert detail["status"] == "INVALID_GRAPH"
    assert any("no nodes" in e.lower() for e in detail["errors"])

    # Unknown node type.
    r = await compile_payload(
        "bp_unknown_type",
        [{"id": "n1", "type": "NOT_A_NODE", "label": "?", "config": {}}],
        [],
    )
    assert r.status_code == 400
    assert any("unknown type" in e.lower() for e in r.json()["detail"]["errors"])

    # Required input is dangling (reflex guard with no ingress).
    r = await compile_payload(
        "bp_missing_input",
        [
            {
                "id": "reflex",
                "type": "SPKG_REFLEX_GATE",
                "label": "Guard",
                "config": {"package_id": "pkg", "tier": "NATIVE_CPP"},
            }
        ],
        [],
    )
    assert r.status_code == 400
    assert any(
        "missing required input 'in'" in e.lower()
        for e in r.json()["detail"]["errors"]
    )

    # Port mismatch: PACKET_STREAM cannot feed a MITIGATION input.
    r = await compile_payload(
        "bp_type_mismatch",
        [
            {
                "id": "sensor",
                "type": "SENSOR_INGRESS",
                "label": "Sensor",
                "config": {"sensor_id": "s1", "transport": "tcp"},
            },
            {
                "id": "action",
                "type": "ACTION_KERNEL_DROP",
                "label": "Drop",
                "config": {"action": "KERNEL_DROP_AND_ISOLATE"},
            },
        ],
        [
            {
                "id": "bad",
                "source_node": "sensor",
                "source_port": "out",
                "target_node": "action",
                "target_port": "in",
            }
        ],
    )
    assert r.status_code == 400
    assert any(
        "incompatible socket types" in e.lower()
        for e in r.json()["detail"]["errors"]
    )

    # Unknown edge endpoint and unknown port.
    r = await compile_payload(
        "bp_bad_edge",
        [
            {
                "id": "sensor",
                "type": "SENSOR_INGRESS",
                "label": "Sensor",
                "config": {"sensor_id": "s1", "transport": "tcp"},
            }
        ],
        [
            {
                "id": "e1",
                "source_node": "sensor",
                "source_port": "nope",
                "target_node": "ghost",
                "target_port": "in",
            }
        ],
    )
    assert r.status_code == 400
    errors = " ".join(r.json()["detail"]["errors"]).lower()
    assert "unknown target node" in errors
    assert "unknown source port" in errors

    # Cycle between two reflex guards (PASS -> PACKET_STREAM is compatible).
    guards = [
        {
            "id": "guard_a",
            "type": "SPKG_REFLEX_GATE",
            "label": "A",
            "config": {"package_id": "pkg-a", "tier": "NATIVE_CPP"},
        },
        {
            "id": "guard_b",
            "type": "SPKG_REFLEX_GATE",
            "label": "B",
            "config": {"package_id": "pkg-b", "tier": "NATIVE_CPP"},
        },
    ]
    r = await compile_payload(
        "bp_cycle",
        guards,
        [
            {
                "id": "a_to_b",
                "source_node": "guard_a",
                "source_port": "pass",
                "target_node": "guard_b",
                "target_port": "in",
            },
            {
                "id": "b_to_a",
                "source_node": "guard_b",
                "source_port": "pass",
                "target_node": "guard_a",
                "target_port": "in",
            },
        ],
    )
    assert r.status_code == 400
    assert any(
        "cycle detected" in e.lower() for e in r.json()["detail"]["errors"]
    )

    # A failed compile does not advance the lifecycle.
    r = await ac.get("/api/v1/blueprints/bp_cycle", headers=h)
    assert r.json()["status"] == "DRAFT"
    assert r.json()["compiled_yaml"] is None


@needs_db
async def test_edit_invalidates_compiled_and_deployed_state(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)
    await _create(ac, h)

    r = await ac.post(
        "/api/v1/blueprints/bp_substation_alpha_v2/compile", headers=h
    )
    assert r.status_code == 200
    detail = (await ac.get(
        "/api/v1/blueprints/bp_substation_alpha_v2", headers=h
    )).json()
    assert detail["compiled_yaml"] and detail["status"] == "VALIDATED"

    payload = _draft("bp_substation_alpha_v2", name="Edited name")
    r = await ac.post("/api/v1/blueprints", json=payload, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "DRAFT"
    assert r.json()["compiled_yaml"] is None
    assert r.json()["compiled_at"] is None


# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------
@needs_db
async def test_deploy_blueprint(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)
    await _create(ac, h)

    # Deploy auto-compiles even when /compile was never called.
    r = await ac.post(
        "/api/v1/blueprints/bp_substation_alpha_v2/deploy", headers=h
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "DEPLOYED"
    assert body["blueprint_id"] == "bp_substation_alpha_v2"
    assert body["target_sites"] == ["PowerGrid-North-01", "Substation-Alpha"]
    assert body["nodes_targeted"] == 2
    assert 0 < body["broadcast_latency_ms"] < 50
    assert body["grpc_status"] == "BROADCAST_OK"
    assert body["fleet_health"] == "9/9"
    assert len(body["config_sha256"]) == 64

    detail = (await ac.get(
        "/api/v1/blueprints/bp_substation_alpha_v2", headers=h
    )).json()
    assert detail["status"] == "DEPLOYED"
    assert detail["last_deployed_at"]
    assert detail["compiled_yaml"]

    listed = (await ac.get("/api/v1/blueprints", headers=h)).json()
    assert listed[0]["status"] == "DEPLOYED"
    assert listed[0]["last_deployed_at"]

    # Re-deploying the unchanged graph is idempotent.
    r = await ac.post(
        "/api/v1/blueprints/bp_substation_alpha_v2/deploy", headers=h
    )
    assert r.status_code == 200 and r.json()["status"] == "DEPLOYED"


@needs_db
async def test_deploy_rejects_invalid_graph(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.post(
        "/api/v1/blueprints",
        json={
            "blueprint_id": "bp_broken",
            "name": "Broken",
            "nodes": [
                {
                    "id": "guard",
                    "type": "SPKG_REFLEX_GATE",
                    "label": "Guard",
                    "config": {"package_id": "pkg", "tier": "NATIVE_CPP"},
                }
            ],
            "edges": [],
        },
        headers=h,
    )
    assert r.status_code == 201
    r = await ac.post("/api/v1/blueprints/bp_broken/deploy", headers=h)
    assert r.status_code == 400
    assert r.json()["detail"]["status"] == "INVALID_GRAPH"
    detail = (await ac.get("/api/v1/blueprints/bp_broken", headers=h)).json()
    assert detail["status"] == "DRAFT" and detail["last_deployed_at"] is None


# ---------------------------------------------------------------------------
# RBAC + tenant isolation
# ---------------------------------------------------------------------------
@needs_db
async def test_blueprint_rbac(client):
    ac, factory = client
    admin_token, _, tenant_id = await make_user(factory, email="admin@example.com")
    analyst_token = await _make_user_in_tenant(
        factory,
        tenant_id,
        "analyst@example.com",
        UserRole.SECOPS_ANALYST,
    )
    admin_h = auth_headers(admin_token)
    analyst_h = auth_headers(analyst_token)
    await _create(ac, admin_h)

    # Read access: both roles.
    for path in (
        "/api/v1/blueprints",
        "/api/v1/blueprints/bp_substation_alpha_v2",
        "/api/v1/blueprints/node-catalog",
    ):
        assert (await ac.get(path, headers=analyst_h)).status_code == 200

    # Mutating access: admin only.
    for method, path, kwargs in (
        ("post", "/api/v1/blueprints", {"json": _draft("bp_analyst")}),
        ("delete", "/api/v1/blueprints/bp_substation_alpha_v2", {}),
        ("post", "/api/v1/blueprints/bp_substation_alpha_v2/compile", {}),
        ("post", "/api/v1/blueprints/bp_substation_alpha_v2/deploy", {}),
    ):
        r = await getattr(ac, method)(path, headers=analyst_h, **kwargs)
        assert r.status_code == 403, (method, path, r.text)

    # Unauthenticated requests are always 401.
    for method, path in (
        ("get", "/api/v1/blueprints"),
        ("get", "/api/v1/blueprints/node-catalog"),
        ("get", "/api/v1/blueprints/bp_substation_alpha_v2"),
        ("post", "/api/v1/blueprints/bp_substation_alpha_v2/compile"),
        ("post", "/api/v1/blueprints/bp_substation_alpha_v2/deploy"),
        ("delete", "/api/v1/blueprints/bp_substation_alpha_v2"),
    ):
        r = await getattr(ac, method)(path)
        assert r.status_code == 401, (method, path)

    # The blueprint survived the analyst's rejected delete/deploy.
    assert (await ac.get(
        "/api/v1/blueprints/bp_substation_alpha_v2", headers=admin_h
    )).status_code == 200


@needs_db
async def test_blueprint_tenant_isolation(client):
    ac, factory = client
    tenant_a_token, _, _ = await make_user(factory, email="a@example.com")
    tenant_b_token, _, _ = await make_user(factory, email="b@example.com")
    a_h = auth_headers(tenant_a_token)
    b_h = auth_headers(tenant_b_token)

    await _create(ac, a_h)

    assert (await ac.get("/api/v1/blueprints", headers=b_h)).json() == []
    for method, path in (
        ("get", "/api/v1/blueprints/bp_substation_alpha_v2"),
        ("delete", "/api/v1/blueprints/bp_substation_alpha_v2"),
        ("post", "/api/v1/blueprints/bp_substation_alpha_v2/compile"),
        ("post", "/api/v1/blueprints/bp_substation_alpha_v2/deploy"),
    ):
        r = await getattr(ac, method)(path, headers=b_h)
        assert r.status_code == 404, (method, path)

    # The same blueprint_id may exist independently for another tenant.
    r = await ac.post(
        "/api/v1/blueprints",
        json=_draft("bp_substation_alpha_v2", name="Tenant B copy"),
        headers=b_h,
    )
    assert r.status_code == 201
    assert r.json()["name"] == "Tenant B copy"
    assert len((await ac.get("/api/v1/blueprints", headers=a_h)).json()) == 1
    assert len((await ac.get("/api/v1/blueprints", headers=b_h)).json()) == 1
