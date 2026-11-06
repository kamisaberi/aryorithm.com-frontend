import type {
  PurdueLevel,
  ScenarioGraphDetail,
  ScenarioGraphPayload,
  ScenarioLink,
  ScenarioNode,
  ScenarioPalette,
  ScenarioPaletteItem,
  ScenarioSubnet,
} from "@/lib/backend";

export const SECTOR_OPTIONS = [
  "CRITICAL_INFRASTRUCTURE",
  "ENERGY_AND_UTILITIES",
  "HEALTHCARE",
  "MANUFACTURING",
  "DEFENSE_AND_AEROSPACE",
  "MARITIME",
  "RESEARCH_AND_EDUCATION",
];

export const PURDUE_LEVELS: Array<{ value: PurdueLevel; label: string }> = [
  { value: 0, label: "Level 0 · Fieldbus" },
  { value: 1, label: "Level 1 · Control" },
  { value: 2, label: "Level 2 · Supervisory" },
  { value: 3, label: "Level 3 · Operations DMZ" },
  { value: 4, label: "Level 4 · Enterprise" },
];

export const STATUS_VARIANTS: Record<
  string,
  "muted" | "cyan" | "kernel" | "telemetry" | "threat"
> = {
  DRAFT: "muted",
  VALIDATED: "cyan",
  BUNDLED: "kernel",
  LAUNCHED: "telemetry",
  INVALID_TOPOLOGY: "threat",
};

export const CATEGORY_META: Record<
  string,
  { label: string; icon: string; accent: string; description: string }
> = {
  NETWORKS: {
    label: "Networks",
    icon: "▦",
    accent: "text-cyan",
    description: "Bridged and air-gapped L2 segments",
  },
  PLCS_AND_CONTROLLERS: {
    label: "PLCs & IEDs",
    icon: "▣",
    accent: "text-kernel",
    description: "Protocol simulators and physics twins",
  },
  FIELD_SENSORS: {
    label: "Field Sensors",
    icon: "◌",
    accent: "text-telemetry",
    description: "Modbus, LiDAR, power and RTSP feeds",
  },
  SIMULATION_ACTORS: {
    label: "Simulation Actors",
    icon: "✦",
    accent: "text-threat",
    description: "Red-team, traffic and Forge workers",
  },
};

export const FALLBACK_PALETTE: ScenarioPalette = {
  categories: [
    {
      category: "NETWORKS",
      items: [
        {
          type: "SUBNET_BRIDGE",
          label: "Bridged Subnet",
          default_subnet: "10.240.0.0/24",
          internal: false,
        },
        {
          type: "SUBNET_AIRGAP",
          label: "Air-Gapped Subnet",
          default_subnet: "10.150.10.0/24",
          internal: true,
          description: "Zero default route to WAN ($0.00 egress)",
        },
      ],
    },
    {
      category: "PLCS_AND_CONTROLLERS",
      items: [
        {
          type: "ARCHETYPE_PLC",
          label: "Modular Industrial PLC",
          protocols: ["MODBUS_TCP", "S7COMM"],
          default_ports: [502, 102],
          image: "sentinel-matrix/device-runtime:latest",
        },
        {
          type: "ARCHETYPE_IED",
          label: "Substation Protection Relay",
          protocols: ["IEC_104"],
          default_ports: [2404],
          image: "sentinel-matrix/device-runtime:latest",
        },
        {
          type: "MOCK_PLC_ODE",
          label: "Physics RK4 ODE Twin",
          protocols: ["MODBUS_TCP", "S7COMM", "IEC_104"],
          default_ports: [502, 102, 2404],
          image: "sentinel-matrix/mock-plc:latest",
        },
      ],
    },
    {
      category: "FIELD_SENSORS",
      items: [
        {
          type: "SENSOR_VIBRATION",
          label: "IFM Vibration Probe",
          default_port: 15502,
        },
        {
          type: "SENSOR_LIDAR",
          label: "SICK Spatial LiDAR",
          default_port: 2368,
        },
        {
          type: "SENSOR_POWER",
          label: "PAC3200 Power Meter",
          default_port: 15501,
        },
        {
          type: "SENSOR_CAMERA",
          label: "FLIR Thermal RTSP Stream",
          default_port: 8554,
        },
      ],
    },
    {
      category: "SIMULATION_ACTORS",
      items: [
        {
          type: "ADVERSARY_NODE",
          label: "Active Red-Team Attacker",
          image: "sentinel-matrix/adversary:latest",
          tools: ["nmap", "mbpoll", "pcap_replay"],
        },
        {
          type: "TRAFFIC_GENERATOR",
          label: "Wire Traffic Blaster",
          image: "sentinel-matrix/traffic-gen:latest",
        },
        {
          type: "GPU_FORGE_WORKER",
          label: "Private On-Prem Forge Worker",
          image: "sentinel-matrix/forge:latest",
        },
      ],
    },
  ],
};

