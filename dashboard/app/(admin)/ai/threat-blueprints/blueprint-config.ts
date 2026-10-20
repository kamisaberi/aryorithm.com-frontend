import type {
  BlueprintEdge,
  BlueprintNode,
  CatalogNode,
  NodeCatalog,
} from "@/lib/backend";

/* --------------------------------------------------------------------------
 * Canvas geometry
 * ------------------------------------------------------------------------ */
export const STAGE_W = 1900;
export const STAGE_H = 1000;
export const NODE_W = 224;
export const NODE_HEADER_H = 52;
export const PORT_START_Y = 76;
export const PORT_GAP = 30;
export const GRID_SIZE = 20;
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 1.6;

export interface PortSpec {
  name: string;
  socket_type: string;
  color?: string;
  required?: boolean;
  accepts?: string[];
}

export interface NodeSpec {
  stage: number;
  category?: string;
  label?: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
}

export const UNKNOWN_SPEC: NodeSpec = {
  stage: 0,
  inputs: [],
  outputs: [],
};

/** Fallback specs keep saved graphs rendering while the catalog request is in flight. */
export const FALLBACK_NODE_SPECS: Record<string, NodeSpec> = {
  SENSOR_INGRESS: {
    stage: 1,
    category: "INGRESS",
    label: "Ingress sensor",
    inputs: [],
    outputs: [{ name: "out", socket_type: "PACKET_STREAM" }],
  },
  SPKG_REFLEX_GATE: {
    stage: 2,
    category: "REFLEX_GUARD",
    label: "Reflex guard",
    inputs: [{ name: "in", socket_type: "PACKET_STREAM" }],
    outputs: [
      { name: "pass", socket_type: "PASS" },
      { name: "drop", socket_type: "MITIGATION" },
    ],
  },
  SILICON_MODEL: {
    stage: 3,
    category: "SILICON_MODEL",
    label: "Silicon model",
    inputs: [
      {
        name: "in",
        socket_type: "FEATURE_TENSOR",
        accepts: ["PASS", "FEATURE_TENSOR"],
      },
    ],
    outputs: [
      { name: "pass", socket_type: "FEATURE_TENSOR" },
      { name: "anomaly", socket_type: "MITIGATION" },
    ],
  },
  CROSS_MODAL_FUSION: {
    stage: 4,
    category: "FUSION",
    label: "Cross-modal fusion",
    inputs: [
      {
        name: "cyber_in",
        socket_type: "FEATURE_TENSOR",
        accepts: ["PASS", "FEATURE_TENSOR"],
      },
      {
        name: "physical_in",
        socket_type: "PHYSICAL_TELEMETRY",
        required: false,
      },
    ],
    outputs: [
      { name: "pass", socket_type: "FEATURE_TENSOR" },
      { name: "breach", socket_type: "MITIGATION" },
    ],
  },
  ACTION_KERNEL_DROP: {
    stage: 5,
    category: "MITIGATION",
    label: "Mitigation action",
    inputs: [{ name: "in", socket_type: "MITIGATION" }],
    outputs: [],
  },
};

export const STAGE_COLORS: Record<number, string> = {
  1: "#94A3B8",
  2: "#10B981",
  3: "#22D3EE",
  4: "#A78BFA",
  5: "#F43F5E",
};

export const SOCKET_COLORS: Record<string, string> = {
  PACKET_STREAM: "#94A3B8",
  FEATURE_TENSOR: "#22D3EE",
  PASS: "#10B981",
  MITIGATION: "#F43F5E",
  PHYSICAL_TELEMETRY: "#A78BFA",
};

export const SOCKET_COMPATIBILITY: Record<string, string[]> = {
  PACKET_STREAM: ["PACKET_STREAM"],
  FEATURE_TENSOR: ["FEATURE_TENSOR", "PASS"],
  PASS: ["PASS", "FEATURE_TENSOR", "PACKET_STREAM"],
  MITIGATION: ["MITIGATION"],
  PHYSICAL_TELEMETRY: ["PHYSICAL_TELEMETRY"],
};

export const TYPE_ICONS: Record<string, string> = {
  SENSOR_INGRESS: "◉",
  SPKG_REFLEX_GATE: "⌘",
  SILICON_MODEL: "⬡",
  CROSS_MODAL_FUSION: "⇄",
  ACTION_KERNEL_DROP: "⊘",
};

