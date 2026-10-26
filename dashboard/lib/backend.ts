import { api } from "./api";
import { API_BASE_URL } from "./config";

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
export interface XAIVector {
  rank: number;
  feature: string;
  contribution_pct: number;
  observed: string;
  baseline: string;
  audit_note: string;
}
export interface XAIIncident {
  attacker_ip: string;
  mitre_id: string | null;
  attributions: XAIVector[];
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
  /** Optional enrichment fields supplied by newer edge collectors. */
  architecture?: string | null;
  primary_interface?: string | null;
  slicing_violations?: number | null;
  sbom_drift_alerts?: number | null;
  active_blueprint?: string | null;
}

export interface FleetNodeDetail {
  node_id: string;
  ring_buffer_fill_pct: number;
  kernel_drops: number;
  hardware: Record<string, unknown>;
  site: string | null;
  status: string | null;
  sensors: {
    sensor_id: string;
    name: string;
    type: string;
    protocol: string;
    ip_address: string | null;
    status: string;
  }[];
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
export interface GridPeer {
  node_id: string;
  site: string;
  status: string;
  rules_synced: number;
  rtt_ms: number;
}
export interface ThreatGrid {
  grid_id: string;
  peers: GridPeer[];
  peers_online: number;
  bus_rules_active: number;
  p50_fanout_ms: number;
  p99_fanout_ms: number;
  sla_target_ms: number;
  throughput_msgs_s: number;
  active_indicators: number;
  last_sync_timestamp: number;
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
export interface LabMetric {
  key: string;
  label: string;
  domain: string;
  value: number;
  unit: string;
  target: number;
  direction: "lower" | "higher";
  status: "PASS" | "WATCH";
}
export interface LabBench {
  suite: string;
  metrics: LabMetric[];
  domains: string[];
  passed: number;
  overall_score: number;
  last_run_timestamp: number;
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

/* ---------- Frontier telemetry (5G slicing, SBOM, space) ---------- */
export interface GtpSliceRow {
  node_id: string;
  site: string;
  status: string;
  active_teids: number;
  gtp_slice_violations_dropped: number;
  unmapped_teids_dropped: number;
  total_slice_drops: number;
  n3_peer: string | null;
  s_nssai: unknown[];
  last_updated: string | null;
}

export interface GtpSliceSummary {
  reporting_nodes: number;
  active_teids: number;
  gtp_slice_violations_dropped: number;
  unmapped_teids_dropped: number;
  total_dropped: number;
  affected_nodes: number;
}

export interface FiveGSlicingStatus {
  framework: string;
  standard: string;
  generated_at: number;
  overall_status: string;
  compliance_score_pct: number;
  slice_isolation_verified: boolean;
  nis2_article: string;
  summary: GtpSliceSummary;
  s_nssai: unknown[];
  findings: Record<string, unknown>[];
  audited_nodes: number;
}

export interface FiveGTelemetry {
  tenant_id: string;
  generated_at: number;
  summary: GtpSliceSummary;
  active_teids: number;
  gtp_slice_violations_dropped: number;
  unmapped_teids_dropped: number;
  total_dropped: number;
  n3_gtp_u: Record<string, unknown>;
  slices: GtpSliceRow[];
  nodes: GtpSliceRow[];
}

export interface SbomDriftEvent {
  event_id: string;
  timestamp: number;
  node_id: string;
  attestation_id: string | null;
  event_type: string;
  severity: string;
  process_name: string;
  pid: number | null;
  address: string | null;
  action: string;
  mitre_id: string | null;
  reason: string;
  source: string;
  details: Record<string, unknown>;
}

export interface Satellite {
  satellite_id: string;
  name: string;
  orbit_class: string;
  norad_id: string | null;
  operator: string;
  ground_station: string;
  downlink_protocol: string;
  frequency_band: string;
  telemetry_integrity: string;
  status: string;
  signal_strength_dbm: number;
  packet_loss_pct: number;
  last_downlink_timestamp: number | null;
  connected_sentinel_node: string;
}

export interface TelecommandAudit {
  audit_id: string;
  timestamp: number;
  satellite_id: string;
  ground_station: string;
  command_name: string;
  service_type: string;
  function_code: string;
  sequence_counter: number | null;
  expected_sequence_counter: number | null;
  source_ip: string;
  mitre_id: string | null;
  action_enforced: string;
  status: string;
  reason: string;
  details: Record<string, unknown>;
}

export interface VaccineFeedItem {
  vaccine_id: string;
  slug: string;
  name: string;
  version: string;
  severity: string;
  mitre_id: string | null;
  target_protocol: string | null;
  sha256: string;
  size_bytes: number;
  signature_verified: boolean;
  origin_node: string;
  source_site: string;
  status: string;
  download_url: string;
  created_at: string;
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
export interface TrismPolicy {
  policy_id: string;
  version: number;
  blocked_prompt_delimiters: string[];
  blocked_delimiters: string[];
  forbidden_tools: string[];
  blocked_tools: string[];
  allowed_tools: string[];
  blocked_patterns: string[];
  require_human_approval: boolean;
  updated_by: string;
  updated_at: string;
  policy_yaml: string;
  yaml: string;
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
  kernel_mitigation?: string;
  extensibility?: string;
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

/* ---------- Licensing ---------- */
export interface LicenseItem {
  id: string;
  license_id: string;
  customer_name: string;
  plan_slug: string;
  license_kind: "free" | "commercial" | string;
  hostname: string;
  max_nodes: number;
  issued_at: number;
  expires_at: number;
  status: "active" | "expired" | "revoked" | string;
  revoked: boolean;
  authorized_modules: string[];
  authorized_plugins: string[];
  created_at: string | null;
}
export interface LicenseDetail extends LicenseItem {
  hardware_token: string;
  locked_hardware_uuid: string;
  days_valid: number;
  signature_algorithm: string;
  signature: string;
  envelope: {
    claims: Record<string, unknown>;
    payload_b64?: string;
    signature: string;
    signature_b64?: string;
    signature_algorithm: string;
  };
  signature_valid: boolean;
}
export interface LicenseEnvelopeResult {
  status: string;
  plan_slug: string;
  license_id: string;
  lease_days: number;
  license_envelope: LicenseDetail["envelope"];
  envelope: { payload_b64: string; signature_b64: string; signature_algorithm: string };
}

/** Sentinel-Hub public storefront records (`/hub/*` routers). */
export interface SpkgPackage {
  id: string;
  slug: string;
  name: string;
  version: string;
  tier: string;
  tier_display: string;
  language: string;
  author: string;
  verified: boolean;
  sector: string;
  target_protocol: string;
  default_port: number;
  latency_sla_ns: number;
  latency_display: string;
  mitigation_action: string;
  compliance_tags: string[];
  short_description: string;
  technical_details: string;
  package_file_name: string;
  package_file_size_bytes: number;
  signature_algorithm: string;
  install_command: string;
  created_at: string;
  updated_at: string;
}
export interface HubPcap {
  id: string;
  slug: string;
  title: string;
  category: string;
  target_protocol: string;
  attack_type: string;
  source_origin: string;
  packet_count: number;
  duration_seconds: number;
  file_name: string;
  file_size_bytes: number;
  sha256_checksum: string;
  download_url: string;
  mitre_attack_ids: string[];
  recommended_spkg_id: string | null;
  short_description: string;
  technical_analysis: string;
  download_count: number;
  created_at: string;
}
export interface HubDataset {
  id: string;
  slug: string;
  name: string;
  format: string;
  tensor_dimension: number;
  total_records: number;
  normal_records_count: number;
  anomalous_records_count: number;
  normalization_method: string;
  source_benchmark: string;
  file_name: string;
  file_size_bytes: number;
  sha256_checksum: string;
  download_url: string;
  doi_citation: string | null;
  paper_reference: string;
  streaming_throughput_eps: string | null;
  short_description: string;
  download_count: number;
  created_at: string;
}

/* ---------- Visual Threat Blueprints ---------- */
export interface BlueprintPosition {
  x: number;
  y: number;
  [key: string]: number;
}
export interface BlueprintNode {
  id: string;
  type: string;
  label: string;
  position: BlueprintPosition;
  config: Record<string, unknown>;
}
export interface BlueprintEdge {
  id: string;
  source_node: string;
  source_port: string;
  target_node: string;
  target_port: string;
}
export interface BlueprintSummary {
  blueprint_id: string;
  name: string;
  description: string;
  target_sites: string[];
  status: string;
  node_count: number;
  edge_count: number;
  last_deployed_at: string | null;
  compiled_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface BlueprintDetail extends BlueprintSummary {
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  compiled_yaml: string | null;
}
export interface CatalogSocket {
  name: string;
  socket_type: string;
  color: string;
  required: boolean;
  accepts: string[];
}
export interface CatalogNode {
  catalog_id: string;
  type: string;
  stage: number;
  category: string;
  label: string;
  description: string;
  default_config: Record<string, unknown>;
  inputs: CatalogSocket[];
  outputs: CatalogSocket[];
  latency_sla_ns: number | null;
}
export interface CatalogStage {
  stage: number;
  name: string;
  color: string;
  nodes: CatalogNode[];
}
export interface NodeCatalog {
  version: string;
  socket_types: Record<string, { label: string; color: string }>;
  stages: CatalogStage[];
  nodes: CatalogNode[];
}
export interface BlueprintSavePayload {
  blueprint_id?: string;
  name: string;
  description: string;
  target_sites: string[];
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}
export interface BlueprintCompileResult {
  blueprint_id: string;
  status: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  node_count: number;
  edge_count: number;
  estimated_latency_ns: number;
  compiled_yaml: string | null;
  compiled_at: string | null;
}
export interface BlueprintDeployResult {
  status: string;
  blueprint_id: string;
  deployed_at: string;
  target_sites: string[];
  nodes_targeted: number;
  broadcast_latency_ms: number;
  grpc_status: string;
  fleet_health: string;
  config_sha256: string;
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
  fleetNode: (nodeId: string, t: string | null) =>
    get<FleetNodeDetail>(`/fleet/nodes/${encodeURIComponent(nodeId)}`, t),
  restartFleetNode: (nodeId: string, reason: string, t: string | null) =>
    api.post<{ status: string; node_id: string }>(
      `/fleet/nodes/${encodeURIComponent(nodeId)}/restart`,
      { reason },
      t
    ),
  decommissionFleetNode: (nodeId: string, t: string | null) =>
    api.delete<{ status: string; node_id: string }>(
      `/fleet/nodes/${encodeURIComponent(nodeId)}`,
      t
    ),
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

