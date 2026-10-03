import type {
  AIModel,
  APIKey,
  AttestationLog,
  AuditLog,
  Billing,
  CMMCStatus,
  CollectiveBusEntry,
  Enclave,
  FleetNode,
  ForgeDataset,
  IECStatus,
  IdentityBotStatus,
  InsuranceProof,
  KernelRule,
  LatencyDistribution,
  MitreHit,
  NIS2Status,
  OTAStatus,
  OverviewMetrics,
  PCAP,
  ResilienceScore,
  ScadaStatus,
  ScadaMonitor,
  ThreatCoordinate,
  ThreatEvent,
  Twin,
  Webhook,
  XAIAttribution,
} from "@/lib/backend";

/** Rich dummy datasets shown before live data arrives and when the
 *  backend is unreachable. Shapes mirror the FastAPI response models. */

export const DUMMY_METRICS: OverviewMetrics = {
  online_nodes: 124,
  total_drops: 142080,
  mean_sla_us: 0.84,
  stable_model: "v2.4",
};

export const DUMMY_LATENCY: LatencyDistribution = {
  p50: 0.84,
  p90: 0.89,
  p95: 0.92,
  p99: 0.98,
  p999: 1.04,
};

export const DUMMY_THREAT_MAP: { coordinates: ThreatCoordinate[] } = {
  coordinates: [
    { site: "Substation-01", lat: 59.43, lng: 24.75, active_threat: true },
    { site: "Substation-02", lat: 59.44, lng: 24.76, active_threat: false },
    { site: "Refinery-B", lat: 59.41, lng: 24.72, active_threat: true },
    { site: "Hospital-Zone", lat: 59.45, lng: 24.78, active_threat: false },
  ],
};

export const DUMMY_XAI: XAIAttribution[] = [
  {
    attacker_ip: "198.51.100.45",
    mitre_id: "T0855",
    attributions: [
      { feature: "SCADA_FC", pct: 54.2 },
      { feature: "CMD_SEQ", pct: 21.8 },
    ],
  },
  {
    attacker_ip: "203.0.113.99",
    mitre_id: "T1059",
    attributions: [
      { feature: "CMD_SEQ", pct: 38.7 },
      { feature: "PAYLOAD_ENTROPY", pct: 27.4 },
    ],
  },
  {
    attacker_ip: "192.0.2.71",
    mitre_id: "T0806",
    attributions: [{ feature: "BRUTE_FORCE_RATE", pct: 61.3 }],
  },
];

export const DUMMY_FLEET_NODES: FleetNode[] = [
  { node_id: "NODE-8fa9", site: "Substation-01", status: "ONLINE", cpu_pct: 14.2, latency_us: 0.84, eps: 1250000, version: "v2.4.1", backend: "OPENVINO" },
  { node_id: "NODE-9b2c", site: "Substation-02", status: "ONLINE", cpu_pct: 8.7, latency_us: 0.79, eps: 980000, version: "v2.4.1", backend: "OPENVINO" },
  { node_id: "NODE-7d11", site: "Refinery-B", status: "DEGRADED", cpu_pct: 62.4, latency_us: 1.12, eps: 450000, version: "v2.4.0", backend: "RKNN" },
  { node_id: "NODE-3c90", site: "Hospital-Zone", status: "ONLINE", cpu_pct: 11.1, latency_us: 0.81, eps: 890000, version: "v2.4.1", backend: "OPENVINO" },
];

export const DUMMY_ENCLAVES: Enclave[] = [
  { enclave_id: "CRITICAL_OT", name: "Critical OT", max_latency_us: 800, node_count: 14 },
  { enclave_id: "MEDICAL_ZONE", name: "Medical Zone", max_latency_us: 500, node_count: 8 },
  { enclave_id: "DMZ_PERIMETER", name: "DMZ Perimeter", max_latency_us: 1000, node_count: 22 },
];

export const DUMMY_KERNEL_RULES: KernelRule[] = [
  { rule_id: "RULE-01", ip: "198.51.100.45", expires_at: null },
  { rule_id: "RULE-02", ip: "203.0.113.99", expires_at: null },
];

export const DUMMY_THREAT_EVENTS: ThreatEvent[] = [
  { threat_id: "THR-1001", attacker_ip: "198.51.100.45", mitre_id: "T0855", tactic: "T0855", dropped: true, detected_at: "2026-09-30T08:10:00Z" },
  { threat_id: "THR-1002", attacker_ip: "203.0.113.99", mitre_id: "T1059", tactic: "T1059", dropped: true, detected_at: "2026-09-30T08:04:00Z" },
  { threat_id: "THR-1003", attacker_ip: "192.0.2.71", mitre_id: "T0806", tactic: "T0806", dropped: false, detected_at: "2026-09-30T07:58:00Z" },
];

export const DUMMY_BUS: CollectiveBusEntry[] = [
  { rule_id: "RULE-441", origin_node: "NODE-8fa9", fanout_latency_ms: 38.4 },
  { rule_id: "RULE-442", origin_node: "NODE-9b2c", fanout_latency_ms: 41.2 },
];

