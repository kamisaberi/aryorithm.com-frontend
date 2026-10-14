"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { HUB_API_BASE_URL } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { HubScenario } from "@/lib/hub";

/** Twin scenario detail: topology, attacks, SLA, bundle download. */
export default function ScenarioDetailView({ scenario }: { scenario: HubScenario }) {
  const nodes = Object.entries(scenario.node_topology ?? {});
  return (
    <>
      <section className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-10 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
            <Link href="/scenarios" className="transition-colors hover:text-cyan">
              ← Back to Scenarios
            </Link>
            <span className="text-muted/40">/</span>
            <span className="text-ink">{scenario.slug}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="cyan">{scenario.complexity}</Badge>
                <Badge variant="muted">{scenario.target_sector}</Badge>
                <Badge variant="muted">{scenario.network_subnet}</Badge>
              </div>
              <h1 className="mt-3 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
                {scenario.name}
              </h1>
              <p className="mt-2 font-mono text-[11.5px] text-muted">
                Expected mitigation: <span className="text-kernel">{scenario.expected_mitigation_sla}</span>
              </p>
              <p className="mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
                {scenario.technical_walkthrough}
              </p>
              <dl className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Replayed attacks</dt>
                  <dd className="mt-1 space-y-1 font-mono text-[12px] text-ink">
                    {scenario.replayed_attacks.map((a) => (
                      <div key={a}>▸ {a}</div>
                    ))}
                  </dd>
                </div>
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Pull command</dt>
                  <dd className="mt-1 flex items-center gap-2 font-mono text-[12px] text-ink">
                    <span className="truncate">{scenario.cli_pull_command}</span>
                    <CopyButton text={scenario.cli_pull_command} label="⎘" />
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5">
              <a
                href={`${HUB_API_BASE_URL}${scenario.download_url}`}
                className="rounded-md bg-cyan px-6 py-3 text-center font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                [ Download bundle ]
              </a>
              <p className="text-center font-mono text-[10.5px] text-muted">
                {scenario.file_name} · {bytes(scenario.file_size_bytes)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
        <h2 className="font-display text-[20px] font-bold text-ink">Node topology</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nodes.map(([key, node]) => (
            <div key={key} className="rounded-md border border-hairline bg-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{key}</p>
              <p className="mt-1 font-mono text-[13px] font-bold text-cyan">{node.ip}</p>
              <p className="mt-1 text-[12px] text-muted">{node.role}</p>
            </div>
          ))}
        </div>
        <h2 className="mt-8 font-display text-[20px] font-bold text-ink">Scenario bundle</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-hairline bg-void">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
            <span className="font-mono text-[11px] font-bold text-ink">{scenario.file_name}</span>
            <span className="tabular font-mono text-[10.5px] text-muted">{bytes(scenario.file_size_bytes)}</span>
            <span className="truncate font-mono text-[10px] text-muted/70" title={scenario.sha256_checksum}>
              {scenario.sha256_checksum.slice(0, 16)}…
            </span>
            <span className="ml-auto flex items-center gap-2">
              <CopyButton text={scenario.sha256_checksum} label="⎘ hash" />
              <a
                href={`${HUB_API_BASE_URL}${scenario.download_url}`}
                className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                Download ↓
              </a>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
