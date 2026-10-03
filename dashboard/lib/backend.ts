import { api } from "./api";

/* ---------- Mission Control ---------- */
export interface OverviewMetrics {
  online_nodes: number;
  total_drops: number;
  mean_sla_us: number;
  stable_model: string;
}
export interface ThreatCoordinate {
  site: string;
  lat: number;
  lng: number;
  active_threat: boolean;
}
export interface LatencyDistribution {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}
export interface XAIAttribution {
  attacker_ip: string;
  mitre_id: string | null;
  attributions: { feature: string; pct: number }[];
}

/* ---------- Fleet ---------- */
export interface FleetNode {
  node_id: string;
  site: string;
  status: string;
  cpu_pct: number;
  latency_us: number;
  eps: number;
  version: string;
  backend: string;
}
export interface Enclave {
  enclave_id: string;
  name: string;
  max_latency_us: number;
  node_count: number;
}
export interface KernelRule {
  rule_id: string;
  ip: string;
  expires_at: string | null;
}

/* ---------- Threats ---------- */
export interface ThreatEvent {
  threat_id: string;
  attacker_ip: string;
  mitre_id: string | null;
  tactic: string | null;
  dropped: boolean;
  detected_at: string;
}
/* ---------- Nexus live sync (5s / 20s polling) ---------- */
export interface FleetSyncSensorPayload {
  sensor_id: string;
  name?: string;
  type?: string;
  protocol?: string;
  ip_address?: string;
  status?: string;
  last_packet_seen_sec_ago?: number;
}
export interface FleetSyncNodePayload {
  node_id: string;
  site?: string;
  hostname?: string;
  status?: string;
  cpu_pct?: number;
  ebpf_drops?: number;
  mitigation_latency_us?: number;
  sensors_count?: number;
  sensors?: FleetSyncSensorPayload[];
  // Legacy fields (backend ignores extras, kept for compat)
  latency_us?: number;
  eps?: number;
  version?: string;
  backend?: string;
}
export interface FleetSyncPayload {
  tenant_id: string;
  nexus_id?: string;
  nexus_version?: string;
  timestamp?: number;
  nodes_count: number;
  nodes: FleetSyncNodePayload[];
}
export interface FleetSyncResult {
  status: string;
  tenant_id: string;
  nodes_count: number;
  synced: number;
  nexus_id?: string | null;
  sensors_synced?: number;
}
/* ---------- 4-tier topology (tenant -> nexus -> node -> sensor) ---------- */
export interface TopologySensor {
  sensor_id: string;
  name: string;
  type: string;
  protocol: string;
  ip_address: string | null;
  reported_status: string;
  status: string;
  last_packet_seen_sec_ago: number | null;
}
export interface TopologyNode {
  node_id: string;
  site: string;
  hostname: string | null;
  reported_status: string;
  status: string;
  cpu_pct: number;
  ebpf_drops: number;
  mitigation_latency_us: number;
  last_heartbeat_sec_ago: number | null;
  sensors: TopologySensor[];
}
export interface TopologyNexus {
  nexus_id: string;
  version: string;
  status: string;
  last_seen_sec_ago: number | null;
  nodes: TopologyNode[];
}
export interface TopologySummary {
  nexus_online: number;
  nexus_offline: number;
  nodes_online: number;
  nodes_degraded: number;
  nodes_offline: number;
  nodes_unreachable: number;
  sensors_active: number;
  sensors_fault: number;
  sensors_silent: number;
}
export interface Topology {
  tenant_id: string;
  nexus: TopologyNexus[];
  summary: TopologySummary;
}
export interface GlobalFeedIndicator {
  indicator: string;
  type: string;
  severity: string;
  mitre_id: string | null;
  description: string | null;
}
export interface GlobalFeedResponse {
  indicators: GlobalFeedIndicator[];
  count: number;
  updated_at: string;
}
/** Exact sentinel-nexus shape: bare list [{"ip": "..."}] (or []). */
export interface GlobalFeedItem {
  ip: string;
}

export const NEXUS_API_KEY =
  process.env.NEXT_PUBLIC_NEXUS_API_KEY || "ary_dev_secret_key_8000";
export const NEXUS_TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID || "tenant-dev-local";
export interface CollectiveBusEntry {
  rule_id: string;
  origin_node: string;
  fanout_latency_ms: number;
}
export interface MitreHit {
  technique_id: string;
  name: string;
  count: number;
}
export interface ScadaStatus {
  modbus_violations: number;
  dnp3_violations: number;
  overrides_blocked: number;
}
export interface IdentityBotStatus {
  impossible_velocity_hits: number;
  bot_kinematic_blocks: number;
}