export const NETWORK_TYPES = new Set(["SUBNET_BRIDGE", "SUBNET_AIRGAP"]);

export const CANVAS_PADDING = 24;
export const LANE_WIDTH = 300;
export const LANE_GAP = 24;
export const LANE_TOP = 52;
export const NODE_WIDTH = 252;
export const NODE_HEIGHT = 108;
export const NODE_GAP_Y = 128;

export type ScenarioSelection =
  | { kind: "subnet"; id: string }
  | { kind: "node"; id: string }
  | { kind: "link"; id: string }
  | null;

export interface ScenarioDraft extends ScenarioGraphPayload {
  scenario_id: string;
  status: string;
}

export function laneX(index: number): number {
  return CANVAS_PADDING + index * (LANE_WIDTH + LANE_GAP);
}

export function nodeX(subnetIndex: number): number {
  return laneX(subnetIndex) + (LANE_WIDTH - NODE_WIDTH) / 2;
}

export function nodeY(index: number): number {
  return LANE_TOP + 64 + index * NODE_GAP_Y;
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function slugify(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function paletteIndex(
  palette: ScenarioPalette
): Record<string, ScenarioPaletteItem> {
  const map: Record<string, ScenarioPaletteItem> = {};
  for (const category of palette.categories) {
    for (const item of category.items) map[item.type] = item;
  }
  return map;
}

export function allPaletteCategories(
  palette: ScenarioPalette
): ScenarioPalette["categories"] {
  return palette.categories.length > 0
    ? palette.categories
    : FALLBACK_PALETTE.categories;
}

export function defaultImage(item: ScenarioPaletteItem): string {
  return item.image || "sentinel-matrix/device-runtime:latest";
}

function hostPortFromMapping(value: string): number | null {
  const [hostRaw] = value.split(":");
  const host = Number(hostRaw);
  return Number.isInteger(host) && host >= 1 && host <= 65535 ? host : null;
}

function usedHostPorts(nodes: ScenarioNode[]): Set<number> {
  const used = new Set<number>();
  for (const node of nodes) {
    for (const mapping of node.ports) {
      const host = hostPortFromMapping(mapping);
      if (host !== null) used.add(host);
    }
  }
  return used;
}

export function defaultPorts(
  item: ScenarioPaletteItem,
  existingNodes: ScenarioNode[] = []
): string[] {
  const values: number[] = [];
  if (Array.isArray(item.default_ports)) {
    for (const value of item.default_ports) {
      if (typeof value === "number") values.push(value);
    }
  }
  if (typeof item.default_port === "number") values.push(item.default_port);
  const used = usedHostPorts(existingNodes);
  return values.map((containerPort) => {
    let hostPort = containerPort;
    while (used.has(hostPort) && hostPort < 65535) hostPort += 1;
    used.add(hostPort);
    return `${hostPort}:${containerPort}`;
  });
}

function defaultConfig(item: ScenarioPaletteItem): Record<string, unknown> {
  switch (item.type) {
    case "ARCHETYPE_PLC":
      return {
        slave_id: 1,
        registers: { "40001": "flow_rate", "40002": "pressure" },
      };
    case "ARCHETYPE_IED":
      return { asdu_address: 1, protection_stage: "overcurrent" };
    case "MOCK_PLC_ODE":
      return { physics_engine: "rk4", model: "chemical_dosing" };
    case "SENSOR_VIBRATION":
      return { stream: "vibration_rms", sample_hz: 128 };
    case "SENSOR_LIDAR":
      return { stream: "point_cloud", rotation_hz: 10 };
    case "SENSOR_POWER":
      return { stream: "power_quality", sample_hz: 50 };
    case "SENSOR_CAMERA":
      return { stream: "thermal_rtsp", codec: "h264" };
    case "ADVERSARY_NODE":
      return {
        tools: Array.isArray(item.tools) ? item.tools : ["nmap", "mbpoll"],
        methodology: "MITRE ICS ATT&CK",
      };
    case "TRAFFIC_GENERATOR":
      return { rate_pps: 500, protocol_mix: "MODBUS_TCP" };
    case "GPU_FORGE_WORKER":
      return { role: "private_forge_worker", gpu_count: 1 };
    case "SUBNET_BRIDGE":
    case "SUBNET_AIRGAP":
      return {};
    default:
      return {};
  }
}

function nextSubnetCidr(base: string, existing: ScenarioSubnet[]): string {
  const fallback = "10.150.10.0/24";
  const source = (base || fallback).split("/")[0];
  const parts = source.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return fallback;
  }
  const used = new Set(existing.map((item) => item.cidr));
  for (let offset = 0; offset < 200; offset += 1) {
    const third = Math.min(255, (parts[2] + offset) % 256);
    const candidate = `${parts[0]}.${parts[1]}.${third}.0/24`;
    if (!used.has(candidate)) return candidate;
  }
  return fallback;
}

function ipv4ToInt(value: string): number | null {
  const parts = value.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return (
    ((((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      parts[3]) >>>
      0)
  );
}

function intToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

function ipv4Network(
  cidr: string
): { network: number; broadcast: number; total: number } | null {
  const [address, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  const ip = ipv4ToInt(address);
  if (
    ip === null ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  ) {
    return null;
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { network, broadcast, total: broadcast - network + 1 };
}

function gatewayFor(cidr: string): string {
  const info = ipv4Network(cidr);
  if (!info) return "";
  return intToIpv4(info.total >= 4 ? info.network + 1 : info.network);
}

export function makeSubnet(
  item: ScenarioPaletteItem,
  existing: ScenarioSubnet[]
): ScenarioSubnet {
  const cidr = nextSubnetCidr(str(item.default_subnet), existing);
  const baseName = item.label || "Subnet";
  const duplicate = existing.filter((entry) => entry.name.startsWith(baseName));
  return {
    id: uid("net"),
    name:
      duplicate.length > 0 ? `${baseName} ${duplicate.length + 1}` : baseName,
    cidr,
    gateway: gatewayFor(cidr),
    internal: item.internal === true,
    purdue_level: item.internal === true ? 1 : 3,
  };
}

export function usedIps(nodes: ScenarioNode[], subnetId: string): Set<string> {
  const used = new Set<string>();
  for (const node of nodes) {
    if (node.subnet_id === subnetId && node.ip) used.add(node.ip);
  }
  return used;
}

export function nextAvailableIp(
  subnet: ScenarioSubnet | undefined,
  nodes: ScenarioNode[]
): string {
  if (!subnet) return "";
  const info = ipv4Network(subnet.cidr);
  if (!info || info.total <= 4) return "";
  const used = usedIps(nodes, subnet.id);
  const reservedGateway = intToIpv4(info.network + 1);
  const limit = Math.min(info.total - 1, 4096);
  const start = info.total > 16 ? 10 : 2;
  for (let offset = start; offset < limit; offset += 1) {
    const candidate = intToIpv4(info.network + offset);
    if (
      candidate !== subnet.gateway &&
      candidate !== reservedGateway &&
      !used.has(candidate)
    ) {
      return candidate;
    }
  }
  return "";
}

export function makeNode(
  item: ScenarioPaletteItem,
  subnets: ScenarioSubnet[],
  nodes: ScenarioNode[],
  position?: { x: number; y: number; subnetId?: string | null }
): ScenarioNode | null {
  if (NETWORK_TYPES.has(item.type)) return null;
  const preferred =
    (position?.subnetId
      ? subnets.find((subnet) => subnet.id === position.subnetId)
      : undefined) ?? subnets[0];
  if (!preferred) return null;
  const subnetIndex = subnets.findIndex((subnet) => subnet.id === preferred.id);
  const countInSubnet = nodes.filter(
    (node) => node.subnet_id === preferred.id
  ).length;
  const baseName = item.label || item.type;
  const duplicate = nodes.filter((node) => node.name.startsWith(baseName));
  return {
    id: uid("node"),
    name:
      duplicate.length > 0 ? `${baseName} ${duplicate.length + 1}` : baseName,
    type: item.type,
    subnet_id: preferred.id,
    ip: nextAvailableIp(preferred, nodes),
    image: defaultImage(item),
    protocols: Array.isArray(item.protocols) ? [...item.protocols] : [],
    ports: defaultPorts(item, nodes),
    config: defaultConfig(item),
    x: position?.x ?? nodeX(Math.max(0, subnetIndex)),
    y: position?.y ?? nodeY(countInSubnet),
  };
}

export function makeNodeAfterDrop(
  item: ScenarioPaletteItem,
  subnets: ScenarioSubnet[],
  nodes: ScenarioNode[],
  position: { x: number; y: number; subnetId?: string | null }
): ScenarioNode | null {
  return makeNode(item, subnets, nodes, position);
}

export function makeLink(
  sourceNodeId: string,
  targetNodeId: string,
  existing: ScenarioLink[]
): ScenarioLink {
  return {
    id: uid("link"),
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    kind: "ETHERNET",
    label: `Link ${existing.length + 1}`,
    protocol: "MODBUS_TCP",
    config: {},
  };
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function buildTemplateGraph(): ScenarioDraft {
  const subnets: ScenarioSubnet[] = [
    {
      id: "dmz_net",
      name: "Level 3 Operations DMZ",
      cidr: "192.168.10.0/24",
      gateway: "192.168.10.1",
      internal: false,
      purdue_level: 3,
    },
    {
      id: "scada_net",
      name: "Level 1 SCADA Control",
      cidr: "10.240.1.0/24",
      gateway: "10.240.1.1",
      internal: true,
      purdue_level: 1,
    },
    {
      id: "fieldbus_net",
      name: "Level 0 Process Fieldbus",
      cidr: "172.16.50.0/24",
      gateway: "172.16.50.1",
      internal: true,
      purdue_level: 0,
    },
  ];
  const nodes: ScenarioNode[] = [
    {
      id: "intake_plc",
      name: "Intake Pump PLC",
      type: "ARCHETYPE_PLC",
      subnet_id: "scada_net",
      ip: "10.240.1.10",
      image: "sentinel-matrix/device-runtime:latest",
      protocols: ["MODBUS_TCP", "S7COMM"],
      ports: ["502:502", "102:102"],
      config: {
        slave_id: 1,
        registers: {
          "40001": "flow_rate",
          "40002": "pressure",
          "40003": "pump_state",
        },
      },
      x: nodeX(1),
      y: nodeY(0),
    },
    {
      id: "chlorine_plc",
      name: "Chlorine Dosing ODE Twin",
      type: "MOCK_PLC_ODE",
      subnet_id: "fieldbus_net",
      ip: "172.16.50.20",
      image: "sentinel-matrix/mock-plc:latest",
      protocols: ["MODBUS_TCP", "S7COMM", "IEC_104"],
      ports: ["15501:502", "10201:102"],
      config: {
        physics_engine: "rk4",
        model: "chemical_dosing",
        reservoir_liters: 8000,
      },
      x: nodeX(2),
      y: nodeY(0),
    },
    {
      id: "vibration_probe",
      name: "IFM Vibration Probe",
      type: "SENSOR_VIBRATION",
      subnet_id: "fieldbus_net",
      ip: "172.16.50.30",
      image: "sentinel-matrix/device-runtime:latest",
      protocols: ["MODBUS_TCP"],
      ports: ["15502:15502"],
      config: { stream: "vibration_rms", sample_hz: 128 },
      x: nodeX(2),
      y: nodeY(1),
    },
    {
      id: "red_team",
      name: "Red Team Operator",
      type: "ADVERSARY_NODE",
      subnet_id: "scada_net",
      ip: "10.240.1.99",
      image: "sentinel-matrix/adversary:latest",
      protocols: [],
      ports: [],
      config: {
        tools: ["nmap", "mbpoll", "pcap_replay"],
        methodology: "MITRE ICS ATT&CK",
      },
      x: nodeX(1),
      y: nodeY(1),
    },
    {
      id: "historian_replay",
      name: "Historian Replay Blaster",
      type: "TRAFFIC_GENERATOR",
      subnet_id: "dmz_net",
      ip: "192.168.10.20",
      image: "sentinel-matrix/traffic-gen:latest",
      protocols: ["MODBUS_TCP"],
      ports: [],
      config: { rate_pps: 500, protocol_mix: "MODBUS_TCP" },
      x: nodeX(0),
      y: nodeY(0),
    },
  ];
  const links: ScenarioLink[] = [
    {
      id: "attack_fc05",
      source_node_id: "red_team",
      target_node_id: "intake_plc",
      kind: "ATTACK",
      label: "FC05 coil override",
      protocol: "MODBUS_TCP",
      config: {
        timestamp_sec: 30,
        vector: "modbus_unauthorized_coil_write",
        payload_hex: "00010000000601050064ff00",
      },
    },
    {
      id: "process_bus",
      source_node_id: "intake_plc",
      target_node_id: "chlorine_plc",
      kind: "ETHERNET",
      label: "Process bus",
      protocol: "MODBUS_TCP",
      config: {},
    },
    {
      id: "vibration_stream",
      source_node_id: "vibration_probe",
      target_node_id: "intake_plc",
      kind: "TELEMETRY",
      label: "Vibration stream",
      protocol: "MODBUS_TCP",
      config: {},
    },
    {
      id: "historian_mirror",
      source_node_id: "historian_replay",
      target_node_id: "chlorine_plc",
      kind: "TELEMETRY",
      label: "Historian mirror",
      protocol: "MODBUS_TCP",
      config: {},
    },
  ];
  return {
    scenario_id: "",
    name: "Water Treatment Alpha",
    target_sector: "CRITICAL_INFRASTRUCTURE",
    description:
      "Purdue water-treatment plant with Modbus coil injection, a physics ODE twin and an air-gapped control plane.",
    status: "DRAFT",
    subnets,
    nodes,
    links,
  };
}

export function buildBlankGraph(): ScenarioDraft {
  return {
    scenario_id: "",
    name: "Untitled Matrix Scenario",
    target_sector: "CRITICAL_INFRASTRUCTURE",
    description: "",
    status: "DRAFT",
    subnets: [],
    nodes: [],
    links: [],
  };
}

export function draftFromDetail(detail: ScenarioGraphDetail): ScenarioDraft {
  return {
    scenario_id: detail.scenario_id,
    name: detail.name,
    target_sector: detail.target_sector,
    description: detail.description,
    status: detail.status,
    subnets: detail.subnets.map((item) => ({ ...item })),
    nodes: detail.nodes.map((item) => ({ ...item })),
    links: detail.links.map((item) => ({ ...item })),
  };
}

export function payloadFromDraft(draft: ScenarioDraft): ScenarioGraphPayload {
  return {
    scenario_id: draft.scenario_id || undefined,
    name: draft.name,
    target_sector: draft.target_sector,
    description: draft.description,
    subnets: draft.subnets,
    nodes: draft.nodes,
    links: draft.links,
  };
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function listText(value: string[] | undefined): string {
  return (value ?? []).join(", ");
}

export function parseListText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function portsText(value: string[] | undefined): string {
  return listText(value);
}

export function parsePortsText(value: string): string[] {
  return parseListText(value);
}

export function configText(value: Record<string, unknown>): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export function parseConfigText(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed: unknown = JSON.parse(value);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function nodeTypeLabel(
  palette: ScenarioPalette,
  type: string
): string {
  for (const category of allPaletteCategories(palette)) {
    for (const item of category.items) {
      if (item.type === type) return item.label;
    }
  }
  return type;
}

export function categoryForType(
  palette: ScenarioPalette,
  type: string
): string {
  for (const category of allPaletteCategories(palette)) {
    if (category.items.some((item) => item.type === type)) {
      return category.category;
    }
  }
  return "SIMULATION_ACTORS";
}

// Keep the helper referenced so downstream code can import a stable string
// transform without duplicating it in the page.
export function sanitizeName(value: unknown, fallback = ""): string {
  return str(value, fallback);
}

export function sanitizeList(value: unknown): string[] {
  return list(value);
}