export const DUMMY_MITRE: MitreHit[] = [
  { technique_id: "T0855", name: "Unauthorized Command", count: 14 },
  { technique_id: "T1059", name: "Command-Line Interface", count: 9 },
  { technique_id: "T0806", name: "Brute Force I/O", count: 6 },
];

export const DUMMY_SCADA_MONITOR: ScadaMonitor = {
  summary: {
    modbus_violations_total: 12,
    iec104_trips_blocked: 3,
    s7comm_writes_blocked: 11,
    dnp3_anomalies_total: 2,
  },
  recent_events: [],
};

export const DUMMY_SCADA: ScadaStatus = {
  modbus_violations: 12,
  dnp3_violations: 2,
  overrides_blocked: 14,
};

export const DUMMY_IDENTITY: IdentityBotStatus = {
  impossible_velocity_hits: 4,
  bot_kinematic_blocks: 22,
};

export const DUMMY_MODELS: AIModel[] = [
  { filename: "network_threat_v1.onnx", version: "v1", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", size_bytes: 1420500, download_url: "/api/v1/models/network_threat_v1.onnx", stage: "FLEET_WIDE" },
  { filename: "network_threat_v2.onnx", version: "v2", sha256: "8fa9c89b3f4618e47f5255470d9a690e7da3c6046e297893a776", size_bytes: 1485200, download_url: "/api/v1/models/network_threat_v2.onnx", stage: "SHADOW_MODE" },
];

export const DUMMY_OTA: OTAStatus = {
  stable_version: "v2.4",
  candidate_version: "v2.5-rc1",
  stage: "CANARY_5_PCT",
};

export const DUMMY_FORGE: ForgeDataset[] = [
  { dataset_id: "DS-2501", samples: 2500, high_uncertainty: 420 },
  { dataset_id: "DS-2502", samples: 1800, high_uncertainty: 310 },
];

export const DUMMY_NIS2: NIS2Status = {
  framework: "EU NIS2",
  compliant: true,
  incident_sla_verified: true,
};

export const DUMMY_IEC: IECStatus = {
  standard: "IEC 62443-3-3",
  system_integrity: "PASS",
  zones_verified: 14,
};

export const DUMMY_CMMC: CMMCStatus = {
  findings: [
    { control_id: "IA.L2-3.5.1", title: "TPM 2.0 Auth", passed: true },
    { control_id: "SC.L2-3.13.2", title: "Boundary Protection", passed: true },
    { control_id: "AU.L2-3.3.1", title: "Audit Logging", passed: false },
  ],
};

export const DUMMY_INSURANCE: InsuranceProof = {
  certified_sla_us: 0.84,
  hardware_root: "TPM 2.0",
  insurance_discount_score: "TIER_A",
};

export const DUMMY_ATTESTATION: AttestationLog[] = [
  { timestamp: "2026-09-30T08:00:00Z", pcr0_hash: "a91f…02ce", verified: true },
  { timestamp: "2026-09-30T07:00:00Z", pcr0_hash: "77b2…9d10", verified: true },
];

export const DUMMY_PCAPS: PCAP[] = [
  { pcap_id: "PCAP-1002", sha256: "e3b0…9a12", size_bytes: 48200 },
  { pcap_id: "PCAP-1001", sha256: "c41a…77f0", size_bytes: 96500 },
];

export const DUMMY_TWINS: Twin[] = [
  { twin_id: "TWIN-OT-SUBSTATION", nodes: 5, status: "IDLE" },
  { twin_id: "TWIN-REFINERY-B", nodes: 8, status: "RUNNING" },
];

export const DUMMY_RESILIENCE: ResilienceScore = {
  mttfi_ms: 38.4,
  rollback_guard_ms: 120,
  score: 98.4,
};

export const DUMMY_API_KEYS: APIKey[] = [
  { key_id: "key_001", name: "Production API", created_at: "2024-01-15T00:00:00Z" },
  { key_id: "key_002", name: "CI/CD Pipeline", created_at: "2024-07-15T00:00:00Z" },
];

export const DUMMY_WEBHOOKS: Webhook[] = [
  { id: "wh_001", url: "https://siem.corp.internal/hooks" },
];

export const DUMMY_BILLING: Billing = {
  active_nodes: 124,
  licensed_nodes: 150,
  renewal_date: "2025-01-15T00:00:00Z",
};

export const DUMMY_AUDIT: AuditLog[] = [
  { action: "MODEL_PROMOTED", operator: "admin@aryorithm.com", ts: "2026-09-30T08:01:00Z" },
  { action: "ZTP_TOKEN_ISSUED", operator: "admin@aryorithm.com", ts: "2026-09-30T07:45:00Z" },
  { action: "THREAT_BROADCAST", operator: "soc@eurogrid.nl", ts: "2026-09-30T07:30:00Z" },
];
