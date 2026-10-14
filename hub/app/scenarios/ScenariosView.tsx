"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { library, SCENARIO_COMPLEXITIES, type HubScenario } from "@/lib/hub";

const FALLBACK: HubScenario[] = [];

/** Digital twin scenarios: search + complexity pills, live with fallback. */
export default function ScenariosView() {
  const [query, setQuery] = useState("");
  const [complexity, setComplexity] = useState("all");
  const [items, setItems] = useState<HubScenario[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await library.scenarios(complexity !== "all" ? { complexity } : undefined);
        if (!cancelled) {
          setItems(res);
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
  }, [complexity]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      [s.name, s.slug, s.target_sector].join(" ").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Digital Twin Scenarios"}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
          Entire plants, ready to attack.
        </h1>
        {!live && !loading && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-telemetry">
            Backend unreachable — showing cached catalog
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-md border border-hairline bg-panel px-3.5 py-2.5">
          <span className="font-mono text-cyan" aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scenarios, sectors..."
            aria-label="Search scenarios"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...SCENARIO_COMPLEXITIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setComplexity(c)}
              className={`rounded-md border px-3 py-2 font-mono text-[11px] transition-colors ${complexity === c ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Loading catalog…</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-[14px] text-muted">No scenarios match. Try clearing search or filters.</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <Link
              key={s.slug}
              href={`/scenarios/${s.slug}`}
              className="group rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded border border-kernel/30 bg-kernel/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel">
                  {s.complexity}
                </span>
                <span className="font-mono text-[10.5px] text-muted">{s.network_subnet}</span>
              </div>
              <h2 className="mt-3 font-display text-[16px] font-bold leading-snug text-ink group-hover:text-cyan">
                {s.name}
              </h2>
              <p className="mt-1.5 font-mono text-[11px] text-muted">{s.target_sector}</p>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{s.short_description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
