"""Scenario Graph Studio validation, compilation and bundle services."""

from __future__ import annotations

import gzip
import hashlib
import io
import ipaddress
import json
import re
import tarfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from app.config import settings
from app.schemas.scenario_studio import (
    PaletteCategory,
    PaletteItem,
    ScenarioCompileIssue,
    ScenarioLink,
    ScenarioNode,
    ScenarioPalette,
    ScenarioSubnet,
)

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
PALETTE_CATEGORIES: list[dict[str, Any]] = [
    {
        "category": "NETWORKS",
        "items": [
            {
                "type": "SUBNET_BRIDGE",
                "label": "Bridged Subnet",
                "default_subnet": "10.240.0.0/24",
                "internal": False,
            },
            {
                "type": "SUBNET_AIRGAP",
                "label": "Air-Gapped Subnet",
                "default_subnet": "10.150.10.0/24",
                "internal": True,
                "description": "Zero default route to WAN ($0.00 egress)",
            },
        ],
    },
    {
        "category": "PLCS_AND_CONTROLLERS",
        "items": [
            {
                "type": "ARCHETYPE_PLC",
                "label": "Modular Industrial PLC",
                "protocols": ["MODBUS_TCP", "S7COMM"],
                "default_ports": [502, 102],
                "image": "sentinel-matrix/device-runtime:latest",
            },
            {
                "type": "ARCHETYPE_IED",
                "label": "Substation Protection Relay",
                "protocols": ["IEC_104"],
                "default_ports": [2404],
                "image": "sentinel-matrix/device-runtime:latest",
            },
            {
                "type": "MOCK_PLC_ODE",
                "label": "Physics RK4 ODE Twin",
                "protocols": ["MODBUS_TCP", "S7COMM", "IEC_104"],
                "default_ports": [502, 102, 2404],
                "image": "sentinel-matrix/mock-plc:latest",
            },
        ],
    },
    {
        "category": "FIELD_SENSORS",
        "items": [
            {
                "type": "SENSOR_VIBRATION",
                "label": "IFM Vibration Probe",
                "default_port": 15502,
            },
            {
                "type": "SENSOR_LIDAR",
                "label": "SICK Spatial LiDAR",
                "default_port": 2368,
            },
            {
                "type": "SENSOR_POWER",
                "label": "PAC3200 Power Meter",
                "default_port": 15501,
            },
            {
                "type": "SENSOR_CAMERA",
                "label": "FLIR Thermal RTSP Stream",
                "default_port": 8554,
            },
        ],
    },
    {
        "category": "SIMULATION_ACTORS",
        "items": [
            {
                "type": "ADVERSARY_NODE",
                "label": "Active Red-Team Attacker",
                "image": "sentinel-matrix/adversary:latest",
                "tools": ["nmap", "mbpoll", "pcap_replay"],
            },
            {
                "type": "TRAFFIC_GENERATOR",
                "label": "Wire Traffic Blaster",
                "image": "sentinel-matrix/traffic-gen:latest",
            },
            {
                "type": "GPU_FORGE_WORKER",
                "label": "Private On-Prem Forge Worker",
                "image": "sentinel-matrix/forge:latest",
            },
        ],
    },
]

PALETTE_ITEM_BY_TYPE: dict[str, dict[str, Any]] = {
    item["type"]: item
    for category in PALETTE_CATEGORIES
    for item in category["items"]
}

NETWORK_TYPES = {"SUBNET_BRIDGE", "SUBNET_AIRGAP"}
DEVICE_TYPES = set(PALETTE_ITEM_BY_TYPE) - NETWORK_TYPES
ROUTE_LINK_KINDS = {"ROUTE", "WAN", "UPLINK"}
_SLUG_RE = re.compile(r"[^a-z0-9]+")
_HEX_RE = re.compile(r"^[0-9a-fA-F]+$")
_SCENARIO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_PORT_RE = re.compile(r"^\s*(\d{1,5})(?:\s*:\s*(\d{1,5}))?\s*$")


