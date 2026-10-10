import type { Metadata } from "next";
import Link from "next/link";
import HeroSearch from "@/components/hub/HeroSearch";
import Terminal from "@/components/ui/Terminal";
import Badge from "@/components/ui/Badge";
import PluginCard from "@/components/hub/PluginCard";
import { hub, type PluginItem } from "@/lib/hub";
import { FALLBACK_ITEMS } from "@/data/fallback";
import { SECTORS } from "@/data/sectors";

export const metadata: Metadata = {
  title: "Aryorithm Hub — Extension Mesh for Edge Defense",
  description:
    "Download, verify, and deploy hardware-accelerated dissectors and AI models to edge nodes without cloud egress.",
};

export const revalidate = 300;

async function getSpotlight(): Promise<{ items: PluginItem[]; live: boolean }> {
  try {
    const items = await hub.featured();
    if (items.length > 0) return { items: items.slice(0, 4), live: true };
  } catch {
    /* fall through to offline fallback */
  }
  return { items: FALLBACK_ITEMS.slice(0, 4), live: false };
}

const METRICS: [string, string][] = [
  ["Active Verified Extensions", "80+ Packages"],
  ["Supported Silicon Targets", "15 Hardware Architectures"],
  ["Certified Air-Gapped Modules", "100% Zero-Egress"],
  ["Mean Fast-Path Latency", "< 0.84 µs In-Kernel SLA"],
];

export default async function LandingPage() {
  const { items: spotlight, live } = await getSpotlight();

  return (
    <>
      {/* A. Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-14 pt-14 lg:px-8 lg:pt-20">
          <span className="inline-block rounded-md border border-kernel/30 bg-kernel/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-kernel">
            &lt; 0.84µs In-Kernel Fast Path
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[46px] lg:text-[54px]">
            The Open Extension Mesh for <span className="text-cyan text-glow">Cyber-Physical Edge Defense.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Download, verify, and deploy hardware-accelerated dissectors and AI models
            to edge nodes without cloud egress. Every package signed, hashed, and audited.
          </p>
          <div className="mt-7 max-w-2xl">
            <HeroSearch />
          </div>
          <div className="mt-7 max-w-2xl">
            <Terminal
              title="hub — 1-click install"
              tabs={[
                { id: "edge", label: "Edge CLI", command: "sentinel plugin install aryorithm/s7comm-dissector" },
                { id: "fleet", label: "Fleet Bus", command: "nexus-ctl plugin deploy aryorithm/s7comm-dissector --fleet-wide" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* B. Metrics ribbon */}
      <section className="border-y border-hairline bg-panel/40">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px px-5 py-6 lg:grid-cols-4 lg:px-8">
          {METRICS.map(([label, value]) => (
            <div key={label} className="px-4 py-2">
              <p className="tabular font-display text-[22px] font-bold text-ink">{value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* C. Spotlight */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
              {"// Spotlight Curated Extensions"}
            </p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">
              Mission-critical, verified, ready to deploy.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={live ? "kernel" : "muted"}>{live ? "Live registry" : "Cached"}</Badge>
            <Link
              href="/explore"
              className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
            >
              Browse all →
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {spotlight.map((item) => (
            <PluginCard key={item.slug} item={item} />
          ))}
        </div>
      </section>

      {/* D. Sector tiles */}
      <section className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
          {"// Browse by Operational Sector"}
        </p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">
          Built for your vertical.
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="group rounded-md border border-hairline bg-panel p-6 transition-colors hover:border-cyan/50"
            >
              <h3 className="font-display text-[16px] font-bold text-ink transition-colors group-hover:text-cyan">
                {s.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.blurb}</p>
              <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-cyan/80">
                {s.protocols.join(" · ")}
              </p>
              <p className="mt-3 font-mono text-[11px] text-cyan">Explore →</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
