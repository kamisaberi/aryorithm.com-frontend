import { api, HUB_API_BASE_URL } from "./api";

/* ---------- Catalog ---------- */
export interface HubAuthor {
  name: string;
  avatar_url: string;
  verified: boolean;
  github_handle: string;
  website: string;
}

export interface HubMetrics {
  install_count: number;
  stars: number;
  fast_path_latency_us: number | null;
}

export interface HubActiveVersion {
  version: string;
  release_date: string;
  package_size_bytes: number;
  sha256: string;
  min_sentinel_version: string;
  download_url: string;
}

export interface PluginItem {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  category: string;
  runtime: string;
  supported_silicon: string[];
  verification_tier: string;
  author: HubAuthor;
  metrics: HubMetrics;
  active_version: HubActiveVersion | null;
  ports: number[];
  tags: string[];
}

export interface PaginatedPlugins {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: PluginItem[];
}

export interface Facets {
  categories: Record<string, number>;
  runtimes: Record<string, number>;
  silicon_targets: Record<string, number>;
  verification_tiers: Record<string, number>;
}

export interface PluginDetail extends PluginItem {
  security_envelope: {
    requires_ebpf?: boolean;
    required_capabilities?: string[];
    requires_tpm_attestation?: boolean;
    network_egress_allowed?: boolean;
    max_memory_mb?: number;
    ebpf_maps_requested?: string[];
    tpm_compatibility?: string[];
  };
  install_commands: { sentinel_cli: string; nexus_cli: string };
  repository_url: string;
}

export interface VersionSummary {
  version: string;
  release_date: string;
  sha256: string;
  changelog: string;
  yanked: boolean;
}

export interface VersionDetail extends VersionSummary {
  slug: string;
  min_sentinel_version: string;
  package_size_bytes: number;
  dependencies: unknown[];
  download_url: string;
}

export interface SecurityEnvelope {
  slug: string;
  version: string;
  provenance: {
    signer_public_key?: string;
    signature_algorithm?: string;
    verified_by_aryorithm?: boolean;
    build_reproducibility?: string;
  };
  runtime_privileges: {
    linux_capabilities?: { name: string; justification: string }[];
    ebpf_maps_requested?: string[];
    zero_cloud_egress_verified?: boolean;
    max_memory_allocated_mb?: number;
    tpm_compatibility?: string[];
  };
}

/* ---------- Registry ---------- */
export interface LintIssue {
  field?: string;
  code?: string;
  message: string;
}

export interface LintResult {
  valid: boolean;
  warnings: LintIssue[];
  errors?: LintIssue[];
  parsed_metadata: { id?: string; version?: string; runtime?: string };
}

export interface UpdateAvailable {
  slug: string;
  current_version: string;
  latest_version: string;
  critical_security_update: boolean;
  sha256: string;
  download_url: string;
}