  // Sentinel-Hub Store (public catalogs)
  hubPackages: (t: string | null) =>
    get<SpkgPackage[]>("/hub/packages", t),
  hubPcaps: (t: string | null) =>
    get<HubPcap[]>("/hub/pcaps", t),
  hubDatasets: (t: string | null) =>
    get<HubDataset[]>("/hub/datasets", t),

  // Threats
  threatEvents: (t: string | null) =>
    get<ThreatEvent[]>("/threats/events?limit=50", t),
  collectiveBus: (t: string | null) =>
    get<CollectiveBusEntry[]>("/threats/collective-bus?limit=20", t),
  threatGrid: (t: string | null) =>
    get<ThreatGrid>("/threats/grid", t),
  threatXai: (t: string | null) =>
    get<XAIIncident[]>("/threats/xai", t),
  vaccineFeed: (t: string | null) =>
    get<VaccineFeedItem[]>("/threats/vaccines/feed", t),
  downloadVaccine: (downloadUrl: string, t: string | null) => {
    let path = downloadUrl;
    if (/^https?:\/\//.test(path)) {
      try {
        path = new URL(path).pathname;
      } catch {
        /* keep original */
      }
    }
    path = path.replace(/^\/api\/v1/, "");
    if (!path.startsWith("/")) path = `/${path}`;
    return api.getBlob(path, t);
  },
  shareVaccine: (form: FormData, t: string | null) =>
    api.postForm<{
      status: string;
      vaccine_id: string;
      slug: string;
      name: string;
      version: string;
      severity: string;
      sha256: string;
      size_bytes: number;
      signature_verified: boolean;
      download_url: string;
      created_at: string;
    }>("/threats/vaccines/share", form, t),
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
  labBench: (t: string | null) =>
    get<LabBench>("/range/lab-bench", t),
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
  otaStage: (body: { version: string; sha256: string; url: string }, t: string | null) =>
    api.post<{ status: string; stage: string }>("/ai/ota/stage", body, t),
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