export function getNodeSpec(
  catalogByType: Record<string, CatalogNode>,
  type: string
): NodeSpec {
  return catalogByType[type] ?? FALLBACK_NODE_SPECS[type] ?? UNKNOWN_SPEC;
}

export function nodeHeight(spec: NodeSpec): number {
  const portRows = Math.max(spec.inputs.length, spec.outputs.length, 1);
  return PORT_START_Y + portRows * PORT_GAP + 8;
}

export function portCenter(
  node: BlueprintNode,
  portName: string,
  side: "in" | "out",
  spec: NodeSpec
): { x: number; y: number } {
  const ports = side === "in" ? spec.inputs : spec.outputs;
  const index = Math.max(
    ports.findIndex((port) => port.name === portName),
    0
  );
  return {
    x: side === "out" ? node.position.x + NODE_W : node.position.x,
    y: node.position.y + PORT_START_Y + index * PORT_GAP,
  };
}

/** Cubic bezier between two sockets, flowing left-to-right. */
export function wirePath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): string {
  const distance = Math.max(Math.abs(to.x - from.x) * 0.48, 54);
  return `M ${from.x} ${from.y} C ${from.x + distance} ${from.y}, ${
    to.x - distance
  } ${to.y}, ${to.x} ${to.y}`;
}

/* --------------------------------------------------------------------------
 * Inspector forms
 * ------------------------------------------------------------------------ */
export type ConfigFieldType = "text" | "number" | "select";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  step?: string;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
}

export const CONFIG_FIELDS: Record<string, ConfigField[]> = {
  SENSOR_INGRESS: [
    { key: "sensor_id", label: "Sensor ID", type: "text" },
    {
      key: "transport",
      label: "Transport",
      type: "select",
      options: [
        { value: "mirror", label: "AF_PACKET mirror" },
        { value: "tcp", label: "TCP listener" },
        { value: "udp", label: "UDP listener" },
      ],
    },
    { key: "interface", label: "Interface", type: "text" },
    { key: "port", label: "Port", type: "number", placeholder: "502" },
  ],
  SPKG_REFLEX_GATE: [
    { key: "package_id", label: "SPKG package", type: "text" },
    {
      key: "tier",
      label: "Execution tier",
      type: "select",
      options: [
        { value: "NATIVE_CPP", label: "Native C++20" },
        { value: "LUAJIT", label: "LuaJIT" },
        { value: "WASM3_RUST", label: "Rust Wasm3" },
      ],
    },
    {
      key: "latency_sla_ns",
      label: "Latency SLA (ns)",
      type: "number",
      placeholder: "88",
    },
  ],
  SILICON_MODEL: [
    { key: "model_id", label: "Model artefact", type: "text" },
    {
      key: "silicon_target",
      label: "Silicon target",
      type: "select",
      options: [
        { value: "INTEL_OPENVINO", label: "Intel OpenVINO" },
        { value: "NVIDIA_TENSORRT", label: "NVIDIA TensorRT" },
        { value: "ROCKCHIP_RKNN", label: "Rockchip RKNN" },
        { value: "HAILO_8", label: "Hailo-8" },
        { value: "QUALCOMM_QNN", label: "Qualcomm QNN" },
      ],
    },
    {
      key: "precision",
      label: "Precision",
      type: "select",
      options: [
        { value: "INT8", label: "INT8" },
        { value: "FP16", label: "FP16" },
        { value: "FP32", label: "FP32" },
      ],
    },
    {
      key: "threshold_drop",
      label: "Anomaly threshold",
      type: "number",
      step: "0.01",
      placeholder: "0.85",
      hint: "Normalized score above which the anomaly socket fires.",
    },
  ],
  CROSS_MODAL_FUSION: [
    { key: "correlation_id", label: "Correlation ID", type: "text" },
    { key: "cyber_sensor_id", label: "Cyber sensor", type: "text" },
    { key: "physical_sensor_id", label: "Physical probe", type: "text" },
    {
      key: "physical_min_temp",
      label: "Physical min temp (°C)",
      type: "number",
      step: "0.1",
      placeholder: "120",
    },
  ],
  ACTION_KERNEL_DROP: [
    {
      key: "action",
      label: "Mitigation action",
      type: "select",
      options: [
        { value: "KERNEL_DROP_AND_ISOLATE", label: "Kernel drop + isolate" },
        { value: "GRPC_FLEET_BROADCAST", label: "gRPC fleet broadcast" },
        {
          value: "PHYSICAL_ACTUATOR_DISCONNECT",
          label: "Physical actuator disconnect",
        },
      ],
    },
  ],
};

