"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ModelCard from "@/components/hub/ModelCard";
import { vault, VAULT_DOMAINS, VAULT_TIERS, type VaultCatalogItem } from "@/lib/hub";

const FALLBACK: VaultCatalogItem[] = [];

/** Model catalog: search + domain pills + tier select, live with fallback. */
export default function ModelsView() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [tier, setTier] = useState("all");
  const [items, setItems] = useState<VaultCatalogItem[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await vault.catalog({
          domain: domain !== "all" ? domain : undefined,
          tier: tier !== "all" ? tier : undefined,
        });
        if (!cancelled) {
          setItems(res.models);
          setLive(true);
        }
      } catch {
        if (!cancelled) {
          setItems(FALLBACK);
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
  }, [domain, tier]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) =>
      [m.name, m.slug, m.id, m.domain].join(" ").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
        {"// Cloud Model Vault"}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
          AI models for edge &amp; forge.
        </h1>
        {!live && !loading && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-telemetry">
            Backend unreachable — showing cached catalog
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-md border border-hairline bg-panel px-4 py-3 transition-colors focus-within:border-cyan/60">
          <span className="font-mono text-[15px] text-cyan" aria-hidden="true">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models, domains, architectures..."
            aria-label="Search models"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
          Tier:
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-md border border-hairline bg-panel px-2.5 py-2 text-[12px] text-ink focus:border-cyan/60 focus:outline-none"
          >
            <option value="all">All tiers</option>
            {VAULT_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {["all", ...VAULT_DOMAINS].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDomain(d)}
            aria-pressed={domain === d}
            className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors ${
              domain === d
                ? "border-cyan/60 text-cyan"
                : "border-hairline text-muted hover:text-ink"
            }`}
          >
            {d === "all" ? "[ All Domains ]" : `[ ${d} ]`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-md border border-hairline bg-panel p-5">
              <div className="h-4 w-2/3 rounded bg-hairline" />
              <div className="mt-3 h-3 w-full rounded bg-hairline/70" />
              <div className="mt-2 h-3 w-5/6 rounded bg-hairline/70" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-md border border-hairline bg-panel px-6 py-14 text-center">
          <p className="font-mono text-[28px] text-muted" aria-hidden="true">
            ⌕
          </p>
          <p className="mt-3 font-display text-[17px] font-bold text-ink">
            No models match this filter combination.
          </p>
          <Link
            href="/docs"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline"
          >
            Read the SDK docs →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <ModelCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
