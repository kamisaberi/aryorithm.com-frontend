"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import { compact } from "@/lib/format";
import {
  appliances,
  blueprints,
  hubAssets,
  type ApplianceRelease,
  type BlueprintListItem,
  type HubAssetType,
  type HubCategories,
  type HubAssetListItem,
} from "@/lib/hub";

type CatalogKind = HubAssetType | "all";
type SortKey = "downloads" | "latest" | "name" | "sla";

interface CatalogItem extends HubAssetListItem {
  target_architecture: string;
}

const TYPES: { id: CatalogKind; label: string; icon: string }[] = [
  { id: "all", label: "All Assets", icon: "▦" },
  { id: "package", label: "Packages", icon: "◈" },
  { id: "model", label: "Models", icon: "⬡" },
  { id: "dataset", label: "Datasets", icon: "▤" },
  { id: "pcap", label: "PCAPs", icon: "⇄" },
  { id: "scenario", label: "Scenarios", icon: "⬣" },
  { id: "blueprint", label: "Blueprints", icon: "⌗" },
  { id: "appliance", label: "Appliances", icon: "▣" },
];

const TYPE_PATHS: Record<HubAssetType, string> = {
  package: "/packages",
  model: "/models",
  dataset: "/datasets",
  pcap: "/pcaps",
  scenario: "/scenarios",
  blueprint: "/blueprints",
  appliance: "/appliances",
};

interface UniversalCatalogViewProps {
  /** Lock the catalog to one asset type and expose it at a dedicated route. */
  fixedType?: HubAssetType;
  eyebrow?: string;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
}

const ARCHITECTURES = [
  { id: "x86_64", label: "x86_64 (OpenVINO / Generic)" },
  { id: "aarch64", label: "aarch64 (Jetson / Rockchip)" },
  { id: "universal", label: "Universal" },
];

const FALLBACK_INDUSTRIES = [
  "water",
  "energy",
  "manufacturing",
  "oil-gas",
  "aerospace",
  "defense",
  "healthcare",
  "industrial-ot",
];

const FALLBACK_PROTOCOLS = [
  "MODBUS_TCP",
  "S7COMM",
  "IEC_104",
  "GTP_U",
  "CCSDS",
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "downloads", label: "Most Popular" },
  { value: "latest", label: "Recently Published" },
  { value: "name", label: "Alphabetical" },
  { value: "sla", label: "Lowest Latency SLA" },
];

const TIER_LABELS: Record<string, string> = {
  native: "Tier A · Native C++20",
  wasm: "Tier B · Rust WebAssembly",
  lua: "Tier C · LuaJIT Dynamic",
  blueprint: "Production blueprint",
  community: "Community appliance",
  enterprise: "Enterprise appliance",
  sovereign: "Sovereign appliance",
};

function pretty(value: string): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function cliFor(item: Pick<CatalogItem, "asset_type" | "slug">): string {
  switch (item.asset_type) {
    case "package":
      return `aryo package pull ${item.slug}`;
    case "model":
      return `aryo model pull ${item.slug}`;
    case "dataset":
      return `aryo dataset pull ${item.slug}`;
    case "pcap":
      return `aryo pcap pull ${item.slug}`;
    case "scenario":
      return `aryo scenario pull ${item.slug}`;
    case "blueprint":
      return `aryo blueprint deploy ${item.slug}`;
    case "appliance":
      return `aryo appliance install ${item.slug}`;
    default:
      return `aryo pull ${item.slug}`;
  }
}

function latencyLabel(ns: number): string {
  if (!ns) return "—";
  if (ns >= 1000) {
    const us = ns / 1000;
    return `< ${us >= 10 ? us.toFixed(0) : us.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} µs`;
  }
  return `< ${ns} ns`;
}

function blueprintToItem(row: BlueprintListItem): CatalogItem {
  return {
    id: `blueprint-${row.slug}`,
    slug: row.slug,
    name: row.name,
    asset_type: "blueprint",
    tier: "blueprint",
    version: row.version,
    author: row.author,
    author_public_key: row.author_public_key,
    target_protocol: row.target_site || row.industry,
    latency_sla_ns: Math.round((row.max_pipeline_latency_us || 0) * 1000),
    downloads: row.downloads,
    size_bytes: 0,
    verified_signature: row.verified_signature,
    compliance: [],
    published_at: row.published_at,
    description: row.target_site
      ? `Production blueprint for ${row.target_site}.`
      : "Signed production-site pipeline blueprint.",
    industry: row.industry,
    download_url: row.download_url,
    target_architecture: row.target_architecture || "universal",
  };
}

