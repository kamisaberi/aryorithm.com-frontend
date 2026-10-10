"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import FilterRail, { type ActiveFilters } from "@/components/hub/FilterRail";
import PackageCard from "@/components/hub/PackageCard";
import { hub, type SentinelPackage } from "@/lib/hub";
import { prettyPackageTier, FALLBACK_PACKAGES } from "@/data/packages";
import { bytes } from "@/lib/format";

/** Split-view verified-packages catalog (§2.2, sentinel-packages model). */
export default function ExploreView() {
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? params.get("search") ?? "");
  const [filters, setFilters] = useState<ActiveFilters>({
    sector: params.get("sector") ?? "all",
    tier: params.get("tier") ?? "all",
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [data, setData] = useState<SentinelPackage[]>(FALLBACK_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  // Mirror state into the URL so filters are shareable and chips clear cleanly.
  // Native replaceState — NOT router.replace: router navigations would fire
  // the global fullscreen PageLoader on every keystroke, while only the
  // results section should show loading (skeletons + Filtering… indicator).
  useEffect(() => {
    const q = new URLSearchParams();
    if (query.trim()) q.set("q", query.trim());
    (Object.keys(filters) as (keyof ActiveFilters)[]).forEach((k) => {
      if (filters[k] !== "all") q.set(k, filters[k]);
    });
    const qs = q.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
  }, [query, filters, pathname]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await hub.sentinelPackages({
          search: query.trim() || undefined,
          sector: filters.sector !== "all" ? filters.sector : undefined,
          tier: filters.tier !== "all" ? filters.tier : undefined,
        });
        if (!cancelled) {
          setData(res);
          setLive(true);
        }
      } catch {
        if (!cancelled) {
          setData(FALLBACK_PACKAGES);
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
  }, [query, filters]);

  const applyFilters = useCallback((next: ActiveFilters) => {
    setFilters(next);
  }, []);

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    if (query.trim()) {
      out.push({ key: "q", label: `"${query.trim()}"`, clear: () => setQuery("") });
    }
    (Object.keys(filters) as (keyof ActiveFilters)[]).forEach((k) => {
      if (filters[k] !== "all") {
        out.push({
          key: k,
          label: k === "tier" ? prettyPackageTier(filters[k]) : filters[k],
          clear: () => applyFilters({ ...filters, [k]: "all" }),
        });
      }
    });
    return out;
  }, [query, filters, applyFilters]);

  const clearAll = () => {
    setQuery("");
    setFilters({ sector: "all", tier: "all" });
  };

  const rail = <FilterRail active={filters} onChange={applyFilters} />;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      {/* Search + view bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-md border border-hairline bg-panel px-4 py-3 transition-colors focus-within:border-cyan/60">
          <span className="font-mono text-[15px] text-cyan" aria-hidden="true">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages, protocols, sectors..."
            aria-label="Search packages"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="font-mono text-[13px] text-muted hover:text-cyan"
            >
              ✕
            </button>
          )}
          {loading && (
            <span
              className="spin-fast inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-hairline border-t-cyan"
              role="status"
              aria-label="Searching"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md border border-hairline px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted lg:hidden"
          >
            Filters{chips.length > 0 ? ` (${chips.length})` : ""}
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
            <p className="flex items-center gap-2.5 text-[13px] text-muted">
              {loading && (
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan">
                  <span
                    className="spin-fast inline-block h-3 w-3 rounded-full border-2 border-hairline border-t-cyan"
                    role="status"
                    aria-label="Filtering packages"
                  />
                  Filtering…
                </span>
              )}
              <span>
                Showing{" "}
                <span className="tabular font-mono text-[13px] text-ink">{data.length}</span>{" "}
                Verified Packages
                {!live && <span className="ml-2 font-mono text-[10.5px] text-telemetry">(cached)</span>}
              </span>
            </p>
          </div>

          {loading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SkeletonGrid count={6} />
            </div>
          ) : data.length === 0 ? (
            <div className="mt-4 rounded-md border border-hairline bg-panel px-6 py-14 text-center">
              <p className="font-mono text-[28px] text-muted" aria-hidden="true">
                ⌕
              </p>
              <p className="mt-3 font-display text-[17px] font-bold text-ink">
                No packages match the selected combination of filters.
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
              {data.map((item) => (
                <PackageCard key={item.slug} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-hairline/70 overflow-hidden rounded-md border border-hairline bg-panel">
              {data.map((item) => (
                <div key={item.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                  <Link
                    href={`/packages/${item.slug}`}
                    className="min-w-[200px] flex-1 font-display text-[13.5px] font-bold text-ink hover:text-cyan"
                  >
                    {item.name}
                  </Link>
                  <span className="font-mono text-[10.5px] text-muted">{item.tier_display}</span>
                  <span className="tabular font-mono text-[11px] text-kernel">{item.latency_display}</span>
                  <span className="font-mono text-[11px] text-ink">{bytes(item.package_file_size_bytes)}</span>
                  <Badge variant={item.verified ? "kernel" : "muted"}>
                    {item.verified ? "✓ Verified" : "Unverified"}
                  </Badge>
                  <CopyButton text={item.install_command} label="Install" />
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
                Filters{chips.length > 0 ? ` (${chips.length} Active)` : ""}
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
