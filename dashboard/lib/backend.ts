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
  hostname?: string | null;
  kernel_version?: string | null;
  status: string;
  cpu_pct: number;
  ram_mb?: number;
  npu_temp_c?: number;
  packets_inspected?: number;
  ebpf_drops?: number;
  mitigation_latency_us?: number;
  latency_us: number;
  eps: number;
  version: string;
  backend: string;
  last_heartbeat_timestamp?: number | null;
  sensors_count?: number;
}
export interface Enclave {
  enclave_id: string;
  name: string;
  max_latency_us: number;
  node_count: number;
}
export interface FleetGroup {
  group_id: string;
  description: string;
  scada_mode: boolean;
  max_latency_us: number;
  node_count: number;
  active_threats: number;
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
  kernel_version?: string;
  status?: string;
  cpu_pct?: number;
  ram_mb?: number;
  npu_temp_c?: number;
  packets_inspected?: number;
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
export interface ScadaEvent {
  timestamp: number;
  appliance_id: string;
  site: string;
  protocol: string;
  plc_ip: string | null;
  attacker_ip: string;
  function_code: string;
  register_address: number | null;
  mitre_id: string | null;
  action: string;
  mitigation_time_us: number;
}
export interface ScadaMonitor {
  summary: {
    modbus_violations_total: number;
    iec104_trips_blocked: number;
    s7comm_writes_blocked: number;
    dnp3_anomalies_total: number;
  };
  recent_events: ScadaEvent[];
}
export interface GlobalFeedVerbose {
  indicator_id: string;
  ip: string;
  subnet_mask: number;
  threat_type: string;
  mitre_id: string | null;
  confidence: number;
  first_seen_timestamp: number;
  expires_at_timestamp: number;
  origin_anonymized_sector: string;
  total_appliances_blocked: number;
}
export interface RansomwareHash {
  sha256: string;
  process_name: string;
  detected_entropy: number;
  nominal_baseline: number;
  burst_iops: number;
  reported_by_site: string;
  first_detected: number;
  status: string;
}
export interface TwinBlueprint {
  blueprint_id: string;
  name: string;
  description: string;
  protocols: string[];
}
export interface TwinNode {
  id: string;
  ip: string;
  role: string;
}
export interface RangeInstance {
  instance_id: string;
  status: string;
  blueprint_id: string;
  enclave_name: string;
  assigned_sandbox_ip: string;
  web_console_url: string;
  expires_at_timestamp: number;
  allocated_nodes: TwinNode[];
}
export interface ResilienceBench {
  resilience_score: number;
  rating_tier: string;
  metrics: {
    mean_time_to_fleet_immunity_ms: number;
    mttfi_target_sla_ms: number;
    p50_kernel_mitigation_latency_us: number;
    p99_kernel_mitigation_latency_us: number;
    auto_rollback_latency_ms: number;
    simulated_attack_containment_rate_pct: number;
  };
  tested_malware_profiles: string[];
  last_evaluation_timestamp: number;
}
export interface MDRIncident {
  incident_id: string;
  severity: string;
  target_site: string;
  protocol: string;
  threat_summary: string;
  in_kernel_drop_verified: boolean;
  aryorithm_analyst_assigned: string;
  analyst_verdict: string;
  status: string;
  created_timestamp: number;
  contained_timestamp: number | null;
}
export interface MDRMessage {
  author: string;
  author_role: string;
  body: string;
  created_timestamp: number;
}
export interface MDRIncidentDetail extends MDRIncident {
  messages: MDRMessage[];
  pcap_links: string[];
}
export interface EmergencyDispatch {
  dispatch_id: string;
  affected_enclave: string;
  urgency: string;
  status: string;
  response_time_seconds: number | null;
  sla_met: boolean | null;
  created_timestamp: number;
}
export interface MedicalScanner {
  scanner_id: string;
  name: string;
  ae_title: string;
  ip_address: string;
  department: string;
  connected_sentinel_node: string;
  status: string;
  unencrypted_hl7_detected: boolean;
  last_cstore_timestamp: number | null;
}
export interface PACSEvent {
  event_id: string;
  timestamp: number;
  ae_title: string;
  source_ip: string;
  destination_ip: string;
  anomaly_type: string;
  mitre_id: string | null;
  action_enforced: string;
  mitigation_latency_us: number;
  details: string;
}
export interface Vessel {
  vessel_mmsi: string;
  vessel_name: string;
  vessel_type: string;
  current_lat: number;
  current_lng: number;
  satellite_link_status: string;
  bandwidth_saved_mb: number;
  connected_sentinel_node: string;
  active_threats_count: number;
  spoofing_detected: boolean;
}
export interface ITDREvent {
  incident_id: string;
  timestamp: number;
  targeted_user: string;
  attacker_ip: string;
  attack_technique: string;
  mitre_id: string | null;
  encryption_type_requested: string;
  status: string;
  recommended_action: string;
}
export interface BotVerdict {
  session_id: string;
  verdict: string;
  bot_probability: number;
  confidence: string;
  attribution_factors: string[];
  action_recommended: string;
}
export interface ZTNASession {
  user_email: string;
  current_risk_score: number;
  risk_tier: string;
  risk_factors: string[];
  active_enclaves_accessed: string[];
  automated_action: string;
  timestamp: number;
}
export interface FirmwareFinding {
  severity: string;
  category: string;
  description: string;
}
export interface FirmwareReport {
  task_id: string;
  filename: string;
  sha256: string;
  cpu_architecture: string;
  extracted_filesystem: string;
  security_score: string;
  findings: FirmwareFinding[];
  vulnerabilities: Record<string, unknown>[];
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

/* ---------- Compliance ---------- */
export interface IECStatus {
  standard: string;
  system_integrity: string;
  zones_verified: number;
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
  safe_to_forward: boolean;
  risk_score: number;
  threat_category: string;
  mitre_atlas_id: string | null;
  action_enforced: string;
  sanitized_prompt: string | null;
  audit_reason: string;
}
export interface NIS2Mandate {
  article: string;
  title: string;
  status: string;
  evidence: string;
}
export interface NIS2Status {
  framework: string;
  overall_status: string;
  compliance_score_pct: number;
  statutory_mandates: NIS2Mandate[];
  last_audit_timestamp: number;
}
export interface CMMCControl {
  control_id: string;
  title: string;
  status: string;
  evidence: string;
}
export interface CMMCStatus {
  standard: string;
  certified_level: string;
  controls_evaluated: number;
  controls_passed: number;
  score_percentage: number;
  key_findings: CMMCControl[];
}
export interface InsuranceProof {
  tenant_name: string;
  certified_tier: string;
  insurance_discount_eligibility: boolean;
  estimated_discount_range_pct: string;
  actuarial_telemetry: {
    total_protected_nodes: number;
    p50_mitigation_latency_us: number;
    p99_mitigation_latency_us: number;
    tpm2_hardware_root_coverage_pct: number;
    ransomware_lateral_containment_sla_us: number;
    unmitigated_breach_window_sec: number;
  };
  cryptographic_verification_token: string;
  issued_timestamp: number;
  valid_until_timestamp: number;
}
export interface CompileTask {
  task_id: string;
  model_name?: string | null;
  target_silicon?: string | null;
  status: string;
  estimated_seconds?: number;
  output_filename?: string | null;
  sha256?: string | null;
  size_bytes?: number | null;
  latency_speedup_factor?: string | null;
  download_url?: string | null;
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
  fleetNodes: (t: string | null, params?: { status?: string; backend?: string; enclave_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.backend) q.set("backend", params.backend);
    if (params?.enclave_id) q.set("enclave_id", params.enclave_id);
    const qs = q.toString();
    return get<FleetNode[]>(`/fleet/nodes${qs ? `?${qs}` : ""}`, t);
  },
  fleetGroups: (t: string | null) => get<FleetGroup[]>("/fleet/groups", t),
  createFleetGroup: (body: { group_id: string; description?: string; scada_mode?: boolean; max_allowed_latency_us?: number }, t: string | null) =>
    api.post<{ status: string; group_id: string }>("/fleet/groups", body, t),
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
  globalFeedVerbose: (t: string | null) =>
    get<GlobalFeedVerbose[]>("/threats/global-feed?verbose=true", t),
  ransomwareHashes: (t: string | null) =>
    get<RansomwareHash[]>("/threats/ransomware-hashes", t),
  medicalScanners: (t: string | null) =>
    get<MedicalScanner[]>("/cps/medical/scanners", t),
  pacsEvents: (t: string | null) =>
    get<PACSEvent[]>("/cps/medical/pacs-events", t),
  vessels: (t: string | null) =>
    get<Vessel[]>("/cps/maritime/vessels", t),
  itdrEvents: (t: string | null) =>
    get<ITDREvent[]>("/threats/itdr/events", t),
  revokeSession: (body: { user_principal_name: string; reason?: string }, t: string | null) =>
    api.post<{ status: string; user_principal_name: string; revoked_at: number }>(
      "/threats/itdr/revoke-session", body, t
    ),
  botEvaluate: (body: { session_id: string; kinematic_vectors: { x: number; y: number; dt_ms: number }[]; keystroke_jitter_ms?: number }, t: string | null) =>
    api.post<BotVerdict>("/bot/evaluate", body, t),
  ztnaSessions: (t: string | null) =>
    get<ZTNASession[]>("/ztna/sessions", t),
  firmwareReport: (taskId: string, t: string | null) =>
    get<FirmwareReport>(`/dfir/firmware/reports/${taskId}`, t),
  twinBlueprints: (t: string | null) =>
    get<TwinBlueprint[]>("/range/blueprints", t),
  twinInstances: (t: string | null) =>
    get<RangeInstance[]>("/range/instances", t),
  provisionTwin: (body: { blueprint_id: string; enclave_name?: string; duration_hours?: number; traffic_profile?: string }, t: string | null) =>
    api.post<RangeInstance>("/range/instances/provision", body, t),
  pauseTwin: (instanceId: string, t: string | null) =>
    api.post<{ status: string; sandbox_ip: string | null }>(`/range/instances/${instanceId}/pause`, {}, t),
  resumeTwin: (instanceId: string, t: string | null) =>
    api.post<{ status: string; sandbox_ip: string | null }>(`/range/instances/${instanceId}/resume`, {}, t),
  terminateTwin: (instanceId: string, t: string | null) =>
    api.delete<{ status: string; sandbox_ip: string | null }>(`/range/instances/${instanceId}`, t),
  resilienceBench: (t: string | null) =>
    get<ResilienceBench>("/range/resilience/score", t),
  resilienceHistory: (t: string | null) =>
    get<{ score: number; evaluated_at: number }[]>("/range/resilience/history", t),
  mdrIncidents: (t: string | null) =>
    get<MDRIncident[]>("/soc/incidents", t),
  mdrIncident: (incidentId: string, t: string | null) =>
    get<MDRIncidentDetail>(`/soc/incidents/${incidentId}`, t),
  mdrMessage: (incidentId: string, body: { author?: string; author_role?: string; body: string }, t: string | null) =>
    api.post<MDRMessage>(`/soc/incidents/${incidentId}/messages`, body, t),
  emergencyDispatch: (body: { affected_enclave: string; urgency?: string; incident_notes?: string }, t: string | null) =>
    api.post<{ dispatch_id: string; status: string; sla_window_minutes: number; sla_deadline_timestamp: number; assigned_responders: string[]; emergency_bridge_link: string }>(
      "/support/emergency-dispatch", body, t
    ),
  slaHistory: (t: string | null) =>
    get<EmergencyDispatch[]>("/support/sla-history", t),
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
  scada: (t: string | null) => get<ScadaMonitor>("/threats/scada", t),
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
  compileModel: (form: FormData, t: string | null) =>
    api.postForm<CompileTask>("/ai/compiler/compile", form, t),
  compileTask: (taskId: string, t: string | null) =>
    get<CompileTask>(`/ai/compiler/tasks/${taskId}`, t),
  trismEvaluate: (body: { prompt_text: string; user_id?: string; sanitize_pii?: boolean }, t: string | null) =>
    api.post<TrismResult>("/ai/trism/evaluate", body, t),
  exportCompliance: (body: { framework: string; format: string; include_sla_proofs?: boolean; reporting_period_days?: number }, t: string | null) =>
    api.postBlob("/compliance/export", body, t),

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
