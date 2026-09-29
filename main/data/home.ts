import type { TelemetryMetric, EdgeNode, CliCommand } from "@/types/telemetry";

export const EDGE_NODES: EdgeNode[] = [
  { id: "substation-plc", label: "Substation PLC", short: "PLC", angle: -90, proto: "IEC 61850 / GOOSE", site: "Substation-North", color: "#00FFA3" },
  { id: "hospital-pacs", label: "Hospital PACS", short: "PACS", angle: -18, proto: "DICOM / HL7 FHIR", site: "Hospital-PACS-01", color: "#00E5FF" },
  { id: "naval-edge", label: "Naval Vessel Edge", short: "NAVAL", angle: 54, proto: "MIL-STD-1553B", site: "Naval-Vessel-04", color: "#FFB800" },
  { id: "industrial-scada", label: "Industrial SCADA", short: "SCADA", angle: 126, proto: "Modbus/TCP · S7comm", site: "SCADA-Plant-09", color: "#00FFA3" },
  { id: "enterprise-enclave", label: "Enterprise Enclave", short: "ENCL", angle: 198, proto: "Kerberos / LDAPS", site: "Enclave-HQ-02", color: "#00E5FF" },
];

export const TELEMETRY: TelemetryMetric[] = [
  { id: "wire-sla", label: "Wire Mitigation SLA", target: 0.84, suffix: " µs", decimals: 2, color: "#00FFA3", note: "Sub-millisecond kernel driver drop.", tag: "XDP_DROP", bar: 4 },
  { id: "node-throughput", label: "Single-Node Throughput", target: 1250000, suffix: " EPS", decimals: 0, color: "#00E5FF", note: "Packets inspected per second via AF_XDP.", tag: "AF_XDP", bar: 92 },
  { id: "silicon-targets", label: "Supported Silicon Targets", target: 15, suffix: " Architectures", decimals: 0, color: "#FFB800", note: "Zero-copy heterogeneous runtime.", tag: "libxinfer", bar: 100 },
  { id: "cloud-egress", label: "Cloud Egress Footprint", target: 0, prefix: "$", suffix: "", decimals: 2, color: "#F0F4F8", note: "100% local air-gapped processing.", tag: "AIR-GAP", bar: 0 },
];

export interface DivideRow {
  dimension: string;
  legacy: string;
  aryorithm: string;
}

export const DIVIDE_ROWS: DivideRow[] = [
  { dimension: "Mitigation Latency", legacy: "15.0 – 60.0 Seconds", aryorithm: "< 0.84 Microseconds (< 1.0 µs)" },
  { dimension: "Mitigation Point", legacy: "Post-execution passive alerting / tickets", aryorithm: "Pre-stack driver drop (XDP_DROP in eBPF)" },
  { dimension: "Network Egress", legacy: "Terabytes of uncompressed NetFlow to Cloud", aryorithm: "0 Egress (Local feature vectors only)" },
  { dimension: "Machine Trust", legacy: "Ephemeral software tokens / spoofable MACs", aryorithm: "Physical TPM 2.0 Silicon Attestation Quote" },
  { dimension: "Runtime Dependencies", legacy: "Python, JVM, Docker daemon, external CDNs", aryorithm: "Native C++20, zero managed dependencies, air-gapped UI" },
];

export interface CloudStage {
  label: string;
  detail: string;
  at: number;
}

export const CLOUD_STAGES: CloudStage[] = [
  { label: "Packet Buffering", detail: "libpcap ring copy → userspace collector", at: 1.2 },
  { label: "WAN Cloud Egress", detail: "TLS tunnel · 412 MB NetFlow uploaded", at: 5.0 },
  { label: "Ingestion Queue", detail: "Kafka partition backlog · 18,400 events", at: 14.0 },
  { label: "Lucene/Elastic Indexing", detail: "Shard merge + correlation rule eval", at: 21.5 },
  { label: "Ticket Created", detail: "SOAR case #INC-44871 assigned Tier-1", at: 28.0 },
  { label: "Manual Action", detail: "Analyst pushes ACL to upstream firewall", at: 41.6 },
];

export interface AryStage {
  label: string;
  us: number;
}

export const ARY_STAGES: AryStage[] = [
  { label: "NIC Driver Ring Arrival", us: 0.0 },
  { label: "eBPF Classifier Hook", us: 0.21 },
  { label: "libxinfer Verdict", us: 0.58 },
  { label: "XDP_DROP Executed", us: 0.84 },
];