function applianceToItem(row: ApplianceRelease): CatalogItem {
  return {
    id: `appliance-${row.slug}`,
    slug: row.slug,
    name: row.title,
    asset_type: "appliance",
    tier: row.license_tier,
    version: row.version,
    author: "Aryorithm Authority",
    author_public_key: "",
    target_protocol: "aryopack",
    latency_sla_ns: 0,
    downloads: 0,
    size_bytes: row.file_size_bytes,
    verified_signature: true,
    compliance: [],
    published_at: row.published_at,
    description: `Official, root-signed .aryopack image for ${pretty(row.industry)} and ${pretty(
      row.architecture
    )} targets.`,
    industry: row.industry,
    download_url: row.download_url,
    target_architecture: row.architecture,
  };
}

function asItem(item: HubAssetListItem): CatalogItem {
  const manifest = (item as unknown as { manifest?: Record<string, unknown> }).manifest;
  const raw =
    (manifest?.target_architecture as string | undefined) ||
    (manifest?.target_arch as string | undefined) ||
    (manifest?.architecture as string | undefined) ||
    (manifest?.target_hardware as string | undefined) ||
    "";
  return {
    ...item,
    target_architecture: raw ? raw.toLowerCase() : "universal",
  };
}

function TypeIcon({ type }: { type: string }) {
  const found = TYPES.find((t) => t.id === type);
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan/10 font-display text-[14px] font-bold text-cyan"
      aria-hidden="true"
    >
      {found?.icon ?? "◇"}
    </span>
  );
}