/* --------------------------------------------------------------------------
 * Local graph pre-checks (the backend compile remains authoritative)
 * ------------------------------------------------------------------------ */
export interface GraphCheck {
  ok: boolean;
  label: string;
  detail: string;
}

export function localGraphChecks(
  nodes: BlueprintNode[],
  edges: BlueprintEdge[],
  catalogByType: Record<string, CatalogNode>
): GraphCheck[] {
  if (nodes.length === 0) {
    return [
      {
        ok: false,
        label: "Graph topology",
        detail: "No nodes placed",
      },
    ];
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const checks: GraphCheck[] = [
    {
      ok: true,
      label: "Graph topology",
      detail: `${nodes.length} nodes / ${edges.length} wires`,
    },
  ];

  let requiredInputs = 0;
  let missingInputs = 0;
  for (const node of nodes) {
    const spec = getNodeSpec(catalogByType, node.type);
    for (const port of spec.inputs) {
      if (port.required === false) continue;
      requiredInputs += 1;
      const connected = edges.some(
        (edge) =>
          edge.target_node === node.id && edge.target_port === port.name
      );
      if (!connected) missingInputs += 1;
    }
  }
  checks.push({
    ok: missingInputs === 0,
    label: "Required inputs",
    detail:
      missingInputs === 0
        ? `${requiredInputs}/${requiredInputs} connected`
        : `${missingInputs} missing`,
  });

  let invalidWires = 0;
  for (const edge of edges) {
    const source = nodeMap.get(edge.source_node);
    const target = nodeMap.get(edge.target_node);
    if (!source || !target) {
      invalidWires += 1;
      continue;
    }
    const sourceSpec = getNodeSpec(catalogByType, source.type);
    const targetSpec = getNodeSpec(catalogByType, target.type);
    const sourcePort = sourceSpec.outputs.find(
      (port) => port.name === edge.source_port
    );
    const targetPort = targetSpec.inputs.find(
      (port) => port.name === edge.target_port
    );
    if (!sourcePort || !targetPort) {
      invalidWires += 1;
      continue;
    }
    const compatible =
      SOCKET_COMPATIBILITY[sourcePort.socket_type]?.includes(
        targetPort.socket_type
      ) ?? sourcePort.socket_type === targetPort.socket_type;
    if (!compatible) invalidWires += 1;
  }
  checks.push({
    ok: invalidWires === 0,
    label: "Socket compatibility",
    detail:
      invalidWires === 0
        ? `${edges.length}/${edges.length} wires valid`
        : `${invalidWires} invalid`,
  });

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const children = adjacency.get(edge.source_node) ?? [];
    children.push(edge.target_node);
    adjacency.set(edge.source_node, children);
  }
  const state = new Map<string, 0 | 1 | 2>();
  let cycle = false;
  const visit = (nodeId: string): boolean => {
    state.set(nodeId, 1);
    for (const child of adjacency.get(nodeId) ?? []) {
      const childState = state.get(child) ?? 0;
      if (childState === 1) return true;
      if (childState === 0 && visit(child)) return true;
    }
    state.set(nodeId, 2);
    return false;
  };
  for (const node of nodes) {
    if ((state.get(node.id) ?? 0) === 0 && visit(node.id)) {
      cycle = true;
      break;
    }
  }
  checks.push({
    ok: !cycle,
    label: "Cycle check",
    detail: cycle ? "Directed cycle detected" : "Acyclic DAG",
  });

  const unknownTypes = nodes.filter(
    (node) =>
      !catalogByType[node.type] && !FALLBACK_NODE_SPECS[node.type]
  ).length;
  checks.push({
    ok: unknownTypes === 0,
    label: "Node catalog",
    detail:
      unknownTypes === 0
        ? "All node types resolved"
        : `${unknownTypes} unknown type(s)`,
  });

  return checks;
}

/* --------------------------------------------------------------------------
 * Example blueprint + utilities
 * ------------------------------------------------------------------------ */