/* ---------- Sentinel packages (verified `.spkg` catalog) ---------- */
export interface SentinelPackage {
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

export const PACKAGE_TIERS = ["native", "wasm", "lua"] as const;

export interface PackageQuery {
  sector?: string;
  tier?: string;
  search?: string;
}

/* ---------- Filter vocabularies (mirror backend) ---------- */
export const CATEGORIES = [
  "industrial-ot",
  "energy-utilities",
  "healthcare-iot",
  "aviation-defense",
  "ai-models",
  "wasm-micro-rules",
] as const;

export const RUNTIMES = ["NATIVE_CPP20", "WASM_SANDBOX", "LUAJIT", "ONNX_NEURAL_WEIGHTS"] as const;

export const SILICON_TARGETS = [
  "UNIVERSAL",
  "INTEL_OPENVINO",
  "NVIDIA_TENSORRT",
  "ROCKCHIP_RKNN",
  "HAILO_HAILORT",
] as const;

export const VERIFICATION_TIERS = [
  "OFFICIAL_CORE",
  "ENTERPRISE_AUDITED",
  "COMMUNITY_VERIFIED",
  "EXPERIMENTAL",
] as const;

export const SORTS = [
  { value: "popular", label: "Most Popular" },
  { value: "recent", label: "Recently Added" },
  { value: "latency", label: "Fastest Fast-Path" },
  { value: "alpha", label: "Alphabetical" },
] as const;

export interface CatalogQuery {
  q?: string;
  category?: string;
  runtime?: string;
  silicon?: string;
  tier?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

/** Typed client over the Hub backend. Throws ApiError on failure. */
export const hub = {
  plugins: (params?: CatalogQuery) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.category) q.set("category", params.category);
    if (params?.runtime) q.set("runtime", params.runtime);
    if (params?.silicon) q.set("silicon", params.silicon);
    if (params?.tier) q.set("tier", params.tier);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api.get<PaginatedPlugins>(`/plugins${qs ? `?${qs}` : ""}`);
  },
  featured: () => api.get<PluginItem[]>("/plugins/featured"),
  facets: () => api.get<Facets>("/plugins/facets"),
  detail: (slug: string) => api.get<PluginDetail>(`/plugins/${encodeURIComponent(slug)}`),
  readme: (slug: string, version?: string) =>
    api.get<{ version: string; content_markdown: string }>(
      `/plugins/${encodeURIComponent(slug)}/readme${version ? `?version=${encodeURIComponent(version)}` : ""}`
    ),
  manifest: (slug: string, version?: string) =>
    api.get<{ version: string; raw_yaml: string; parsed_json: Record<string, unknown> }>(
      `/plugins/${encodeURIComponent(slug)}/manifest${version ? `?version=${encodeURIComponent(version)}` : ""}`
    ),
  versions: (slug: string) =>
    api.get<{ slug: string; versions: VersionSummary[] }>(`/plugins/${encodeURIComponent(slug)}/versions`),
  versionDetail: (slug: string, version: string) =>
    api.get<VersionDetail>(`/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`),
  security: (slug: string, version: string) =>
    api.get<SecurityEnvelope>(`/plugins/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/security`),
  validate: (manifest_yaml: string) => api.post<LintResult>("/registry/validate", { manifest_yaml }),
  checkUpdates: (body: { sentinel_version?: string; installed_plugins: { slug: string; current_version: string }[] }) =>
    api.post<{ updates_available: UpdateAvailable[] }>("/sync/check-updates", body),
  airgapBundle: (body: { requested_plugins: { slug: string; version: string }[]; target_silicon?: string }) =>
    api.download("/sync/airgap-bundle", body),
  recordInstall: (body: { slug: string; version?: string; silicon_target?: string }) =>
    api.post<{ status: string }>("/telemetry/install", body),
  sentinelPackages: (params?: PackageQuery) => {
    const q = new URLSearchParams();
    if (params?.sector) q.set("sector", params.sector);
    if (params?.tier) q.set("tier", params.tier);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return api.get<SentinelPackage[]>(`/hub/packages${qs ? `?${qs}` : ""}`);
  },
  sentinelPackage: (slug: string) =>
    api.get<SentinelPackage>(`/hub/packages/${encodeURIComponent(slug)}`),
};

/* ---------- Cloud Model Vault ---------- */
export interface VaultArtifact {
  format: string;
  precision: string;
  file_name: string;
  file_size_bytes: number;
  sha256_checksum: string;
  signature_ed25519: string;
  target_hardware: string;
  download_count: number;
  download_url: string;
}

export interface VaultVersion {
  version: string;
  rollout_stage: string;
  golden_safety_verified: boolean;
  golden_recall_score: number | null;
  base_accuracy: number | null;
  p99_latency_ns: number;
  training_dataset_summary: string;
  release_notes: string;
  artifacts: VaultArtifact[];
}

export interface VaultModel {
  id: string;
  slug: string;
  name: string;
  tier: string;
  domain: string;
  architecture: string;
  author: string;
  short_description: string;
  technical_description: string;
  input_tensor_shape: string;
  output_tensor_shape: string;
  versions: VaultVersion[];
}

export interface VaultCatalogItem {
  id: string;
  slug: string;
  name: string;
  domain: string;
  latest_version: string | null;
  available_formats: string[];
  p99_latency_ns: number | null;
  golden_safety_verified: boolean;
}

export interface VaultCatalog {
  total: number;
  models: VaultCatalogItem[];
}

export const VAULT_DOMAINS = ["NETWORK_DETECTION", "SCADA_PHYSICAL", "ENCRYPTED_TRAFFIC"] as const;
export const VAULT_FORMATS = ["ONNX", "SAFETENSORS", "OPENVINO_IR", "TENSORRT_ENGINE", "RKNN", "HAILO_HEF"] as const;
export const VAULT_TIERS = ["FOUNDATION", "COMMUNITY", "ENTERPRISE_CUSTOM"] as const;
export const VAULT_STAGES = [
  "DEVELOPMENT",
  "SHADOW_MODE",
  "CANARY_5_PERCENT",
  "FLEET_PRODUCTION",
  "DEPRECATED",
] as const;

