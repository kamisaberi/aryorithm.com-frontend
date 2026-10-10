"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import FilterRail, { type ActiveFilters } from "@/components/hub/FilterRail";
import PluginCard from "@/components/hub/PluginCard";
import { hub, SORTS, type Facets, type PaginatedPlugins, type PluginItem } from "@/lib/hub";
import { compact, latency, prettyCategory, prettyRuntime, prettySilicon, prettyTier } from "@/lib/format";
import { FALLBACK_FACETS, FALLBACK_ITEMS } from "@/data/fallback";

const FALLBACK_PAGE: PaginatedPlugins = {
  total: FALLBACK_ITEMS.length,
  page: 1,
  limit: 20,
  total_pages: 1,
  items: FALLBACK_ITEMS,
};

function chipLabel(key: keyof ActiveFilters, value: string): string {
  if (key === "category") return prettyCategory(value);
  if (key === "runtime") return prettyRuntime(value);
  if (key === "silicon") return prettySilicon(value);
  return prettyTier(value);
}

/** Split-view faceted catalog (§2.2). */
export default function ExploreView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState<ActiveFilters>({
    category: params.get("category") ?? "all",
    runtime: params.get("runtime") ?? "all",
    silicon: params.get("silicon") ?? "all",
    tier: params.get("tier") ?? "all",
  });
  const [sort, setSort] = useState(params.get("sort") ?? "popular");
  const [page, setPage] = useState(Number(params.get("page") ?? 1) || 1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [data, setData] = useState<PaginatedPlugins>(FALLBACK_PAGE);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  // Mirror state into the URL so filters are shareable and chips clear cleanly.
  useEffect(() => {
    const q = new URLSearchParams();
    if (query.trim()) q.set("q", query.trim());
    (Object.keys(filters) as (keyof ActiveFilters)[]).forEach((k) => {
      if (filters[k] !== "all") q.set(k, filters[k]);
    });
    if (sort !== "popular") q.set("sort", sort);
    if (page !== 1) q.set("page", String(page));
    const qs = q.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [query, filters, sort, page, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    hub
      .facets()
      .then((f) => {
        if (!cancelled) setFacets(f);
      })
      .catch(() => {
        if (!cancelled) setFacets(FALLBACK_FACETS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await hub.plugins({
          q: query.trim() || undefined,
          category: filters.category,
          runtime: filters.runtime,
          silicon: filters.silicon,
          tier: filters.tier,
          sort,
          page,
          limit: 12,
        });
        if (!cancelled) {
          setData(res);
          setLive(true);
        }
      } catch {
        if (!cancelled) {
          setData(FALLBACK_PAGE);
          setLive(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, filters, sort, page]);

  const applyFilters = useCallback((next: ActiveFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    if (query.trim()) {
      out.push({ key: "q", label: `"${query.trim()}"`, clear: () => { setQuery(""); setPage(1); } });
    }
    (Object.keys(filters) as (keyof ActiveFilters)[]).forEach((k) => {
      if (filters[k] !== "all") {
        out.push({
          key: k,
          label: chipLabel(k, filters[k]),
          clear: () => applyFilters({ ...filters, [k]: "all" }),
        });
      }
    });
    return out;
  }, [query, filters, applyFilters]);

  const clearAll = () => {
    setQuery("");
    setFilters({ category: "all", runtime: "all", silicon: "all", tier: "all" });
    setSort("popular");
    setPage(1);
  };

  const activeFilterCount =
    chips.length + (sort !== "popular" ? 1 : 0);

  const rail = (
    <FilterRail
      facets={facets ?? FALLBACK_FACETS}
      active={filters}
      onChange={applyFilters}
    />
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      {/* Search + sort bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-md border border-hairline bg-panel px-4 py-3 transition-colors focus-within:border-cyan/60">
          <span className="font-mono text-[15px] text-cyan" aria-hidden="true">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search extensions, protocols, CVEs, authors..."
            aria-label="Search extensions"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              aria-label="Clear search"
              className="font-mono text-[13px] text-muted hover:text-cyan"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md border border-hairline px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted lg:hidden"
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <div className="flex rounded-md border border-hairline p-0.5" role="group" aria-label="View">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                  view === v ? "bg-cyan/15 text-cyan" : "text-muted hover:text-ink"
                }`}
              >
                {v === "grid" ? "▦ Grid" : "☰ List"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
            Sort:
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-hairline bg-panel px-2.5 py-2 text-[12px] text-ink focus:border-cyan/60 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="rounded-md border border-cyan/50 bg-cyan/[0.07] px-2.5 py-1 font-mono text-[11px] text-cyan transition-colors hover:border-threat/60 hover:text-threat"
              title="Remove filter"
            >
              {c.label} ✕
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted underline-offset-2 hover:text-cyan hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar rail (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">{rail}</div>
        </aside>

        {/* Results stream */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Showing{" "}
              <span className="tabular font-mono text-[13px] text-ink">{data.total}</span>{" "}
              Verified Extensions
              {!live && <span className="ml-2 font-mono text-[10.5px] text-telemetry">(cached)</span>}
            </p>
            {data.total_pages > 1 && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-hairline px-2.5 py-1 disabled:opacity-40 hover:border-cyan/50 hover:text-cyan"
                >
                  ←
                </button>
                <span className="tabular">
                  {page} / {data.total_pages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  className="rounded border border-hairline px-2.5 py-1 disabled:opacity-40 hover:border-cyan/50 hover:text-cyan"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SkeletonGrid count={6} />
            </div>
          ) : data.items.length === 0 ? (
            <div className="mt-4 rounded-md border border-hairline bg-panel px-6 py-14 text-center">
              <p className="font-mono text-[28px] text-muted" aria-hidden="true">
                ⌕
              </p>
              <p className="mt-3 font-display text-[17px] font-bold text-ink">
                No extensions match the selected combination of filters.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 rounded-md bg-cyan px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                [ Reset Filters ]
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.items.map((item) => (
                <PluginCard key={item.slug} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-hairline/70 overflow-hidden rounded-md border border-hairline bg-panel">
              {data.items.map((item) => (
                <div key={item.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                  <Link
                    href={`/plugins/${item.slug}`}
                    className="min-w-[200px] flex-1 font-display text-[13.5px] font-bold text-ink hover:text-cyan"
                  >
                    {item.title}
                  </Link>
                  <span className="font-mono text-[10.5px] text-muted">
                    {prettyRuntime(item.runtime)}
                  </span>
                  <span className="font-mono text-[10.5px] text-muted">
                    {latency(item.metrics.fast_path_latency_us)}
                  </span>
                  <span className="tabular font-mono text-[11px] text-ink">
                    {compact(item.metrics.install_count)} DLs
                  </span>
                  <Badge variant="muted">★ {item.metrics.stars}</Badge>
                  <CopyButton
                    text={`sentinel plugin install ${item.slug}:${item.active_version?.version ?? "latest"}`}
                    label="Install"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[70] bg-void/80 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-md border-t border-hairline bg-panel p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount} Active)` : ""}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void"
              >
                Done
              </button>
            </div>
            {rail}
          </div>
        </div>
      )}
    </div>
  );
}