const EXAMPLE_FALLBACK_CONFIG: Record<string, Record<string, unknown>> = {
  ingress_nic_mirror: {
    sensor_id: "NIC-Mirror-01",
    transport: "mirror",
    interface: "ens160",
  },
  reflex_native_cpp: {
    package_id: "org.aryorithm.package.modbus_actuator_guard",
    tier: "NATIVE_CPP",
    latency_sla_ns: 88,
  },
  ai_openvino_mae: {
    model_id: "network_threat_int8.onnx",
    silicon_target: "INTEL_OPENVINO",
    precision: "INT8",
    threshold_drop: 0.85,
  },
  fusion_stuxnet_blinding: {
    correlation_id: "STUXNET_THERMAL_BLINDING",
    cyber_sensor_id: "Substation-Modbus-01",
    physical_sensor_id: "Thermal-Probe-101",
    physical_min_temp: 120,
  },
  action_kernel_drop: { action: "KERNEL_DROP_AND_ISOLATE" },
};

export interface ExampleBlueprint {
  name: string;
  description: string;
  targetSites: string[];
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export function buildExampleBlueprint(
  catalog: NodeCatalog | null
): ExampleBlueprint {
  const item = (catalogId: string) =>
    catalog?.nodes.find((node) => node.catalog_id === catalogId);

  const makeNode = (
    id: string,
    catalogId: string,
    type: string,
    fallbackLabel: string,
    position: { x: number; y: number }
  ): BlueprintNode => {
    const catalogNode = item(catalogId);
    return {
      id,
      type,
      label: catalogNode?.label ?? fallbackLabel,
      position,
      config: {
        ...(catalogNode?.default_config ??
          EXAMPLE_FALLBACK_CONFIG[catalogId] ??
          {}),
      },
    };
  };

  return {
    name: "SCADA Anti-Blinding Interlock",
    description:
      "Reflex guard plus silicon MAE with cross-modal thermal fusion and in-kernel mitigation.",
    targetSites: ["Substation-A", "Plant-7"],
    nodes: [
      makeNode(
        "n_ingress",
        "ingress_nic_mirror",
        "SENSOR_INGRESS",
        "NIC Mirror Ingress",
        { x: 70, y: 310 }
      ),
      makeNode(
        "n_reflex",
        "reflex_native_cpp",
        "SPKG_REFLEX_GATE",
        "Native C++20 Reflex Guard",
        { x: 380, y: 250 }
      ),
      makeNode(
        "n_silicon",
        "ai_openvino_mae",
        "SILICON_MODEL",
        "OpenVINO Tabular MAE",
        { x: 690, y: 190 }
      ),
      makeNode(
        "n_fusion",
        "fusion_stuxnet_blinding",
        "CROSS_MODAL_FUSION",
        "Stuxnet Anti-Blinding Interlock",
        { x: 1000, y: 430 }
      ),
      makeNode(
        "n_action",
        "action_kernel_drop",
        "ACTION_KERNEL_DROP",
        "In-Kernel eBPF Drop",
        { x: 1320, y: 300 }
      ),
    ],
    edges: [
      {
        id: "e_ingress_reflex",
        source_node: "n_ingress",
        source_port: "out",
        target_node: "n_reflex",
        target_port: "in",
      },
      {
        id: "e_reflex_silicon",
        source_node: "n_reflex",
        source_port: "pass",
        target_node: "n_silicon",
        target_port: "in",
      },
      {
        id: "e_reflex_action",
        source_node: "n_reflex",
        source_port: "drop",
        target_node: "n_action",
        target_port: "in",
      },
      {
        id: "e_silicon_fusion",
        source_node: "n_silicon",
        source_port: "pass",
        target_node: "n_fusion",
        target_port: "cyber_in",
      },
      {
        id: "e_silicon_action",
        source_node: "n_silicon",
        source_port: "anomaly",
        target_node: "n_action",
        target_port: "in",
      },
      {
        id: "e_fusion_action",
        source_node: "n_fusion",
        source_port: "breach",
        target_node: "n_action",
        target_port: "in",
      },
    ],
  };
}

export function makeNode(
  item: CatalogNode,
  position: BlueprintNode["position"],
  index: number
): BlueprintNode {
  return {
    id: `node_${item.type.toLowerCase()}_${Date.now().toString(36)}_${index}_${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    type: item.type,
    label: item.label,
    position,
    config: { ...item.default_config },
  };
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function formatLatency(ns: number | null | undefined): string {
  if (ns === null || ns === undefined) return "—";
  if (ns >= 1_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  if (ns >= 1_000) {
    const micros = ns / 1_000;
    return `${micros.toFixed(micros >= 10 ? 0 : 1)} µs`;
  }
  return `${Math.round(ns)} ns`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // SQLite round-trips drop the timezone suffix; the backend stores UTC.
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function uniqueSites(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((site) => site.trim())
        .filter(Boolean)
    )
  );
}
