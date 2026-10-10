import { api } from "./api";

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
};