/** Typed client over the Cloud Model Vault API. Throws ApiError on failure. */
export const vault = {
  catalog: (params?: { domain?: string; format?: string; tier?: string; stage?: string }) => {
    const q = new URLSearchParams();
    if (params?.domain) q.set("domain", params.domain);
    if (params?.format) q.set("format", params.format);
    if (params?.tier) q.set("tier", params.tier);
    if (params?.stage) q.set("stage", params.stage);
    const qs = q.toString();
    return api.get<VaultCatalog>(`/model-vault${qs ? `?${qs}` : ""}`);
  },
  detail: (slug: string) => api.get<VaultModel>(`/model-vault/${encodeURIComponent(slug)}`),
};

/* ---------- Hub Library: PCAP vault / SLAB datasets / twin scenarios ---------- */
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

export interface HubScenario {
  id: string;
  slug: string;
  name: string;
  complexity: string;
  target_sector: string;
  network_subnet: string;
  node_topology: Record<string, { ip: string; role: string }>;
  replayed_attacks: string[];
  expected_mitigation_sla: string;
  file_name: string;
  file_size_bytes: number;
  sha256_checksum: string;
  download_url: string;
  cli_pull_command: string;
  short_description: string;
  technical_walkthrough: string;
  download_count: number;
  created_at: string;
}

export const PCAP_CATEGORIES = ["SCADA_ICS", "MALWARE_C2", "EXPLOIT_DOS", "HEALTHCARE_IOMT", "AEROSPACE_UAV"] as const;
export const DATASET_FORMATS = ["SLAB_BINARY", "PCAP_RAW", "PARQUET_COMPACT", "NETFLOW_IPFIX"] as const;
export const SCENARIO_COMPLEXITIES = ["STARTER", "INTERMEDIATE", "ADVANCED_RED_TEAM"] as const;

export const library = {
  pcaps: (params?: { category?: string; protocol?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.protocol) q.set("protocol", params.protocol);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return api.get<HubPcap[]>(`/hub/pcaps${qs ? `?${qs}` : ""}`);
  },
  pcap: (slug: string) => api.get<HubPcap>(`/hub/pcaps/${encodeURIComponent(slug)}`),
  datasets: (params?: { format?: string; dimension?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.format) q.set("format", params.format);
    if (params?.dimension !== undefined) q.set("dimension", String(params.dimension));
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return api.get<HubDataset[]>(`/hub/datasets${qs ? `?${qs}` : ""}`);
  },
  dataset: (slug: string) => api.get<HubDataset>(`/hub/datasets/${encodeURIComponent(slug)}`),
  scenarios: (params?: { sector?: string; complexity?: string }) => {
    const q = new URLSearchParams();
    if (params?.sector) q.set("sector", params.sector);
    if (params?.complexity) q.set("complexity", params.complexity);
    const qs = q.toString();
    return api.get<HubScenario[]>(`/hub/scenarios${qs ? `?${qs}` : ""}`);
  },
  scenario: (slug: string) => api.get<HubScenario>(`/hub/scenarios/${encodeURIComponent(slug)}`),
};

/* ==========================================================================
   Unified catalog, production blueprints and official appliances
   ========================================================================== */

export type HubAssetType =
  | "package"
  | "model"
  | "dataset"
  | "pcap"
  | "scenario"
  | "blueprint"
  | "appliance";

export interface HubAssetListItem {
  id: string;
  slug: string;
  name: string;
  asset_type: string;
  tier: string;
  version: string;
  author: string;
  author_public_key: string;
  target_protocol: string;
  latency_sla_ns: number;
  downloads: number;
  size_bytes: number;
  verified_signature: boolean;
  compliance: string[];
  published_at: string;
  description: string;
  industry: string;
  download_url: string;
}

export interface HubAssetDetail extends HubAssetListItem {
  merkle_sha256: string;
  signature_status: string;
  file_size: number;
  manifest: Record<string, unknown>;
  readme_url: string;
  sla_url: string;
  signature_url: string;
}

export interface HubAssetSla {
  slug: string;
  asset_type: string;
  verified: boolean;
  latency_sla_ns: number | null;
  latency_display: string;
  compliance: string[];
  benchmark: Record<string, unknown>;
  published_at: string;
}

export interface HubAssetReadme {
  slug: string;
  asset_type: string;
  name: string;
  version: string;
  format: string;
  content_markdown: string;
}

export interface HubCategoryCount {
  name: string;
  count: number;
}

export interface HubCategories {
  total: number;
  asset_types: { asset_type: string; count: number }[];
  categories: HubCategoryCount[];
  industries: HubCategoryCount[];
  compliance: HubCategoryCount[];
  target_protocols: HubCategoryCount[];
}

export interface HubSearchResult {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  results: HubAssetListItem[];
}

export interface HubSearchQuery {
  q?: string;
  type?: Exclude<HubAssetType, "appliance"> | "all";
  industry?: string;
  page?: number;
  limit?: number;
  sort?: "downloads" | "latest" | "name" | "sla";
}