export interface EcoTier {
  id: string;
  tier: string;
  name: string;
  product: string;
  color: string;
  summary: string;
  stats: [string, string][];
  detail: string[];
}

export const ECO_TIERS: EcoTier[] = [
  {
    id: "tier-orchestration",
    tier: "TIER 6",
    name: "The Orchestration Plane",
    product: "Sentinel Nexus",
    color: "#00E5FF",
    summary: "Sub-50ms collective immunity fanout, automated canary rollouts, and multi-site compliance auditing.",
    stats: [["Fanout SLA", "< 50 ms"], ["Managed Nodes", "1,482"], ["Canary Waves", "4-stage"]],
    detail: [
      "Collective immunity fanout: a verdict produced on any single appliance is cryptographically signed and broadcast over gRPC bidirectional streams to the entire fleet in under 50 milliseconds — one node's exposure becomes every node's antibody.",
      "Automated canary rollouts promote new detection policy through a 4-stage wave (1% → 5% → 25% → 100%) with amber telemetry gating and instant kernel-level rollback on false-positive drift.",
      "Multi-site compliance auditing continuously reconciles TPM 2.0 attestation quotes, binary hashes and policy generations across every enclave, exporting immutable IEC 62443 and NIS2 evidence bundles.",
    ],
  },
  {
    id: "tier-edge",
    tier: "TIER 3",
    name: "The Edge Guardian",
    product: "Blackbox Sentinel",
    color: "#00FFA3",
    summary: "Dual hardware/virtual appliance, 26 decoupled native modules, and 30 SCADA/medical protocol dissectors.",
    stats: [["Form Factors", "HW + Virtual"], ["Subsystems", "26 Modules"], ["Dissectors", "30 Protocols"]],
    detail: [
      "Dual deployment: a fanless DIN-rail hardware appliance rated for substation and shipboard thermal envelopes, plus a byte-identical virtual image for hypervisor-based enclaves — one policy artefact, both targets.",
      "26 decoupled native subsystems (capture, dissection, baselining, inference, mitigation, attestation, evidence, forwarder, and more) run as isolated C++20 processes; any module can crash or be upgraded without dropping wire protection.",
      "30 SCADA and medical protocol dissectors including Modbus/TCP, DNP3, IEC 61850 GOOSE/MMS, S7comm, EtherNet/IP CIP, BACnet, DICOM, HL7 FHIR and MIL-STD-1553B bridging — parsed deterministically with zero heap churn.",
    ],
  },
  {
    id: "tier-foundation",
    tier: "TIERS 1 & 2",
    name: "The Embedded Foundation",
    product: "xInfer & Blackbox Core",
    color: "#FFB800",
    summary: "C++20 zero-copy runtime across 15 hardware targets and wire-speed eBPF driver filter.",
    stats: [["Silicon Targets", "15"], ["Copy Overhead", "Zero-copy"], ["Filter Point", "NIC Driver"]],
    detail: [
      "libxinfer compiles one model graph to 15 heterogeneous silicon backends — x86-64 AVX-512, ARM64 NEON/SVE, NVIDIA CUDA & Jetson, AMD ROCm, Intel oneAPI, Hailo-8, Google Edge TPU, Rockchip NPU, Qualcomm Hexagon, RISC-V vector, and FPGA soft cores — with a single zero-copy tensor arena.",
      "Blackbox Core anchors mitigation in the NIC driver: eBPF classifiers attached at the XDP hook evaluate compiled feature vectors and execute XDP_DROP before the kernel allocates an sk_buff, sustaining 1,250,000 EPS per node via AF_XDP zero-copy sockets.",
      "xInfer Forge handles quantisation, operator fusion, deterministic latency profiling and signed artefact packaging, so every deployed model carries a reproducible SHA-256 provenance chain and a proven worst-case inference budget.",
    ],
  },
];