  // Visual Threat Blueprint Editor
  blueprints: (t: string | null) => get<BlueprintSummary[]>("/blueprints", t),
  blueprint: (blueprintId: string, t: string | null) =>
    get<BlueprintDetail>(`/blueprints/${encodeURIComponent(blueprintId)}`, t),
  blueprintNodeCatalog: (t: string | null) =>
    get<NodeCatalog>("/blueprints/node-catalog", t),
  saveBlueprint: (body: BlueprintSavePayload, t: string | null) =>
    api.post<BlueprintDetail>("/blueprints", body, t),
  deleteBlueprint: (blueprintId: string, t: string | null) =>
    api.delete<{ status: string; blueprint_id: string }>(
      `/blueprints/${encodeURIComponent(blueprintId)}`,
      t
    ),
  compileBlueprint: (blueprintId: string, t: string | null) =>
    api.post<BlueprintCompileResult>(
      `/blueprints/${encodeURIComponent(blueprintId)}/compile`,
      {},
      t
    ),
  deployBlueprint: (blueprintId: string, t: string | null) =>
    api.post<BlueprintDeployResult>(
      `/blueprints/${encodeURIComponent(blueprintId)}/deploy`,
      {},
      t
    ),

  trismEvaluate: (body: { prompt_text: string; user_id?: string; sanitize_pii?: boolean }, t: string | null) =>
    api.post<TrismResult>("/ai/trism/evaluate", body, t),
  trismPolicy: (t: string | null) => get<TrismPolicy>("/ai/trism/policy", t),
  updateTrismPolicy: (body: Partial<TrismPolicy>, t: string | null) =>
    api.put<TrismPolicy>("/ai/trism/policy", body, t),
  exportCompliance: (body: { framework: string; format: string; include_sla_proofs?: boolean; reporting_period_days?: number }, t: string | null) =>
    api.postBlob("/compliance/export", body, t),

