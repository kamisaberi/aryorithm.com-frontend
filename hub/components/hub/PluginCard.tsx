"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import InstallModal from "./InstallModal";
import { compact, latency, prettyRuntime, prettySilicon, prettyTier } from "@/lib/format";
import type { PluginItem } from "@/lib/hub";

function tierVariant(tier: string): "kernel" | "cyan" | "muted" | "telemetry" {
  if (tier === "OFFICIAL_CORE") return "kernel";
  if (tier === "ENTERPRISE_AUDITED") return "cyan";
  if (tier === "EXPERIMENTAL") return "telemetry";
  return "muted";
}

/** Extension card anatomy (§2.2B): icon, title, badges, tags, metrics, install. */
export default function PluginCard({ item }: { item: PluginItem }) {
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <>
      <article className="group flex flex-col rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/40">
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan/10 font-display text-[13px] font-bold text-cyan"
            aria-hidden="true"
          >
            {item.title.replace(/^The\s+/, "").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/plugins/${item.slug}`}>
              <h3 className="truncate font-display text-[14.5px] font-bold text-ink transition-colors group-hover:text-cyan">
                {item.title}
              </h3>
            </Link>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant={tierVariant(item.verification_tier)}>
                {item.author.verified ? "✓ " : ""}
                {prettyTier(item.verification_tier)}
              </Badge>
            </div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[12.5px] leading-relaxed text-muted">
          {item.short_description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] text-muted">
          <span className="rounded border border-hairline px-1.5 py-0.5">{prettyRuntime(item.runtime)}</span>
          {(item.supported_silicon || []).slice(0, 2).map((s) => (
            <span key={s} className="rounded border border-hairline px-1.5 py-0.5">
              {prettySilicon(s)}
            </span>
          ))}
          {(item.ports || []).slice(0, 2).map((p) => (
            <span key={p} className="rounded border border-hairline px-1.5 py-0.5">
              Port {p}
            </span>
          ))}
          {item.metrics.fast_path_latency_us !== null && item.metrics.fast_path_latency_us !== undefined && (
            <span className="rounded border border-kernel/30 px-1.5 py-0.5 text-kernel">
              {latency(item.metrics.fast_path_latency_us)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-hairline/70 pt-3 text-[11.5px] text-muted">
          <span className="tabular font-mono text-[11px] text-ink">
            {compact(item.metrics.install_count)} DLs
          </span>
          <span className="font-mono text-[11px]">★ {item.metrics.stars}</span>
          <span className="truncate">{item.author.name}</span>
          <button
            type="button"
            onClick={() => setInstallOpen(true)}
            className="ml-auto shrink-0 rounded-md border border-cyan/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10"
          >
            Install
          </button>
        </div>
      </article>
      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title={item.title}
        version={item.active_version?.version ?? ""}
        verified={item.author.verified}
        packageRef={item.slug}
        sha256={item.active_version?.sha256 ?? ""}
      />
    </>
  );
}