function FacetGroup({
  title,
  values,
  active,
  onPick,
}: {
  title: string;
  values: { id: string; label: string; count?: number }[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="border-b border-hairline/70 px-4 py-4 last:border-0">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {title}
      </h3>
      <ul className="mt-2.5 space-y-1.5">
        <li>
          <button
            type="button"
            onClick={() => onPick("all")}
            className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[12px] transition-colors ${
              active === "all" ? "bg-cyan/10 text-cyan" : "text-muted hover:text-ink"
            }`}
          >
            <span>All</span>
          </button>
        </li>
        {values.map((v) => {
          const on = active === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onPick(on ? "all" : v.id)}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[12px] transition-colors ${
                  on ? "bg-cyan/10 text-cyan" : "text-muted hover:text-ink"
                }`}
              >
                <span className="truncate">{v.label}</span>
                {v.count !== undefined && (
                  <span className="font-mono text-[10px] text-muted/70">{v.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function UniversalCatalogView({
  fixedType,
  eyebrow,
  title,
  description,
  searchPlaceholder,
}: UniversalCatalogViewProps) {
  const params = useSearchParams();
  const [kind, setKind] = useState<CatalogKind>(
    fixedType ?? ((params.get("type") as CatalogKind) || "all")
  );
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) || "downloads");
  const [industry, setIndustry] = useState(params.get("industry") ?? params.get("sector") ?? "all");
  const [tier, setTier] = useState(params.get("tier") ?? "all");
  const [architecture, setArchitecture] = useState("all");
  const [compliance, setCompliance] = useState("all");
  const [protocol, setProtocol] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<HubCategories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedType) {
      setKind(fixedType);
    } else {
      const nextKind = params.get("type");
      setKind(
        TYPES.some((item) => item.id === nextKind)
          ? (nextKind as CatalogKind)
          : "all"
      );
    }
    setQuery(params.get("q") ?? params.get("search") ?? "");
    setIndustry(params.get("industry") ?? params.get("sector") ?? "all");
    setTier(params.get("tier") ?? "all");
    const nextSort = params.get("sort");
    setSort(
      SORTS.some((item) => item.value === nextSort)
        ? (nextSort as SortKey)
        : "downloads"
    );
  }, [params, fixedType]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      hubAssets.search({ limit: 100, sort: "downloads" }).catch(() => null),
      blueprints.list({ limit: 100, sort: "downloads" }).catch(() => null),
      appliances.list().catch(() => null),
      hubAssets.categories().catch(() => null),
    ])
      .then(([search, blueprintResult, applianceResult, cats]) => {
        if (cancelled) return;
        const unified = (search?.results || []).map(asItem);
        const extra = (blueprintResult?.results || []).map(blueprintToItem);
        const applianceItems = (applianceResult?.releases || []).map(applianceToItem);
        setItems([...unified, ...extra, ...applianceItems]);
        if (cats) setCategories(cats);
        const failed = [search, blueprintResult, applianceResult].filter(
          (result) => result === null
        ).length;
        if (failed === 3) {
          setError("The Hub registry is unreachable.");
        } else if (failed > 0) {
          setError("Some registry endpoints are temporarily unavailable; showing partial results.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "The catalog could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [kind, query, sort, industry, tier, architecture, compliance, protocol, limit]);

  const industryValues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of categories?.industries ?? []) {
      counts.set(row.name.toLowerCase(), row.count);
    }
    for (const item of items) {
      if (item.industry) {
        const key = item.industry.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    if (counts.size === 0) {
      return FALLBACK_INDUSTRIES.map((id) => ({ id, label: pretty(id) }));
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: pretty(id), count }));
  }, [categories, items]);

  const tierValues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = String(item.tier || "").toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: TIER_LABELS[id] || pretty(id), count }));
  }, [items]);

  const complianceValues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of categories?.compliance ?? []) counts.set(row.name, row.count);
    for (const item of items) {
      for (const tag of item.compliance || []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: id, count }));
  }, [categories, items]);

  const protocolValues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of categories?.target_protocols ?? []) counts.set(row.name, row.count);
    for (const item of items) {
      if (item.target_protocol) {
        const key = item.target_protocol;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    if (counts.size === 0) {
      return FALLBACK_PROTOCOLS.map((id) => ({ id, label: id.replace(/_/g, " ") }));
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: id.replace(/_/g, " "), count }));
  }, [categories, items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (kind !== "all" && item.asset_type !== kind) return false;
      if (industry !== "all") {
        const hay = `${item.industry} ${item.description} ${item.target_protocol}`.toLowerCase();
        const needles = industry
          .toLowerCase()
          .split(/[,&]/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (!needles.some((part) => hay.includes(part))) return false;
      }
      if (architecture !== "all" && architecture !== "universal") {
        if (!item.target_architecture.toLowerCase().includes(architecture)) return false;
      }
      if (architecture === "universal") {
        const arch = item.target_architecture.toLowerCase();
        if (arch && !arch.includes("universal") && arch !== "generic") return false;
      }
      if (compliance !== "all" && !(item.compliance || []).includes(compliance)) return false;
      if (tier !== "all" && String(item.tier || "").toLowerCase() !== tier) return false;
      if (protocol !== "all" && item.target_protocol !== protocol) return false;
      if (!needle) return true;
      const haystack = [
        item.name,
        item.slug,
        item.description,
        item.author,
        item.industry,
        item.target_protocol,
        item.asset_type,
        item.version,
        ...(item.compliance || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });

    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "latest") return b.published_at.localeCompare(a.published_at);
      if (sort === "sla") {
        const av = a.latency_sla_ns || Number.MAX_SAFE_INTEGER;
        const bv = b.latency_sla_ns || Number.MAX_SAFE_INTEGER;
        return av - bv;
      }
      return b.downloads - a.downloads;
    });
  }, [items, kind, query, sort, industry, tier, architecture, compliance, protocol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-20 pt-24 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
            {eyebrow ?? "// Universal Registry"}
          </p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight text-ink lg:text-[40px]">
            {title ?? "Explore the verified mesh."}
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            {description ??
              "Search every signed asset type across the Aryorithm ecosystem — extensions, neural models, telemetry datasets, packet captures, cyber-range scenarios, production blueprints and official .aryopack appliances."}
          </p>
        </div>
        <div className="rounded-md border border-kernel/30 bg-kernel/5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-kernel">
          Ed25519 verified · air-gapped first
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-md border border-hairline bg-panel lg:sticky lg:top-24">
          <div className="border-b border-hairline/70 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink">
              Filter catalog
            </p>
          </div>
          <FacetGroup
            title="Industry / Sector"
            values={industryValues}
            active={industry}
            onPick={setIndustry}
          />
          <FacetGroup
            title="Runtime Tier"
            values={tierValues}
            active={tier}
            onPick={setTier}
          />
          <FacetGroup
            title="Target Architecture"
            values={ARCHITECTURES.map((a) => ({ id: a.id, label: a.label }))}
            active={architecture}
            onPick={setArchitecture}
          />
          <FacetGroup
            title="Compliance"
            values={complianceValues}
            active={compliance}
            onPick={setCompliance}
          />
          <FacetGroup
            title="Protocol"
            values={protocolValues}
            active={protocol}
            onPick={setProtocol}
          />
        </aside>

        <section className="min-w-0">
          <div className="rounded-md border border-hairline bg-panel p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Search assets</span>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted">
                  ⌕
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder ?? "Search slug, name, author, protocol…"}
                  className="w-full rounded-md border border-hairline bg-void py-2.5 pl-9 pr-3 text-[13px] text-ink placeholder:text-muted/60 focus:border-cyan/60 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-md border border-hairline bg-void px-2.5 py-2 font-mono text-[11px] text-ink focus:border-cyan/60 focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fixedType
                ? TYPES.filter((t) => t.id !== "all").map((t) => {
                    const on = fixedType === t.id;
                    const count = items.filter((i) => i.asset_type === t.id).length;
                    return (
                      <Link
                        key={t.id}
                        href={TYPE_PATHS[t.id as HubAssetType]}
                        aria-current={on ? "page" : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          on
                            ? "border-cyan/50 bg-cyan/10 text-cyan"
                            : "border-hairline text-muted hover:border-cyan/30 hover:text-ink"
                        }`}
                      >
                        <span aria-hidden="true">{t.icon}</span>
                        {t.label}
                        <span className="text-[9px] opacity-70">{count}</span>
                      </Link>
                    );
                  })
                : TYPES.map((t) => {
                    const on = kind === t.id;
                    const count =
                      t.id === "all"
                        ? items.length
                        : items.filter((i) => i.asset_type === t.id).length;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setKind(t.id)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          on
                            ? "border-cyan/50 bg-cyan/10 text-cyan"
                            : "border-hairline text-muted hover:border-cyan/30 hover:text-ink"
                        }`}
                      >
                        <span aria-hidden="true">{t.icon}</span>
                        {t.label}
                        <span className="text-[9px] opacity-70">{count}</span>
                      </button>
                    );
                  })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
              {filtered.length} verified asset{filtered.length === 1 ? "" : "s"}
              {query ? ` for “${query}”` : ""}
            </p>
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Per page
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded border border-hairline bg-void px-2 py-1 font-mono text-[11px] text-ink focus:border-cyan/60 focus:outline-none"
              >
                {[12, 24, 48].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-telemetry/30 bg-telemetry/10 px-4 py-3 text-[12.5px] text-telemetry">
              Live catalog unavailable: {error}. Showing locally known results.
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {loading ? (
              <SkeletonGrid count={6} />
            ) : visible.length === 0 ? (
              <div className="sm:col-span-2 2xl:col-span-3 rounded-md border border-dashed border-hairline bg-panel/50 px-6 py-14 text-center">
                <p className="font-display text-[16px] font-semibold text-ink">
                  No assets match those filters.
                </p>
                <p className="mt-2 text-[12.5px] text-muted">
                  Clear a facet or search for a different name, protocol or slug.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setIndustry("all");
                    setTier("all");
                    setArchitecture("all");
                    setCompliance("all");
                    setProtocol("all");
                    setKind(fixedType ?? "all");
                  }}
                  className="mt-4 rounded-md border border-cyan/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:bg-cyan/10"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              visible.map((item) => (
                <article
                  key={`${item.asset_type}-${item.slug}`}
                  className="group flex flex-col rounded-md border border-hairline bg-panel p-4 transition-colors hover:border-cyan/40"
                >
                  <div className="flex items-start gap-3">
                    <TypeIcon type={item.asset_type} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/assets/${item.asset_type}/${item.slug}`}
                        className="block truncate font-display text-[14px] font-bold text-ink transition-colors group-hover:text-cyan"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted">v{item.version || "—"}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-cyan">
                          {item.asset_type}
                        </span>
                      </div>
                    </div>
                    <span className="tabular font-mono text-[10px] text-muted">
                      ↓ {compact(item.downloads || 0)}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[12px] leading-relaxed text-muted">
                    {item.description || "No description published."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant={item.verified_signature ? "kernel" : "telemetry"}>
                      {item.verified_signature ? "Ed25519 Verified" : "Unsigned"}
                    </Badge>
                    {item.industry && <Badge variant="muted">{pretty(item.industry)}</Badge>}
                    <Badge variant="cyan">
                      {item.target_architecture === "universal"
                        ? "Universal"
                        : pretty(item.target_architecture)}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 rounded border border-hairline/70 bg-void/50 px-2 py-1.5">
                    <code className="truncate font-mono text-[10px] text-kernel">
                      {cliFor(item)}
                    </code>
                    <CopyButton text={cliFor(item)} label="CLI" className="shrink-0" />
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-hairline/70 pt-3">
                    <span className="truncate font-mono text-[10px] text-muted">
                      {item.slug}
                    </span>
                    <CopyButton text={item.slug} label="Slug" className="ml-auto shrink-0" />
                    <Link
                      href={`/assets/${item.asset_type}/${item.slug}`}
                      className="shrink-0 rounded-md border border-cyan/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10"
                    >
                      Inspect →
                    </Link>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-muted">
                    <span>{latencyLabel(item.latency_sla_ns)}</span>
                    <span className="truncate">{item.target_protocol || "all protocols"}</span>
                  </div>
                </article>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Catalog pagination">
              <p className="font-mono text-[10.5px] text-muted">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => {
                  const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
                  const pageNumber = start + index;
                  if (pageNumber > totalPages) return null;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`h-8 w-8 rounded border font-mono text-[11px] transition-colors ${
                        pageNumber === currentPage
                          ? "border-cyan/50 bg-cyan/10 text-cyan"
                          : "border-hairline text-muted hover:border-cyan/40 hover:text-ink"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
