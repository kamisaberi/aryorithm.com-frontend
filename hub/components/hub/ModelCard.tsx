"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { VaultCatalogItem } from "@/lib/hub";

function latencyLabel(ns: number | null): string {
  if (ns === null || ns === undefined) return "—";
  if (ns >= 1000) return `< ${(ns / 1000).toFixed(ns % 1000 === 0 ? 0 : 1)} µs`;
  return `< ${ns} ns`;
}

/** Cloud model card: identity, safety badge, formats, latency, detail CTA. */
export default function ModelCard({ item }: { item: VaultCatalogItem }) {
  return (
    <article className="group flex flex-col rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/40">
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan/10 font-display text-[13px] font-bold text-cyan"
          aria-hidden="true"
        >
          {item.name.replace(/^The\s+/, "").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/models/${item.slug}`}>
            <h3 className="truncate font-display text-[14.5px] font-bold text-ink transition-colors group-hover:text-cyan">
              {item.name}
            </h3>
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.golden_safety_verified ? (
              <Badge variant="kernel">✓ Golden 100%</Badge>
            ) : (
              <Badge variant="telemetry">Unverified</Badge>
            )}
            <Badge variant="muted">{item.domain}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] text-muted">
        {(item.available_formats || []).map((f) => (
          <span key={f} className="rounded border border-hairline px-1.5 py-0.5">
            {f}
          </span>
        ))}
        <span className="rounded border border-kernel/30 px-1.5 py-0.5 text-kernel">
          {latencyLabel(item.p99_latency_ns)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-hairline/70 pt-3 text-[11.5px] text-muted">
        <span className="tabular font-mono text-[11px] text-ink">
          {item.latest_version ?? "—"}
        </span>
        <span className="truncate font-mono text-[11px]">{item.id}</span>
        <Link
          href={`/models/${item.slug}`}
          className="ml-auto shrink-0 rounded-md border border-cyan/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10"
        >
          Open →
        </Link>
      </div>
    </article>
  );
}