/* ---------- AI ---------- */
export interface AIModel {
  version?: string;
  filename: string;
  sha256: string;
  size_bytes: number;
  download_url: string;
  stage: string;
}
export interface OTAStatus {
  stable_version: string;
  candidate_version: string | null;
  stage: string;
}
export interface ForgeDataset {
  dataset_id: string;
  samples: number;
  high_uncertainty: number;
}

/* ---------- Compliance ---------- */export interface NIS2Status {
  framework: string;
  compliant: boolean;
  incident_sla_verified: boolean;
}
export interface IECStatus {
  standard: string;
  system_integrity: string;
  zones_verified: number;
}
export interface CMMCStatus {
  findings: { control_id: string; title: string; passed: boolean }[];
}
export interface SBOMComponent {
  type: string;
  name: string;
  version: string;
  purl: string;
}
export interface SBOM {
  bomFormat: string;
  specVersion: string;
  components: SBOMComponent[];
}
export interface TrismResult {
  safe: boolean;
  risk_score: number;
  sanitized_text: string | null;
}
export interface InsuranceProof {
  certified_sla_us: number;
  hardware_root: string;
  insurance_discount_score: string;
}
export interface AttestationLog {
  timestamp: string;
  pcr0_hash: string;
  verified: boolean;
}

/* ---------- DFIR ---------- */
export interface PCAP {
  pcap_id: string;
  sha256: string;
  size_bytes: number;
}

/* ---------- Range ---------- */
export interface Twin {
  twin_id: string;
  nodes: number;
  status: string;
}
export interface ResilienceScore {
  mttfi_ms: number;
  rollback_guard_ms: number;
  score: number;
}

/* ---------- Settings ---------- */
export interface APIKey {
  key_id: string;
  name: string;
  created_at: string;
}
export interface Webhook {
  id: string;
  url: string;
}
export interface Billing {
  active_nodes: number;
  licensed_nodes: number;
  renewal_date: string | null;
}
export interface AuditLog {
  action: string;
  operator: string;
  ts: string;
}
export interface SubPlan {
  slug: string;
  name: string;
  price_month_cents: number | null;
  price_display: string;
  per_node: boolean;
  target: string;
  deployment: string;
  node_capacity: string;
  licensing: string;
  support: string;
  cta_label: string;
  cta_href: string;
  sort_order: number;
}
export interface PlanItem {
  id: string;
  category: string;
  item_key: string;
  item_label: string;
  item_sub: string;
  values: Record<string, string>;
  sort_order: number;
}
export interface PlansMatrix {
  plans: SubPlan[];
  items: PlanItem[];
}

const get = <T>(endpoint: string, token: string | null) =>
  api.get<T>(endpoint, token);

/** Typed client over the FastAPI backend. Every getter returns live data
 *  when a valid token is supplied; pages fall back to dummy data on error. */
