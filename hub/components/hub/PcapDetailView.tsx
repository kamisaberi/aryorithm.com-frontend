"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { HUB_API_BASE_URL } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { HubPcap } from "@/lib/hub";

/** PCAP detail: metadata, MITRE mappings, analysis, download. */
export default function PcapDetailView({ pcap }: { pcap: HubPcap }) {
  return (
    <>
      <section className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-10 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
            <Link href="/pcaps" className="transition-colors hover:text-cyan">
              ← Back to PCAP Vault
            </Link>
            <span className="text-muted/40">/</span>
            <span className="text-ink">{pcap.slug}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="cyan">{pcap.category}</Badge>
                <Badge variant="muted">{pcap.target_protocol}</Badge>
                {pcap.mitre_attack_ids.map((m) => (
                  <Badge key={m} variant="telemetry">{m}</Badge>
                ))}
              </div>
              <h1 className="mt-3 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
                {pcap.title}
              </h1>
              <p className="mt-2 font-mono text-[11.5px] text-muted">
                {pcap.attack_type} · <span className="text-ink">{pcap.source_origin}</span>
              </p>
              <p className="mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
                {pcap.technical_analysis}
              </p>
              <dl className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Packets</dt>
                  <dd className="mt-1 font-mono text-[12px] text-ink">{pcap.packet_count.toLocaleString()}</dd>
                </div>
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Duration</dt>
                  <dd className="mt-1 font-mono text-[12px] text-ink">{pcap.duration_seconds.toFixed(1)} s</dd>
                </div>
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Downloads</dt>
                  <dd className="mt-1 font-mono text-[12px] text-ink">{pcap.download_count.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5">
              <a
                href={`${HUB_API_BASE_URL}${pcap.download_url}`}
                className="rounded-md bg-cyan px-6 py-3 text-center font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                [ Download .pcap ]
              </a>
              <p className="text-center font-mono text-[10.5px] text-muted">
                {pcap.file_name} · {bytes(pcap.file_size_bytes)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
        <h2 className="font-display text-[20px] font-bold text-ink">Capture file</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-hairline bg-void">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
            <span className="font-mono text-[11px] font-bold text-ink">{pcap.file_name}</span>
            <span className="tabular font-mono text-[10.5px] text-muted">{bytes(pcap.file_size_bytes)}</span>
            <span className="truncate font-mono text-[10px] text-muted/70" title={pcap.sha256_checksum}>
              {pcap.sha256_checksum.slice(0, 16)}…
            </span>
            <span className="ml-auto flex items-center gap-2">
              <CopyButton text={pcap.sha256_checksum} label="⎘ hash" />
              <a
                href={`${HUB_API_BASE_URL}${pcap.download_url}`}
                className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                Download ↓
              </a>
            </span>
          </div>
        </div>
        {pcap.recommended_spkg_id && (
          <p className="mt-4 font-mono text-[11.5px] text-muted">
            Mitigated by <span className="text-cyan">{pcap.recommended_spkg_id}</span>
          </p>
        )}
      </section>
    </>
  );
}