  // Compliance
  nis2: (t: string | null) => get<NIS2Status>("/compliance/nis2", t),
  iec62443: (t: string | null) => get<IECStatus>("/compliance/iec62443", t),
  cmmc: (t: string | null) => get<CMMCStatus>("/compliance/cmmc", t),
  sbom: (t: string | null) => get<SBOM>("/compliance/sbom", t),
  sbomDriftEvents: (t: string | null) =>
    get<SbomDriftEvent[]>("/compliance/sbom/drift-events?limit=50", t),
  fiveGSlicing: (t: string | null) =>
    get<FiveGSlicingStatus>("/compliance/5g-slicing", t),
  fiveGTelemetry: (t: string | null) =>
    get<FiveGTelemetry>("/telemetry/5g-slices", t),
  satellites: (t: string | null) =>
    get<Satellite[]>("/cps/space/satellites", t),
  telecommandAudits: (t: string | null) =>
    get<TelecommandAudit[]>("/cps/space/telecommand-audits?limit=50", t),
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

  // Licensing — manager + generator (community + commercial)
  licenses: (
    t: string | null,
    params?: { status?: string; kind?: string; plan?: string; scope?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.kind) q.set("kind", params.kind);
    if (params?.plan) q.set("plan", params.plan);
    if (params?.scope) q.set("scope", params.scope);
    const qs = q.toString();
    return get<LicenseItem[]>(`/licenses${qs ? `?${qs}` : ""}`, t);
  },
  licenseDetail: (ref: string, t: string | null) =>
    get<LicenseDetail>(`/licenses/${encodeURIComponent(ref)}`, t),
  subscribeLicense: (
    body: { plan_slug: string; hardware_token: string; hostname?: string; customer_name?: string; days_valid?: number; max_nodes?: number },
    t: string | null
  ) => api.post<LicenseEnvelopeResult>("/licenses/subscribe", body, t),
  revokeLicense: (ref: string, t: string | null) =>
    api.post<LicenseItem>(`/licenses/${encodeURIComponent(ref)}/revoke`, {}, t),
  verifyLicense: (ref: string, t: string | null) =>
    get<{ license_id: string; signature_valid: boolean; status: string }>(
      `/licenses/verify/${encodeURIComponent(ref)}`, t
    ),
  downloadLicense: async (hardwareToken: string, t: string | null): Promise<{ blob: Blob; filename: string }> => {
    const base = API_BASE_URL;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (t) headers["Authorization"] = `Bearer ${t}`;
    try {
      const { getSelectedTenant } = await import("./tenant");
      const selected = getSelectedTenant();
      if (selected) headers["X-Tenant-ID"] = selected;
    } catch {
      /* no tenant context */
    }
    const res = await fetch(`${base}/licenses/portal-download`, {
      method: "POST",
      body: JSON.stringify({ hardware_token: hardwareToken }),
      headers,
    });
    if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
    const cd = res.headers.get("content-disposition") || "";
    const m = /filename=([^;]+)/.exec(cd);
    return { blob: await res.blob(), filename: (m?.[1] || "license.lic").trim() };
  },
  auditLogs: (t: string | null) =>
    get<AuditLog[]>("/settings/audit-logs?page=1&limit=50", t),
};
