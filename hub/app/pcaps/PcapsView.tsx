"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { library, PCAP_CATEGORIES, type HubPcap } from "@/lib/hub";
import { bytes } from "@/lib/format";

const FALLBACK: HubPcap[] = [];

/** Malware PCAP vault: search + category pills, live with fallback. */
export default function PcapsView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState<HubPcap[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await library.pcaps(category !== "all" ? { category } : undefined);
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
  }, [category]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      [p.title, p.slug, p.attack_type, p.target_protocol].join(" ").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Malware PCAP Vault"}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
          Adversary captures, ready to replay.
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
            placeholder="Search captures, protocols, attack types..."
            aria-label="Search captures"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...PCAP_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-md border px-3 py-2 font-mono text-[11px] transition-colors ${category === c ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Loading catalog…</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-[14px] text-muted">No captures match. Try clearing search or filters.</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <Link
              key={p.slug}
              href={`/pcaps/${p.slug}`}
              className="group rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded border border-kernel/30 bg-kernel/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel">
                  {p.category}
                </span>
                <span className="font-mono text-[10.5px] text-muted">{bytes(p.file_size_bytes)}</span>
              </div>
              <h2 className="mt-3 font-display text-[16px] font-bold leading-snug text-ink group-hover:text-cyan">
                {p.title}
              </h2>
              <p className="mt-1.5 font-mono text-[11px] text-muted">{p.target_protocol} · {p.packet_count.toLocaleString()} packets</p>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{p.short_description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.mitre_attack_ids.slice(0, 4).map((m) => (
                  <span key={m} className="rounded bg-void px-1.5 py-0.5 font-mono text-[10px] text-cyan">{m}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
