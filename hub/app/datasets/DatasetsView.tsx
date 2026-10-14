"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { library, DATASET_FORMATS, type HubDataset } from "@/lib/hub";
import { bytes } from "@/lib/format";

const FALLBACK: HubDataset[] = [];

/** SLAB research datasets: search + format pills, live with fallback. */
export default function DatasetsView() {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [items, setItems] = useState<HubDataset[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await library.datasets(format !== "all" ? { format } : undefined);
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
  }, [format]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) =>
      [d.name, d.slug, d.source_benchmark].join(" ").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// SLAB Research Datasets"}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
          Benchmarks, pre-normalized for the lab.
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
            placeholder="Search datasets, benchmarks..."
            aria-label="Search datasets"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...DATASET_FORMATS].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-md border px-3 py-2 font-mono text-[11px] transition-colors ${format === f ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Loading catalog…</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-[14px] text-muted">No datasets match. Try clearing search or filters.</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((d) => (
            <Link
              key={d.slug}
              href={`/datasets/${d.slug}`}
              className="group rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded border border-kernel/30 bg-kernel/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel">
                  {d.format}
                </span>
                <span className="font-mono text-[10.5px] text-muted">{bytes(d.file_size_bytes)}</span>
              </div>
              <h2 className="mt-3 font-display text-[16px] font-bold leading-snug text-ink group-hover:text-cyan">
                {d.name}
              </h2>
              <p className="mt-1.5 font-mono text-[11px] text-muted">
                {d.tensor_dimension}D · {d.total_records.toLocaleString()} records
              </p>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{d.short_description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
