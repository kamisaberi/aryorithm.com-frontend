"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { bytes } from "@/lib/format";
import type { SentinelPackage } from "@/lib/hub";

/** Verified package card: icon, title, badges, spec chips, install CTA. */
export default function PackageCard({ item }: { item: SentinelPackage }) {
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
          <Link href={`/packages/${item.slug}`}>
            <h3 className="truncate font-display text-[14.5px] font-bold text-ink transition-colors group-hover:text-cyan">
              {item.name}
            </h3>
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.verified && <Badge variant="kernel">✓ Verified</Badge>}
            <Badge variant="cyan">{item.tier_display}</Badge>
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[12.5px] leading-relaxed text-muted">
        {item.short_description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] text-muted">
        <span className="rounded border border-kernel/30 px-1.5 py-0.5 text-kernel">
          {item.latency_display}
        </span>
        <span className="rounded border border-hairline px-1.5 py-0.5">{item.language}</span>
        <span className="rounded border border-hairline px-1.5 py-0.5">
          {item.default_port === 0 ? "all ports" : `Port ${item.default_port}`}
        </span>
        <span className="rounded border border-hairline px-1.5 py-0.5">{item.mitigation_action}</span>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-hairline/70 pt-3 text-[11.5px] text-muted">
        <span className="truncate font-mono text-[11px]">{item.sector}</span>
        <Link
          href={`/packages/${item.slug}`}
          className="ml-auto shrink-0 rounded-md border border-cyan/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10"
        >
          Open →
        </Link>
      </div>
      <p className="tabular mt-2 font-mono text-[10px] text-muted/70">
        {item.package_file_name} · {bytes(item.package_file_size_bytes)}
      </p>
    </article>
  );
}