def palette_payload() -> ScenarioPalette:
    """Return the exact four-category palette consumed by the studio UI."""
    return ScenarioPalette(
        categories=[
            PaletteCategory(
                category=str(category["category"]),
                items=[PaletteItem(**item) for item in category["items"]],
            )
            for category in PALETTE_CATEGORIES
        ]
    )


def slugify(value: str) -> str:
    return _SLUG_RE.sub("-", (value or "").lower()).strip("-")


def scenario_id_valid(value: str) -> bool:
    return bool(_SCENARIO_ID_RE.fullmatch(value or ""))


def default_image(node_type: str) -> str:
    item = PALETTE_ITEM_BY_TYPE.get(node_type, {})
    if item.get("image"):
        return str(item["image"])
    if node_type in DEVICE_TYPES:
        return "sentinel-matrix/device-runtime:latest"
    return ""


def default_ports(node_type: str) -> list[str]:
    item = PALETTE_ITEM_BY_TYPE.get(node_type, {})
    raw = item.get("default_ports") or []
    if not raw and item.get("default_port") is not None:
        raw = [item["default_port"]]
    return [f"{int(port)}:{int(port)}" for port in raw]


def parse_port_mapping(raw: str) -> tuple[int, int] | None:
    """Parse one ``host:container`` mapping, rejecting out-of-range ports."""
    match = _PORT_RE.match(str(raw))
    if not match:
        return None
    host = int(match.group(1))
    container = int(match.group(2) or match.group(1))
    if not (1 <= host <= 65535 and 1 <= container <= 65535):
        return None
    return host, container


def parse_port_mappings(ports: list[str]) -> list[tuple[int, int, str]]:
    """Parse valid ``host:container`` mappings (``container`` defaults to host)."""
    parsed: list[tuple[int, int, str]] = []
    for raw in ports:
        mapping = parse_port_mapping(raw)
        if mapping is not None:
            parsed.append((mapping[0], mapping[1], str(raw)))
    return parsed


# ---------------------------------------------------------------------------
# Validation / compilation
# ---------------------------------------------------------------------------
def _issue(
    severity: str,
    code: str,
    message: str,
    *,
    subnet_id: str | None = None,
    node_id: str | None = None,
    link_id: str | None = None,
) -> ScenarioCompileIssue:
    return ScenarioCompileIssue(
        severity=severity,  # type: ignore[arg-type]
        code=code,
        message=message,
        subnet_id=subnet_id,
        node_id=node_id,
        link_id=link_id,
    )


def _first_host(network: ipaddress.IPv4Network | ipaddress.IPv6Network):
    try:
        return network.network_address + 1
    except Exception:
        return network.network_address