export const hubAssets = {
  search: (params?: HubSearchQuery) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.type && params.type !== "all") q.set("type", params.type);
    if (params?.industry) q.set("industry", params.industry);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sort) q.set("sort", params.sort);
    const qs = q.toString();
    return api.get<HubSearchResult>(`/hub/search${qs ? `?${qs}` : ""}`);
  },
  categories: () => api.get<HubCategories>("/hub/categories"),
  detail: (assetType: string, slug: string) =>
    api.get<HubAssetDetail>(
      `/hub/assets/${encodeURIComponent(assetType)}/${encodeURIComponent(slug)}`
    ),
  readme: (assetType: string, slug: string) =>
    api.get<HubAssetReadme>(
      `/hub/assets/${encodeURIComponent(assetType)}/${encodeURIComponent(slug)}/readme`
    ),
  sla: (assetType: string, slug: string) =>
    api.get<HubAssetSla>(
      `/hub/assets/${encodeURIComponent(assetType)}/${encodeURIComponent(slug)}/sla`
    ),
};

export interface BlueprintDependencies {
  packages: string[];
  models: string[];
}

export interface BlueprintListItem {
  slug: string;
  name: string;
  version: string;
  target_site: string | null;
  industry: string;
  target_architecture: string;
  primary_interface: string;
  max_pipeline_latency_us: number;
  downloads: number;
  verified_signature: boolean;
  author: string;
  author_public_key: string;
  dependencies: BlueprintDependencies;
  download_url: string;
  published_at: string;
}

export interface BlueprintDetail extends BlueprintListItem {
  description: string;
  file_size_bytes: number;
  sha256: string;
  hardware_binding: Record<string, unknown>;
  sla_guarantees: Record<string, unknown>;
  raw_dag_url: string;
}

export interface BlueprintListResult {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  results: BlueprintListItem[];
}

export interface BlueprintQuery {
  q?: string;
  industry?: string;
  target_arch?: string;
  page?: number;
  limit?: number;
  sort?: "downloads" | "latest" | "name" | "sla";
}

export const blueprints = {
  list: (params?: BlueprintQuery) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.industry) q.set("industry", params.industry);
    if (params?.target_arch) q.set("target_arch", params.target_arch);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sort) q.set("sort", params.sort);
    const qs = q.toString();
    return api.get<BlueprintListResult>(`/hub/blueprints${qs ? `?${qs}` : ""}`);
  },
  detail: (slug: string) =>
    api.get<BlueprintDetail>(`/hub/blueprints/${encodeURIComponent(slug)}`),
  rawDag: async (slug: string): Promise<string> => {
    const res = await fetch(
      `${HUB_API_BASE_URL}/hub/blueprints/${encodeURIComponent(slug)}/raw-dag`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error(`Raw DAG unavailable (${res.status})`);
    return res.text();
  },
};

export interface ApplianceArchitecture {
  id: string;
  label: string;
  target_hardware: string;
  recommended_for: string;
}

export interface ApplianceIndustry {
  id: string;
  label: string;
  protocols: string[];
}

export interface ApplianceLicense {
  id: string;
  label: string;
  node_limit: number;
}

export interface ApplianceMatrix {
  latest_version: string;
  supported_architectures: ApplianceArchitecture[];
  supported_industries: ApplianceIndustry[];
  supported_licenses: ApplianceLicense[];
}

export interface ApplianceRelease {
  slug: string;
  title: string;
  version: string;
  architecture: string;
  industry: string;
  license_tier: string;
  file_name: string;
  file_size_bytes: number;
  sha256_checksum: string;
  authority_signature: string;
  verified_health_checks: string;
  download_url: string;
  install_command: string;
  published_at: string;
}

export interface ApplianceListResult {
  total: number;
  releases: ApplianceRelease[];
}

export interface ApplianceDetail extends ApplianceRelease {
  download_count: number;
  is_active: boolean;
}

export const appliances = {
  matrix: () => api.get<ApplianceMatrix>("/hub/appliances/matrix"),
  list: (params?: { arch?: string; industry?: string; license?: string; version?: string }) => {
    const q = new URLSearchParams();
    if (params?.arch) q.set("arch", params.arch);
    if (params?.industry) q.set("industry", params.industry);
    if (params?.license) q.set("license", params.license);
    if (params?.version) q.set("version", params.version);
    const qs = q.toString();
    return api.get<ApplianceListResult>(`/hub/appliances${qs ? `?${qs}` : ""}`);
  },
  detail: (slug: string) =>
    api.get<ApplianceDetail>(`/hub/appliances/${encodeURIComponent(slug)}`),
};