export const CLI_COMMANDS: Record<string, CliCommand> = {
  "nexus-ctl fleet list": {
    label: "fleet list",
    hint: "Enumerate attested appliances",
    lines: [
      { t: "Resolving orchestration plane nexus://sentinel-nexus.local:8443 …", c: "dim", d: 90 },
      { t: "mTLS handshake OK · peer cert CN=nexus-core-01 · TPM quote VERIFIED", c: "ok", d: 120 },
      { t: "", d: 40 },
      { t: "NODE-ID              SITE / CLASS            STATUS   RTT      EPS         XDP_DROPS   FW-GEN", c: "dim", d: 60 },
      { t: "───────────────────────────────────────────────────────────────────────────────────────────────", c: "dim", d: 40 },
      { t: "Substation-North     IEC-61850 / SUBSTATION  ONLINE   4.12ms   1,184,920      248,117   g.418", c: "ink", d: 110 },
      { t: "Naval-Vessel-04      MIL-1553 / MARITIME     ONLINE   28.74ms    612,405       94,882   g.418", c: "ink", d: 110 },
      { t: "Hospital-PACS-01     DICOM / MEDICAL         ONLINE   6.88ms     849,331       12,604   g.418", c: "ink", d: 110 },
      { t: "SCADA-Plant-09       MODBUS / INDUSTRIAL     CANARY   5.41ms   1,002,778      171,340   g.419", c: "warn", d: 110 },
      { t: "Enclave-HQ-02        KERBEROS / ENTERPRISE   ONLINE   2.03ms   1,250,000        3,991   g.418", c: "ink", d: 110 },
      { t: "", d: 40 },
      { t: "5 of 1,482 nodes shown · 1,481 ONLINE · 1 CANARY · 0 DEGRADED · aggregate 1.94 Tb/s inspected", c: "ok", d: 90 },
      { t: "Cloud egress this interval: 0 B (air-gap policy SOVEREIGN_STRICT enforced)", c: "acc", d: 80 },
    ],
  },
  "nexus-ctl threat drop 198.51.100.77": {
    label: "threat drop 198.51.100.77",
    hint: "Broadcast fleet-wide XDP drop rule",
    lines: [
      { t: "Compiling mitigation rule → eBPF bytecode (verifier pass 1/1) … OK", c: "dim", d: 120 },
      { t: "Rule: ipv4.src == 198.51.100.77 → XDP_DROP  [ttl=persistent, scope=fleet]", c: "ink", d: 110 },
      { t: "Signing artefact with enclave key 9E4281BCD34A · ed25519 … SIGNED", c: "ok", d: 130 },
      { t: "", d: 40 },
      { t: "gRPC fanout initiated → 1,482 appliances", c: "acc", d: 90 },
      { t: "  wave 1/4 ······ 15 nodes    ACK 15      8.1ms", c: "dim", d: 150 },
      { t: "  wave 2/4 ······ 74 nodes    ACK 74     14.6ms", c: "dim", d: 150 },
      { t: "  wave 3/4 ····· 371 nodes    ACK 371    24.9ms", c: "dim", d: 150 },
      { t: "  wave 4/4 ···· 1022 nodes    ACK 1022   38.4ms", c: "dim", d: 150 },
      { t: "", d: 40 },
      { t: "FANOUT COMPLETE · 1,482 / 1,482 ACK · 0 FAILED · elapsed 38.4ms (SLA < 50ms)", c: "ok", d: 110 },
      { t: "Kernel filters active on all nodes · first drop observed in 0.84µs on Substation-North", c: "ok", d: 100 },
      { t: "198.51.100.77 is now dark across the entire sovereign grid.", c: "bad", d: 90 },
    ],
  },
  "nexus-ctl attest verify --all": {
    label: "attest verify --all",
    hint: "Validate TPM 2.0 silicon quotes",
    lines: [
      { t: "Requesting TPM 2.0 attestation quotes from 1,482 endpoints …", c: "dim", d: 140 },
      { t: "PCR[0-7] golden measurement set: sha256:7f3c9a…d1e8  (signed 2026-09-14)", c: "ink", d: 110 },
      { t: "", d: 40 },
      { t: "  quotes received ......... 1,482", c: "dim", d: 120 },
      { t: "  signature valid ......... 1,482", c: "ok", d: 120 },
      { t: "  PCR match ............... 1,481", c: "ok", d: 120 },
      { t: "  PCR drift ............... 1  (SCADA-Plant-09 · expected, canary g.419)", c: "warn", d: 130 },
      { t: "  revoked / spoofed ....... 0", c: "ok", d: 110 },
      { t: "", d: 40 },
      { t: "ATTESTATION RESULT: PASS · hardware root of trust intact on 100% of fleet", c: "ok", d: 100 },
    ],
  },
};