def _flag(value: Any) -> bool:
    """Interpret common JSON/YAML truthy flag spellings without bool('false')."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _attack_wave(
    link: ScenarioLink,
    node_by_id: dict[str, ScenarioNode],
    index: int,
) -> dict[str, Any]:
    source = node_by_id.get(link.source_node_id)
    target = node_by_id.get(link.target_node_id)
    config = dict(link.config or {})
    try:
        timestamp_sec = int(config.get("timestamp_sec", 30 + index * 15))
    except (TypeError, ValueError):
        timestamp_sec = 30 + index * 15
    return {
        "timestamp_sec": timestamp_sec,
        "vector": str(
            config.get("vector")
            or link.protocol
            or link.label
            or link.kind
            or "ATTACK"
        ),
        "source_ip": source.ip if source else "",
        "target_ip": target.ip if target else "",
        "source_node": link.source_node_id,
        "target_node": link.target_node_id,
        "payload_hex": str(config.get("payload_hex") or ""),
    }


def _compile_document(
    *,
    scenario_id: str,
    name: str,
    target_sector: str,
    description: str,
    subnets: list[ScenarioSubnet],
    nodes: list[ScenarioNode],
    links: list[ScenarioLink],
) -> dict[str, Any]:
    node_by_id = {node.id: node for node in nodes}
    attack_waves = [
        _attack_wave(link, node_by_id, index)
        for index, link in enumerate(
            [item for item in links if item.kind.upper() == "ATTACK"]
        )
    ]

    network_doc = {
        subnet.id: {
            "name": subnet.name,
            "cidr": subnet.cidr,
            "subnet": subnet.cidr,
            "gateway": subnet.gateway,
            "internal": subnet.internal,
            "purdue_level": subnet.purdue_level,
        }
        for subnet in subnets
    }
    node_doc = {}
    for node in nodes:
        image = node.image or default_image(node.type)
        networks = {node.subnet_id: node.ip} if node.subnet_id else {}
        node_doc[node.id] = {
            "name": node.name,
            "type": node.type,
            "archetype": node.type,
            "image": image,
            "subnet": node.subnet_id,
            "ip": node.ip,
            "networks": networks,
            "protocols": list(node.protocols),
            "ports": list(node.ports),
            "config": dict(node.config or {}),
            "env": dict(node.config or {}),
        }

    return {
        "version": "2.0",
        "scenario": {
            "scenario_id": scenario_id,
            "name": name,
            "slug": slugify(name),
            "display_name": name,
            "target_sector": target_sector,
            "description": description,
        },
        "networks": network_doc,
        # ``nodes`` is the studio vocabulary; ``devices`` is retained as an
        # alias for sentinel-matrix engines that consume the older shape.
        "nodes": node_doc,
        "devices": node_doc,
        "links": [
            {
                "id": link.id,
                "source": link.source_node_id,
                "target": link.target_node_id,
                "kind": link.kind,
                "label": link.label,
                "protocol": link.protocol,
                "config": dict(link.config or {}),
            }
            for link in links
        ],
        "execution": {
            "warmup_seconds": 15,
            "attack_waves": attack_waves,
        },
    }


def compile_scenario(
    *,
    scenario_id: str,
    name: str,
    target_sector: str,
    description: str,
    subnets: list[ScenarioSubnet],
    nodes: list[ScenarioNode],
    links: list[ScenarioLink],
) -> tuple[str | None, list[ScenarioCompileIssue]]:
    """Validate the five studio topology rules and synthesize scenario.yaml.

    Rules:
      1. subnet CIDR uniqueness / overlap
      2. IP allocation validity (inside subnet, not gateway, no collisions)
      3. host-port binding uniqueness
      4. air-gap invariant (no unmediated WAN egress)
      5. YAML synthesis when no error remains
    """
    issues: list[ScenarioCompileIssue] = []

    def error(
        code: str,
        message: str,
        *,
        subnet_id: str | None = None,
        node_id: str | None = None,
        link_id: str | None = None,
    ) -> None:
        issues.append(
            _issue(
                "error",
                code,
                message,
                subnet_id=subnet_id,
                node_id=node_id,
                link_id=link_id,
            )
        )

    def warning(
        code: str,
        message: str,
        *,
        subnet_id: str | None = None,
        node_id: str | None = None,
        link_id: str | None = None,
    ) -> None:
        issues.append(
            _issue(
                "warning",
                code,
                message,
                subnet_id=subnet_id,
                node_id=node_id,
                link_id=link_id,
            )
        )

    if not name.strip():
        error("SCENARIO_NAME_REQUIRED", "Scenario name is required.")
    if not target_sector.strip():
        error("TARGET_SECTOR_REQUIRED", "Target sector is required.")
    if not subnets:
        error("NO_SUBNETS", "At least one subnet is required.")
    if not nodes:
        error("NO_NODES", "At least one node/container is required.")

    # --- 1. subnet identity, CIDR validity and overlap --------------------
    subnet_by_id: dict[str, ScenarioSubnet] = {}
    parsed_networks: dict[str, ipaddress.IPv4Network | ipaddress.IPv6Network] = {}
    parsed_gateways: dict[
        str, ipaddress.IPv4Address | ipaddress.IPv6Address
    ] = {}
    for subnet in subnets:
        if subnet.id in subnet_by_id:
            error(
                "DUPLICATE_SUBNET_ID",
                f"Duplicate subnet id '{subnet.id}'.",
                subnet_id=subnet.id,
            )
            continue
        subnet_by_id[subnet.id] = subnet
        try:
            parsed = ipaddress.ip_network(subnet.cidr, strict=True)
        except ValueError as exc:
            error(
                "INVALID_CIDR",
                f"Subnet '{subnet.id}' has invalid CIDR '{subnet.cidr}': {exc}",
                subnet_id=subnet.id,
            )
            continue
        parsed_networks[subnet.id] = parsed
        if parsed.prefixlen >= parsed.max_prefixlen - 1:
            error(
                "CIDR_TOO_SMALL",
                f"Subnet '{subnet.id}' ({parsed}) has no usable host range.",
                subnet_id=subnet.id,
            )
        try:
            gateway = ipaddress.ip_address(subnet.gateway)
        except ValueError:
            error(
                "INVALID_GATEWAY",
                f"Subnet '{subnet.id}' has invalid gateway '{subnet.gateway}'.",
                subnet_id=subnet.id,
            )
            continue
        if gateway.version != parsed.version:
            error(
                "GATEWAY_IP_VERSION_MISMATCH",
                f"Subnet '{subnet.id}' gateway and CIDR use different IP versions.",
                subnet_id=subnet.id,
            )
            continue
        if gateway not in parsed:
            error(
                "GATEWAY_OUTSIDE_SUBNET",
                f"Subnet '{subnet.id}' gateway {gateway} is outside {parsed}.",
                subnet_id=subnet.id,
            )
            continue
        if gateway in (parsed.network_address, parsed.broadcast_address):
            error(
                "GATEWAY_NETWORK_ADDRESS",
                f"Subnet '{subnet.id}' gateway {gateway} is a network/broadcast address.",
                subnet_id=subnet.id,
            )
            continue
        parsed_gateways[subnet.id] = gateway
        if gateway != _first_host(parsed):
            warning(
                "GATEWAY_NOT_FIRST_HOST",
                f"Subnet '{subnet.id}' gateway is {gateway}; the studio convention is the .1 host.",
                subnet_id=subnet.id,
            )

    network_items = list(parsed_networks.items())
    for index, (left_id, left_net) in enumerate(network_items):
        for right_id, right_net in network_items[index + 1 :]:
            if left_net.version == right_net.version and left_net.overlaps(right_net):
                error(
                    "CIDR_OVERLAP",
                    f"CIDR overlap: subnets '{left_id}' ({left_net}) and "
                    f"'{right_id}' ({right_net}) overlap.",
                    subnet_id=left_id,
                )

    # --- 2. node IP validity and uniqueness -------------------------------
    node_by_id: dict[str, ScenarioNode] = {}
    used_ips: dict[str, dict[str, str]] = {subnet_id: {} for subnet_id in subnet_by_id}
    host_port_users: dict[int, list[ScenarioNode]] = {}
    for node in nodes:
        if node.id in node_by_id:
            error(
                "DUPLICATE_NODE_ID",
                f"Duplicate node id '{node.id}'.",
                node_id=node.id,
            )
            continue
        node_by_id[node.id] = node
        if node.type not in DEVICE_TYPES:
            error(
                "UNKNOWN_NODE_TYPE",
                f"Node '{node.id}' has unknown palette type '{node.type}'.",
                node_id=node.id,
            )
        if not node.subnet_id:
            error(
                "NODE_WITHOUT_SUBNET",
                f"Node '{node.id}' is not attached to a subnet.",
                node_id=node.id,
            )
        elif node.subnet_id not in subnet_by_id:
            error(
                "UNKNOWN_SUBNET",
                f"Node '{node.id}' references unknown subnet '{node.subnet_id}'.",
                node_id=node.id,
                subnet_id=node.subnet_id,
            )
        else:
            network = parsed_networks.get(node.subnet_id)
            if network is None:
                continue
            try:
                ip = ipaddress.ip_address(node.ip)
            except ValueError:
                error(
                    "INVALID_NODE_IP",
                    f"Node '{node.id}' has invalid IP '{node.ip}'.",
                    node_id=node.id,
                    subnet_id=node.subnet_id,
                )
                ip = None
            if ip is not None:
                if ip.version != network.version or ip not in network:
                    error(
                        "IP_OUTSIDE_SUBNET",
                        f"Node '{node.id}' IP {ip} is outside subnet "
                        f"'{node.subnet_id}' ({network}).",
                        node_id=node.id,
                        subnet_id=node.subnet_id,
                    )
                elif ip in (network.network_address, network.broadcast_address):
                    error(
                        "IP_NETWORK_ADDRESS",
                        f"Node '{node.id}' IP {ip} is a network/broadcast address.",
                        node_id=node.id,
                        subnet_id=node.subnet_id,
                    )
                else:
                    gateway = parsed_gateways.get(node.subnet_id)
                    if gateway is not None and ip == gateway:
                        error(
                            "IP_GATEWAY_CONFLICT",
                            f"Node '{node.id}' IP {ip} conflicts with the gateway of "
                            f"subnet '{node.subnet_id}'.",
                            node_id=node.id,
                            subnet_id=node.subnet_id,
                        )
                    elif ip == _first_host(network):
                        error(
                            "IP_RESERVED_GATEWAY",
                            f"Node '{node.id}' IP {ip} is reserved for the .1 gateway.",
                            node_id=node.id,
                            subnet_id=node.subnet_id,
                        )
                    previous = used_ips[node.subnet_id].get(str(ip))
                    if previous is not None:
                        message = (
                            f"IP collision on subnet '{node.subnet_id}': {ip} is "
                            f"used by '{previous}' and '{node.id}'."
                        )
                        error(
                            "IP_COLLISION",
                            message,
                            node_id=node.id,
                            subnet_id=node.subnet_id,
                        )
                        error(
                            "IP_COLLISION",
                            message,
                            node_id=previous,
                            subnet_id=node.subnet_id,
                        )
                    else:
                        used_ips[node.subnet_id][str(ip)] = node.id

        for raw in node.ports:
            mapping = parse_port_mapping(raw)
            if mapping is None:
                error(
                    "INVALID_PORT_MAPPING",
                    f"Node '{node.id}' has invalid port mapping '{raw}' "
                    "(expected host:container with ports 1-65535).",
                    node_id=node.id,
                )
            else:
                host_port_users.setdefault(mapping[0], []).append(node)

    # --- 3. host-port binding uniqueness ----------------------------------
    for host_port, users in host_port_users.items():
        if len(users) <= 1:
            continue
        names = ", ".join(f"'{item.id}'" for item in users)
        for node in users:
            error(
                "HOST_PORT_COLLISION",
                f"Host port {host_port} is claimed by multiple containers: {names}.",
                node_id=node.id,
                subnet_id=node.subnet_id,
            )

    # --- 4. air-gap invariant --------------------------------------------
    for node in nodes:
        if not node.subnet_id:
            continue
        subnet = subnet_by_id.get(node.subnet_id)
        if subnet is None or not subnet.internal:
            continue
        if _flag((node.config or {}).get("wan_egress")):
            error(
                "AIRGAP_WAN_EGRESS",
                f"Node '{node.id}' has WAN egress enabled on air-gapped subnet "
                f"'{subnet.id}'.",
                node_id=node.id,
                subnet_id=subnet.id,
            )

    # --- links: referential checks + routed air-gap links -----------------
    link_ids: set[str] = set()
    seen_edges: set[tuple[str, str, str]] = set()
    for link in links:
        if link.id in link_ids:
            error(
                "DUPLICATE_LINK_ID",
                f"Duplicate link id '{link.id}'.",
                link_id=link.id,
            )
            continue
        link_ids.add(link.id)
        source = node_by_id.get(link.source_node_id)
        target = node_by_id.get(link.target_node_id)
        if source is None:
            error(
                "UNKNOWN_LINK_SOURCE",
                f"Link '{link.id}' references unknown source node "
                f"'{link.source_node_id}'.",
                link_id=link.id,
            )
        if target is None:
            error(
                "UNKNOWN_LINK_TARGET",
                f"Link '{link.id}' references unknown target node "
                f"'{link.target_node_id}'.",
                link_id=link.id,
            )
        if link.source_node_id == link.target_node_id:
            error(
                "SELF_LINK",
                f"Link '{link.id}' cannot connect a node to itself.",
                link_id=link.id,
            )
        edge = (link.source_node_id, link.target_node_id, link.kind.upper())
        if edge in seen_edges:
            warning(
                "DUPLICATE_LINK_EDGE",
                f"Link '{link.id}' duplicates another {link.kind} edge.",
                link_id=link.id,
            )
        seen_edges.add(edge)

        if source is not None and target is not None and link.kind.upper() in ROUTE_LINK_KINDS:
            source_subnet = subnet_by_id.get(source.subnet_id or "")
            target_subnet = subnet_by_id.get(target.subnet_id or "")
            if source_subnet and target_subnet:
                if source_subnet.internal != target_subnet.internal:
                    internal_subnet = (
                        source_subnet if source_subnet.internal else target_subnet
                    )
                    mediated = _flag(
                        (source.config or {}).get("firewall")
                    ) or _flag((target.config or {}).get("firewall"))
                    if not mediated:
                        error(
                            "AIRGAP_ROUTE",
                            f"Link '{link.id}' exposes air-gapped subnet "
                            f"'{internal_subnet.id}' to WAN without a firewall mediator.",
                            link_id=link.id,
                            subnet_id=internal_subnet.id,
                        )

        if link.kind.upper() == "ATTACK":
            payload = str((link.config or {}).get("payload_hex") or "")
            if payload and (
                len(payload) % 2 != 0 or not _HEX_RE.fullmatch(payload)
            ):
                warning(
                    "INVALID_ATTACK_PAYLOAD",
                    f"Link '{link.id}' payload_hex must be an even-length hex string.",
                    link_id=link.id,
                )

    # --- softer operational warnings -------------------------------------
    if not any(node.type == "ADVERSARY_NODE" for node in nodes):
        warning("NO_ADVERSARY", "No ADVERSARY_NODE is present in this scenario.")
    if not any(link.kind.upper() == "ATTACK" for link in links):
        warning("NO_ATTACK_LINK", "No ATTACK link is configured in this scenario.")
    for subnet in subnets:
        if subnet_by_id.get(subnet.id) and not any(
            node.subnet_id == subnet.id for node in nodes
        ):
            warning(
                "EMPTY_SUBNET",
                f"Subnet '{subnet.id}' has no containers attached.",
                subnet_id=subnet.id,
            )

    errors = [item for item in issues if item.severity == "error"]
    if errors:
        return None, issues

    document = _compile_document(
        scenario_id=scenario_id,
        name=name,
        target_sector=target_sector,
        description=description,
        subnets=subnets,
        nodes=nodes,
        links=links,
    )
    return yaml.safe_dump(document, sort_keys=False, allow_unicode=True), issues


# ---------------------------------------------------------------------------
# Bundle generation
# ---------------------------------------------------------------------------
def bundle_root() -> Path:
    return Path(settings.MATRIX_SCENARIO_DIR)


def artifact_name_for(scenario_id: str, name: str) -> str:
    """Human-friendly ``scenario_<name>.tar.gz`` with stable id fallback."""
    stem = (
        (slugify(name) or slugify(scenario_id) or "scenario")
        .replace("-", "_")[:96]
        .strip("_")
    )
    return f"scenario_{stem or 'scenario'}.tar.gz"


def build_bundle(
    *,
    scenario_id: str,
    name: str,
    target_sector: str,
    description: str,
    subnets: list[ScenarioSubnet],
    nodes: list[ScenarioNode],
    links: list[ScenarioLink],
    compiled_yaml: str,
) -> tuple[bytes, dict[str, Any]]:
    """Build a ``.tar.gz`` with stable archive metadata and supporting assets."""
    digest = hashlib.sha256(compiled_yaml.encode("utf-8")).hexdigest()
    manifest = {
        "apiVersion": "aryorithm.io/v1",
        "kind": "MatrixScenario",
        "scenario_id": scenario_id,
        "name": name,
        "target_sector": target_sector,
        "description": description,
        "subnets": [item.model_dump() for item in subnets],
        "nodes": [item.model_dump() for item in nodes],
        "links": [item.model_dump() for item in links],
        "compiled_sha256": digest,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cli_load_command": f"aryo matrix scenario load {scenario_id}",
    }
    readme = (
        f"# {name}\n\n"
        f"Scenario id: `{scenario_id}`\n"
        f"Target sector: `{target_sector}`\n\n"
        "Compiled by the Aryorithm Scenario Graph Studio.\n\n"
        "## Load\n\n"
        f"```bash\naryo matrix scenario load {scenario_id}\n```\n\n"
        "The archive contains `scenario.yaml`, `manifest.json` and this README.\n"
    )
    files = (
        ("scenario.yaml", compiled_yaml.encode("utf-8")),
        ("manifest.json", json.dumps(manifest, indent=2).encode("utf-8")),
        ("README.md", readme.encode("utf-8")),
    )
    out = io.BytesIO()
    # Stable archive metadata keeps the tar/gzip wrapper deterministic.
    with gzip.GzipFile(fileobj=out, mode="wb", mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode="w") as archive:
            for filename, payload in files:
                info = tarfile.TarInfo(name=filename)
                info.size = len(payload)
                info.mtime = 0
                info.uid = 0
                info.gid = 0
                info.uname = ""
                info.gname = ""
                archive.addfile(info, io.BytesIO(payload))
    return out.getvalue(), manifest


# ---------------------------------------------------------------------------
# Hub registration
# ---------------------------------------------------------------------------
async def resolve_hub_slug(
    db,
    *,
    scenario_id: str,
    stored_slug: str | None,
    tenant_id: str,
) -> str:
    """Choose a globally unique Hub slug without cross-tenant overwrites."""
    from sqlalchemy import select

    from app.models.hub import HubScenario
    from app.models.hub_assets import HubAssetMeta

    if stored_slug:
        return stored_slug

    existing = (
        await db.execute(select(HubScenario).where(HubScenario.slug == scenario_id))
    ).scalar_one_or_none()
    if existing is None:
        return scenario_id

    meta = (
        await db.execute(
            select(HubAssetMeta).where(
                HubAssetMeta.asset_type == "scenario",
                HubAssetMeta.slug == scenario_id,
            )
        )
    ).scalar_one_or_none()
    if meta is not None and meta.tenant_id == tenant_id:
        return scenario_id

    prefix = (tenant_id or "tenant").replace("-", "")[:8]
    candidate = f"{prefix}-{scenario_id}"
    counter = 2
    while True:
        hub_exists = (
            await db.execute(
                select(HubScenario).where(HubScenario.slug == candidate)
            )
        ).scalar_one_or_none()
        meta_exists = (
            await db.execute(
                select(HubAssetMeta).where(
                    HubAssetMeta.asset_type == "scenario",
                    HubAssetMeta.slug == candidate,
                )
            )
        ).scalar_one_or_none()
        if hub_exists is None and meta_exists is None:
            return candidate
        candidate = f"{prefix}-{scenario_id}-{counter}"
        counter += 1


async def register_hub_scenario(
    db,
    *,
    scenario_id: str,
    hub_slug: str,
    tenant_id: str,
    owner_user_id: str,
    author: str,
    name: str,
    target_sector: str,
    description: str,
    subnets: list[ScenarioSubnet],
    nodes: list[ScenarioNode],
    links: list[ScenarioLink],
    bundle: bytes,
    artifact_name: str,
) -> str:
    """Write the bundle into the Hub scenario vault and upsert its catalog row."""
    from sqlalchemy import select

    from app.models.hub import HubScenario, ScenarioComplexity
    from app.models.hub_assets import HubAssetMeta
    from app.services import hub_library as lib

    slug = hub_slug
    dest = lib.vault_root("scenarios") / slug / artifact_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(bundle)
    digest = hashlib.sha256(bundle).hexdigest()

    first_subnet = next(
        (
            subnet.cidr
            for subnet in subnets
            if ":" not in subnet.cidr and len(subnet.cidr) <= 32
        ),
        "10.240.0.0/24",
    )
    complexity = ScenarioComplexity.INTERMEDIATE
    if "CRITICAL" in target_sector.upper() or len(nodes) >= 8:
        complexity = ScenarioComplexity.ADVANCED_RED_TEAM
    elif len(nodes) <= 1 and len(subnets) <= 1:
        complexity = ScenarioComplexity.STARTER

    node_topology = {
        node.id: {
            "name": node.name,
            "type": node.type,
            "subnet": node.subnet_id,
            "ip": node.ip,
            "ports": list(node.ports),
        }
        for node in nodes
    }
    attacks = list(
        dict.fromkeys(
            (
                str((link.config or {}).get("vector") or link.protocol or link.label)
                or link.kind
            ).strip()
            for link in links
            if link.kind.upper() == "ATTACK"
        )
    )
    technical_walkthrough = (
        "Packed from the Aryorithm Scenario Graph Studio. "
        f"{len(subnets)} subnets, {len(nodes)} containers, {len(links)} links."
    )
    manifest = {
        "name": name,
        "slug": slug,
        "version": "1.0.0",
        "asset_type": "scenario",
        "complexity": complexity.value,
        "target_sector": target_sector,
        "network_subnet": first_subnet,
        "node_topology": node_topology,
        "replayed_attacks": attacks,
        "expected_mitigation_sla": (
            "Validated air-gap topology · scenario engine ready"
        ),
    }
    row = (
        await db.execute(select(HubScenario).where(HubScenario.slug == slug))
    ).scalar_one_or_none()
    values = dict(
        name=name,
        complexity=complexity,
        target_sector=target_sector,
        network_subnet=first_subnet,
        node_topology=node_topology,
        replayed_attacks=attacks,
        expected_mitigation_sla=manifest["expected_mitigation_sla"],
        file_name=artifact_name,
        file_size_bytes=len(bundle),
        sha256_checksum=digest,
        cli_pull_command=f"aryo matrix scenario load {slug}",
        short_description=description or name,
        technical_walkthrough=technical_walkthrough,
        artifact_path=str(dest.relative_to(lib.vault_root("scenarios"))),
    )
    if row is None:
        row = HubScenario(id=f"scenario-{slug}", slug=slug, **values)
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)

    meta = (
        await db.execute(
            select(HubAssetMeta).where(
                HubAssetMeta.asset_type == "scenario",
                HubAssetMeta.slug == slug,
            )
        )
    ).scalar_one_or_none()
    if meta is None:
        meta = HubAssetMeta(asset_type="scenario", slug=slug, signature="", public_key="")
        db.add(meta)
    meta.signature = ""
    meta.public_key = ""
    meta.sha256 = digest
    meta.file_name = artifact_name
    meta.version = "1.0.0"
    meta.tier = "scenario"
    meta.author = author
    meta.industry = target_sector
    meta.compliance = []
    meta.manifest = manifest
    meta.readme_markdown = technical_walkthrough
    meta.owner_user_id = owner_user_id
    meta.tenant_id = tenant_id
    meta.visibility = "public"
    meta.yanked = False
    meta.orphaned_root = False
    meta.deleted_at = None
    await db.flush()
    return f"/api/v1/hub/scenarios/{slug}/download"