export const backend = {
  // Mission Control
  overviewMetrics: (t: string | null) =>
    get<OverviewMetrics>("/overview/metrics", t),
  threatMap: (t: string | null) =>
    get<{ coordinates: ThreatCoordinate[] }>("/overview/threat-map", t),
  latency: (t: string | null) =>
    get<LatencyDistribution>("/overview/latency-distribution?window=24h", t),
  xaiRecent: (t: string | null) =>
    get<XAIAttribution[]>("/xai/recent?limit=10", t),

  // Fleet
  fleetNodes: (t: string | null) => get<FleetNode[]>("/fleet/nodes", t),
  topology: (t: string | null) => get<Topology>("/fleet/topology", t),
  enclaves: (t: string | null) => get<Enclave[]>("/fleet/enclaves", t),
  kernelRules: (t: string | null) =>
    get<KernelRule[]>("/fleet/kernel-rules", t),
  purgeKernelRule: (body: { ip: string }, t: string | null) =>
    api.post<{ status: string; ip: string }>(
      "/fleet/kernel-rules/purge",
      body,
      t
    ),
  generateZtpToken: (body: { enclave_id: string; valid_days: number }, t: string | null) =>
    api.post<{ token: string; expires_at: string }>(
      "/fleet/provisioning/tokens",
      body,
      t
    ),

  // Threats
  threatEvents: (t: string | null) =>
    get<ThreatEvent[]>("/threats/events?limit=50", t),
  collectiveBus: (t: string | null) =>
    get<CollectiveBusEntry[]>("/threats/collective-bus?limit=20", t),
  globalFeed: (t: string | null) =>
    api.get<GlobalFeedItem[]>("/threats/global-feed", t, {
      apiKey: NEXUS_API_KEY,
      tenantId: NEXUS_TENANT_ID,
    }),
  pendingCommands: (tenantId: string, t: string | null) =>
    api.get<unknown[]>(`/tenants/${tenantId}/commands/pending`, t, {
      apiKey: NEXUS_API_KEY,
      tenantId: NEXUS_TENANT_ID,
    }),
  fleetSync: (body: FleetSyncPayload, t: string | null) =>
    api.post<FleetSyncResult>("/fleet/sync", body, t, {
      apiKey: NEXUS_API_KEY,
      tenantId: NEXUS_TENANT_ID,
    }),
  broadcastThreat: (body: { ip: string; attributions?: object[] }, t: string | null) =>
    api.post<{ status: string; target_ip: string }>(
      "/threats/broadcast",
      body,
      t
    ),
  mitre: (t: string | null) => get<MitreHit[]>("/threats/mitre", t),
  scada: (t: string | null) => get<ScadaStatus>("/threats/scada", t),
  identityBot: (t: string | null) =>
    get<IdentityBotStatus>("/threats/identity-bot", t),

  // AI
  models: (t: string | null) => get<AIModel[]>("/ai/models", t),
  otaStatus: (t: string | null) => get<OTAStatus>("/ai/ota/status", t),
  otaAdvance: (t: string | null) =>
    api.post<{ status: string; new_stage: string | null }>(
      "/ai/ota/advance",
      {},
      t
    ),
  otaRollback: (t: string | null) =>
    api.post<{ status: string; active: string | null }>(
      "/ai/ota/rollback",
      {},
      t
    ),
  forgeDatasets: (t: string | null) =>
    get<ForgeDataset[]>("/ai/forge/datasets", t),
  forgeTrain: (body: { dataset_id: string; epochs?: number }, t: string | null) =>
    api.post<{ job_id: string; status: string }>("/ai/forge/train", body, t),
  compileModel: (body: { model_id: string; target: string }, t: string | null) =>
    api.post<{ task_id: string; status: string }>(
      "/ai/compiler/compile",
      body,
      t
    ),
  trismEvaluate: (body: { prompt_text: string }, t: string | null) =>
    api.post<TrismResult>("/ai/trism/evaluate", body, t),

  // Compliance
  nis2: (t: string | null) => get<NIS2Status>("/compliance/nis2", t),
  iec62443: (t: string | null) => get<IECStatus>("/compliance/iec62443", t),
  cmmc: (t: string | null) => get<CMMCStatus>("/compliance/cmmc", t),
  sbom: (t: string | null) => get<SBOM>("/compliance/sbom", t),
  insurance: (t: string | null) =>
    get<InsuranceProof>("/compliance/insurance-proof", t),
  attestationLogs: (t: string | null) =>
    get<AttestationLog[]>(
      "/compliance/attestation-logs?node_id=NODE-01",
      t
    ),

  // DFIR
  pcaps: (t: string | null) => get<PCAP[]>("/dfir/pcaps?limit=20", t),

  // Range
  twins: (t: string | null) => get<Twin[]>("/range/twins", t),
  startTwin: (twinId: string, t: string | null) =>
    api.post<{ status: string; sandbox_ip: string | null }>(
      `/range/twins/${twinId}/start`,
      {},
      t
    ),
  stopTwin: (twinId: string, t: string | null) =>
    api.post<{ status: string }>(`/range/twins/${twinId}/stop`, {}, t),
  replayAttack: (
    body: { malware: string; target: string },
    t: string | null
  ) =>
    api.post<{ status: string; frames_injected: number }>(
      "/range/attacks/replay",
      body,
      t
    ),
  resilience: (t: string | null) =>
    get<ResilienceScore>("/range/resilience/score", t),

  // Settings
  apiKeys: (t: string | null) => get<APIKey[]>("/settings/api-keys", t),
  createApiKey: (body: { name: string; scopes?: string[] }, t: string | null) =>
    api.post<{ api_key: string }>("/settings/api-keys", body, t),
  revokeApiKey: (keyId: string, t: string | null) =>
    api.delete<{ status: string; key_id: string }>(
      `/settings/api-keys/${keyId}`,
      t
    ),
  webhooks: (t: string | null) => get<Webhook[]>("/settings/webhooks", t),
  createWebhook: (body: { url: string; events?: string[] }, t: string | null) =>
    api.post<{ webhook_id: string; status: string }>(
      "/settings/webhooks",
      body,
      t
    ),
  billing: (t: string | null) => get<Billing>("/settings/billing", t),
  plans: (t: string | null) => get<PlansMatrix>("/plans", t),
  auditLogs: (t: string | null) =>
    get<AuditLog[]>("/settings/audit-logs?page=1&limit=50", t),
};
