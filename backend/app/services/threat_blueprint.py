"""Visual Threat Blueprint catalog, graph validation, and YAML compiler.

The editor stores the raw canvas graph. This module owns the authoritative
palette socket schemas and the compile step that turns a graph into the
``model_routes.yaml`` consumed by sentinel-nexus.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Iterable

import yaml


# ---------------------------------------------------------------------------
# Socket schema
# ---------------------------------------------------------------------------
SOCKET_TYPES: dict[str, dict[str, str]] = {
    "PACKET_STREAM": {
        "label": "Raw network packet stream",
        "color": "#94A3B8",  # gray
    },
    "FEATURE_TENSOR": {
        "label": "Normalized feature tensor",
        "color": "#22D3EE",  # cyan
    },
    "PASS": {
        "label": "Clean traffic pass path",
        "color": "#10B981",  # emerald
    },
    "MITIGATION": {
        "label": "Mitigation / kernel drop path",
        "color": "#F43F5E",  # red
    },
    "PHYSICAL_TELEMETRY": {
        "label": "Cross-modal physical telemetry",
        "color": "#A78BFA",  # purple
    },
}

# Source socket type -> target socket types it may connect to.
# A reflex guard's PASS output is already normalized enough to feed an AI
# model or fusion node, hence the extra emerald/cyan transitions.
SOCKET_COMPATIBILITY: dict[str, set[str]] = {
    "PACKET_STREAM": {"PACKET_STREAM"},
    "FEATURE_TENSOR": {"FEATURE_TENSOR", "PASS"},
    "PASS": {"PASS", "FEATURE_TENSOR", "PACKET_STREAM"},
    "MITIGATION": {"MITIGATION"},
    "PHYSICAL_TELEMETRY": {"PHYSICAL_TELEMETRY"},
}


def _socket(
    name: str,
    socket_type: str,
    *,
    required: bool = True,
    accepts: Iterable[str] | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "socket_type": socket_type,
        "color": SOCKET_TYPES[socket_type]["color"],
        "required": required,
        "accepts": list(accepts or [socket_type]),
    }


# ---------------------------------------------------------------------------
# Node type schema (stage, sockets, defaults)
# ---------------------------------------------------------------------------
NODE_TYPE_DEFS: dict[str, dict[str, Any]] = {
    "SENSOR_INGRESS": {
        "stage": 1,
        "inputs": [],
        "outputs": [_socket("out", "PACKET_STREAM")],
        "required_config": ["sensor_id", "transport"],
        "default_latency_ns": 0,
    },
    "SPKG_REFLEX_GATE": {
        "stage": 2,
        "inputs": [_socket("in", "PACKET_STREAM")],
        "outputs": [
            _socket("pass", "PASS"),
            _socket("drop", "MITIGATION"),
        ],
        "required_config": ["package_id", "tier"],
        "default_latency_ns": 88,
    },
    "SILICON_MODEL": {
        "stage": 3,
        "inputs": [_socket("in", "FEATURE_TENSOR", accepts=["PASS", "FEATURE_TENSOR"])],
        "outputs": [
            _socket("pass", "FEATURE_TENSOR"),
            _socket("anomaly", "MITIGATION"),
        ],
        "required_config": ["model_id", "silicon_target"],
        "default_latency_ns": 300,
    },
    "CROSS_MODAL_FUSION": {
        "stage": 4,
        "inputs": [
            _socket("cyber_in", "FEATURE_TENSOR", accepts=["PASS", "FEATURE_TENSOR"]),
            # Physical probes are ambient telemetry: not every fusion node
            # necessarily receives a wired physical input.
            _socket("physical_in", "PHYSICAL_TELEMETRY", required=False),
        ],
        "outputs": [
            _socket("pass", "FEATURE_TENSOR"),
            _socket("breach", "MITIGATION"),
        ],
        "required_config": [
            "correlation_id",
            "cyber_sensor_id",
            "physical_sensor_id",
        ],
        "default_latency_ns": 200,
    },
    "ACTION_KERNEL_DROP": {
        "stage": 5,
        "inputs": [_socket("in", "MITIGATION")],
        "outputs": [],
        "required_config": ["action"],
        "default_latency_ns": 840,
    },
}


STAGE_DEFS: list[dict[str, Any]] = [
    {
        "stage": 1,
        "name": "Stage 1 — Ingress Sensors",
        "category": "INGRESS",
        "color": "#94A3B8",
    },
    {
        "stage": 2,
        "name": "Stage 2 — Dissectors & Reflex Guards",
        "category": "REFLEX_GUARD",
        "color": "#10B981",
    },
    {
        "stage": 3,
        "name": "Stage 3 — Silicon AI Models",
        "category": "SILICON_MODEL",
        "color": "#22D3EE",
    },
    {
        "stage": 4,
        "name": "Stage 4 — Cross-Modal Fusion",
        "category": "FUSION",
        "color": "#A78BFA",
    },
    {
        "stage": 5,
        "name": "Stage 5 — Active Mitigation Actions",
        "category": "MITIGATION",
        "color": "#F43F5E",
    },
]

_STAGE_BY_TYPE = {
    node_type: spec["stage"] for node_type, spec in NODE_TYPE_DEFS.items()
}
_CATEGORY_BY_STAGE = {s["stage"]: s["category"] for s in STAGE_DEFS}


def _catalog_node(
    catalog_id: str,
    node_type: str,
    label: str,
    description: str,
    default_config: dict[str, Any] | None = None,
    latency_sla_ns: int | None = None,
) -> dict[str, Any]:
    spec = NODE_TYPE_DEFS[node_type]
    latency = (
        latency_sla_ns
        if latency_sla_ns is not None
        else spec.get("default_latency_ns")
    )
    return {
        "catalog_id": catalog_id,
        "type": node_type,
        "stage": spec["stage"],
        "category": _CATEGORY_BY_STAGE[spec["stage"]],
        "label": label,
        "description": description,
        "default_config": default_config or {},
        "inputs": spec["inputs"],
        "outputs": spec["outputs"],
        "latency_sla_ns": latency,
    }


NODE_CATALOG: list[dict[str, Any]] = [
    # Stage 1 — ingress
    _catalog_node(
        "ingress_nic_mirror",
        "SENSOR_INGRESS",
        "NIC Mirror Ingress",
        "AF_PACKET mirror of a monitored host interface.",
        {"sensor_id": "NIC-Mirror-01", "transport": "mirror", "interface": "ens160"},
    ),
    _catalog_node(
        "ingress_modbus_tcp",
        "SENSOR_INGRESS",
        "Modbus TCP Ingress",
        "Modbus TCP sensor on port 502 (unit/register aware).",
        {"sensor_id": "Substation-Modbus-01", "transport": "tcp", "port": 502},
    ),
    _catalog_node(
        "ingress_siemens_s7",
        "SENSOR_INGRESS",
        "Siemens S7Comm Ingress",
        "Siemens S7Comm ISO-on-TCP sensor on port 102.",
        {"sensor_id": "Siemens-S7-01", "transport": "tcp", "port": 102},
    ),
    _catalog_node(
        "ingress_iec104",
        "SENSOR_INGRESS",
        "IEC 60870-5-104 Ingress",
        "IEC-104 telecontrol ingress on port 2404.",
        {"sensor_id": "IEC104-RTU-01", "transport": "tcp", "port": 2404},
    ),
    _catalog_node(
        "ingress_dnp3",
        "SENSOR_INGRESS",
        "DNP3 Ingress",
        "DNP3 outstation ingress on port 20000.",
        {"sensor_id": "DNP3-Outstation-01", "transport": "tcp", "port": 20000},
    ),
    # Stage 2 — dissectors / reflex guards
    _catalog_node(
        "reflex_native_cpp",
        "SPKG_REFLEX_GATE",
        "Native C++20 Reflex Guard",
        "Deterministic in-process register/function-code guard (~88 ns).",
        {
            "package_id": "org.aryorithm.package.modbus_actuator_guard",
            "tier": "NATIVE_CPP",
            "latency_sla_ns": 88,
        },
    ),
    _catalog_node(
        "reflex_luajit",
        "SPKG_REFLEX_GATE",
        "LuaJIT Dynamic Guard",
        "Hot-reloadable LuaJIT rule guard (~350 ns).",
        {
            "package_id": "org.aryorithm.package.modbus_actuator_guard",
            "tier": "LUAJIT",
            "latency_sla_ns": 350,
        },
    ),
    _catalog_node(
        "reflex_wasm3_rust",
        "SPKG_REFLEX_GATE",
        "Rust Wasm3 Micro-Sandbox",
        "Memory-safe Wasm3 guard for untrusted third-party dissectors (~1.24 µs).",
        {
            "package_id": "org.aryorithm.package.dnp3_outstation_guard",
            "tier": "WASM3_RUST",
            "latency_sla_ns": 1240,
        },
    ),
    # Stage 3 — silicon AI models
    _catalog_node(
        "ai_openvino_mae",
        "SILICON_MODEL",
        "OpenVINO Tabular MAE",
        "INT8 OpenVINO masked autoencoder for SCADA tabular anomalies.",
        {
            "model_id": "network_threat_int8.onnx",
            "silicon_target": "INTEL_OPENVINO",
            "precision": "INT8",
            "threshold_drop": 0.85,
        },
    ),
    _catalog_node(
        "ai_tensorrt_autoencoder",
        "SILICON_MODEL",
        "TensorRT Autoencoder",
        "FP16 NVIDIA TensorRT autoencoder for high-throughput links.",
        {
            "model_id": "network_threat_fp16.plan",
            "silicon_target": "NVIDIA_TENSORRT",
            "precision": "FP16",
            "threshold_drop": 0.90,
        },
    ),
    _catalog_node(
        "ai_rknn_scada",
        "SILICON_MODEL",
        "RKNN SCADA Classifier",
        "INT8 Rockchip NPU classifier for compact edge appliances.",
        {
            "model_id": "scada_classifier_int8.rknn",
            "silicon_target": "ROCKCHIP_RKNN",
            "precision": "INT8",
            "threshold_drop": 0.82,
        },
    ),
    # Stage 4 — cross-modal fusion
    _catalog_node(
        "fusion_stuxnet_blinding",
        "CROSS_MODAL_FUSION",
        "Stuxnet Anti-Blinding Interlock",
        "Correlates SCADA cyber state with thermal probes to catch HMI blinding.",
        {
            "correlation_id": "STUXNET_THERMAL_BLINDING",
            "cyber_sensor_id": "Substation-Modbus-01",
            "physical_sensor_id": "Thermal-Probe-101",
            "physical_min_temp": 120.0,
        },
    ),
    _catalog_node(
        "fusion_thermal_vibration",
        "CROSS_MODAL_FUSION",
        "Thermal / Vibration Constraint Correlator",
        "Cross-checks physical thermal and vibration envelopes against process state.",
        {
            "correlation_id": "THERMAL_VIBRATION_CONSTRAINT",
            "cyber_sensor_id": "Substation-Modbus-01",
            "physical_sensor_id": "Vibration-Probe-201",
            "physical_min_temp": 90.0,
        },
    ),
    # Stage 5 — active mitigation
    _catalog_node(
        "action_kernel_drop",
        "ACTION_KERNEL_DROP",
        "In-Kernel eBPF Drop",
        "Drops and isolates the flow in-kernel (<0.84 µs).",
        {"action": "KERNEL_DROP_AND_ISOLATE"},
        latency_sla_ns=840,
    ),
    _catalog_node(
        "action_grpc_broadcast",
        "ACTION_KERNEL_DROP",
        "gRPC Fleet Broadcast",
        "Broadcasts the mitigation verdict to every sentinel-nexus peer.",
        {"action": "GRPC_FLEET_BROADCAST"},
        latency_sla_ns=5000,
    ),
    _catalog_node(
        "action_actuator_disconnect",
        "ACTION_KERNEL_DROP",
        "Physical Actuator Disconnect",
        "Signals a physical interlock to disconnect the actuator.",
        {"action": "PHYSICAL_ACTUATOR_DISCONNECT"},
        latency_sla_ns=20000,
    ),
]


def node_catalog_payload() -> dict[str, Any]:
    """Master palette payload split by pipeline stage plus a flat list."""
    stages = []
    for stage in STAGE_DEFS:
        stages.append(
            {
                **stage,
                "nodes": [n for n in NODE_CATALOG if n["stage"] == stage["stage"]],
            }
        )
    return {
        "version": "1.0",
        "socket_types": SOCKET_TYPES,
        "stages": stages,
        "nodes": NODE_CATALOG,
    }


# ---------------------------------------------------------------------------
# Graph validation
# ---------------------------------------------------------------------------
def _as_dict(item: Any) -> dict[str, Any]:
    if isinstance(item, dict):
        return item
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return {}


def _port_map(ports: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(p["name"]): p for p in ports}


def _compatible(source_type: str, target_type: str) -> bool:
    return target_type in SOCKET_COMPATIBILITY.get(source_type, {source_type})


def _latency_for_node(node: dict[str, Any], spec: dict[str, Any]) -> int:
    config = node.get("config") or {}
    configured = config.get("latency_sla_ns")
    if isinstance(configured, (int, float)) and configured >= 0:
        return int(configured)
    return int(spec.get("default_latency_ns") or 0)


def validate_graph(
    nodes: list[Any], edges: list[Any]
) -> tuple[list[str], list[str], int]:
    """Validate topology, socket compatibility and required inputs.

    Returns ``(errors, warnings, estimated_latency_ns)``. A graph is
    compilable only when ``errors`` is empty.
    """
    errors: list[str] = []
    warnings: list[str] = []
    node_rows = [_as_dict(n) for n in nodes]
    edge_rows = [_as_dict(e) for e in edges]

    if not node_rows:
        return ["Graph contains no nodes."], warnings, 0

    node_map: dict[str, dict[str, Any]] = {}
    node_order: list[str] = []
    specs: dict[str, dict[str, Any]] = {}
    inputs: dict[str, dict[str, dict[str, Any]]] = {}
    outputs: dict[str, dict[str, dict[str, Any]]] = {}
    estimated_latency_ns = 0

    for node in node_rows:
        node_id = str(node.get("id") or "").strip()
        if not node_id:
            errors.append("Node with an empty id is not allowed.")
            continue
        if node_id in node_map:
            errors.append(f"Duplicate node id '{node_id}'.")
            continue
        node_map[node_id] = node
        node_order.append(node_id)

        node_type = str(node.get("type") or "").strip().upper()
        spec = NODE_TYPE_DEFS.get(node_type)
        if spec is None:
            errors.append(
                f"Node '{node_id}' has unknown type '{node.get('type')}'."
            )
            inputs[node_id] = {}
            outputs[node_id] = {}
            continue

        specs[node_id] = spec
        inputs[node_id] = _port_map(spec["inputs"])
        outputs[node_id] = _port_map(spec["outputs"])
        estimated_latency_ns += _latency_for_node(node, spec)

        config = node.get("config") or {}
        for key in spec.get("required_config", []):
            if key not in config or config.get(key) in (None, ""):
                warnings.append(
                    f"Node '{node_id}' is missing recommended config key '{key}'."
                )

    edge_ids: set[str] = set()
    incoming: dict[str, set[str]] = defaultdict(set)
    adjacency: dict[str, set[str]] = defaultdict(set)

    for edge in edge_rows:
        edge_id = str(edge.get("id") or "").strip()
        if not edge_id:
            errors.append("Edge with an empty id is not allowed.")
            continue
        if edge_id in edge_ids:
            errors.append(f"Duplicate edge id '{edge_id}'.")
            continue
        edge_ids.add(edge_id)

        source_id = str(edge.get("source_node") or "").strip()
        target_id = str(edge.get("target_node") or "").strip()
        source_port = str(edge.get("source_port") or "").strip()
        target_port = str(edge.get("target_port") or "").strip()

        source_exists = source_id in node_map
        target_exists = target_id in node_map
        if not source_exists:
            errors.append(
                f"Edge '{edge_id}' references unknown source node '{source_id}'."
            )
        if not target_exists:
            errors.append(
                f"Edge '{edge_id}' references unknown target node '{target_id}'."
            )
        if source_exists and target_exists and source_id == target_id:
            errors.append(f"Edge '{edge_id}' is a self-loop on node '{source_id}'.")
            continue

        source_socket = outputs.get(source_id, {}).get(source_port)
        if source_exists and source_socket is None:
            errors.append(
                f"Edge '{edge_id}' references unknown source port "
                f"'{source_id}.{source_port}'."
            )
        target_socket = inputs.get(target_id, {}).get(target_port)
        if target_exists and target_socket is None:
            errors.append(
                f"Edge '{edge_id}' references unknown target port "
                f"'{target_id}.{target_port}'."
            )
        if not source_exists or not target_exists:
            continue
        if source_socket is None or target_socket is None:
            continue

        source_type = source_socket["socket_type"]
        target_type = target_socket["socket_type"]
        if not _compatible(source_type, target_type):
            errors.append(
                f"Edge '{edge_id}' has incompatible socket types: "
                f"{source_type} -> {target_type}."
            )
            continue

        incoming[target_id].add(target_port)
        adjacency[source_id].add(target_id)

    # Every required input socket must be fed by at least one wire.
    for node_id in node_order:
        spec = specs.get(node_id)
        if spec is None:
            continue
        for port in spec["inputs"]:
            if port.get("required", True) and port["name"] not in incoming[node_id]:
                errors.append(
                    f"Node '{node_id}' is missing required input '{port['name']}'."
                )

    # Cycle detection (DFS with white/gray/black colouring).
    colour: dict[str, int] = {}

    def _visit(node_id: str) -> bool:
        colour[node_id] = 1  # gray: on the current DFS stack
        for child in adjacency.get(node_id, ()):  # noqa: B007
            state = colour.get(child, 0)
            if state == 1:
                return True
            if state == 0 and _visit(child):
                return True
        colour[node_id] = 2  # black: fully explored
        return False

    for node_id in node_order:
        if colour.get(node_id, 0) == 0 and _visit(node_id):
            errors.append("Cycle detected in blueprint graph.")
            break

    return errors, warnings, estimated_latency_ns


# ---------------------------------------------------------------------------
# model_routes.yaml compiler
# ---------------------------------------------------------------------------
def compile_graph(
    *,
    blueprint_id: str,
    name: str,
    description: str,
    target_sites: list[str],
    nodes: list[Any],
    edges: list[Any],
) -> tuple[str | None, list[str], list[str], dict[str, int]]:
    """Compile a validated graph into deterministic ``model_routes.yaml``.

    Returns ``(yaml_text, errors, warnings, stats)``. ``yaml_text`` is
    ``None`` when the graph cannot be compiled.
    """
    node_rows = []
    for raw in nodes:
        node = dict(_as_dict(raw))
        node["id"] = str(node.get("id") or "").strip()
        node["type"] = str(node.get("type") or "").strip().upper()
        node_rows.append(node)
    edge_rows = []
    for raw in edges:
        edge = dict(_as_dict(raw))
        for key in ("id", "source_node", "source_port", "target_node", "target_port"):
            edge[key] = str(edge.get(key) or "").strip()
        edge_rows.append(edge)

    errors, warnings, estimated_latency_ns = validate_graph(node_rows, edge_rows)
    stats = {
        "node_count": len(node_rows),
        "edge_count": len(edge_rows),
        "estimated_latency_ns": estimated_latency_ns,
    }
    if errors:
        return None, errors, warnings, stats

    pipeline: list[dict[str, Any]] = []
    for node in node_rows:
        node_type = str(node.get("type") or "").strip().upper()
        spec = NODE_TYPE_DEFS[node_type]
        pipeline.append(
            {
                "node_id": node["id"],
                "stage": spec["stage"],
                "type": node_type,
                "label": node.get("label") or node_type,
                "config": node.get("config") or {},
            }
        )
    pipeline.sort(key=lambda item: item["stage"])

    routes: list[dict[str, Any]] = []
    mitigation_actions: list[dict[str, Any]] = []
    for node in node_rows:
        node_type = str(node.get("type") or "").strip().upper()
        if node_type == "ACTION_KERNEL_DROP":
            config = node.get("config") or {}
            mitigation_actions.append(
                {
                    "node_id": node["id"],
                    "action": config.get("action", "KERNEL_DROP_AND_ISOLATE"),
                    "latency_sla_ns": _latency_for_node(
                        node, NODE_TYPE_DEFS[node_type]
                    ),
                }
            )

    for edge in edge_rows:
        source_id = str(edge["source_node"])
        target_id = str(edge["target_node"])
        source_type = str(edge["source_port"])
        target_type = str(edge["target_port"])
        source_node = next(n for n in node_rows if n["id"] == source_id)
        target_node = next(n for n in node_rows if n["id"] == target_id)
        source_spec = NODE_TYPE_DEFS[str(source_node["type"]).upper()]
        target_spec = NODE_TYPE_DEFS[str(target_node["type"]).upper()]
        routes.append(
            {
                "id": edge["id"],
                "source": {
                    "node": source_id,
                    "port": source_type,
                    "socket_type": _port_map(source_spec["outputs"])[source_type][
                        "socket_type"
                    ],
                },
                "target": {
                    "node": target_id,
                    "port": target_type,
                    "socket_type": _port_map(target_spec["inputs"])[target_type][
                        "socket_type"
                    ],
                },
            }
        )

    document = {
        "apiVersion": "aryorithm.io/v1",
        "kind": "ModelRoutes",
        "metadata": {
            "blueprint_id": blueprint_id,
            "name": name,
            "description": description,
            "target_sites": target_sites,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "visual-threat-blueprint-editor",
        },
        "spec": {
            "pipeline": pipeline,
            "routes": routes,
            "mitigation_actions": mitigation_actions,
            "stats": stats,
        },
    }
    yaml_text = yaml.safe_dump(document, sort_keys=False, allow_unicode=True)
    return yaml_text, errors, warnings, stats
