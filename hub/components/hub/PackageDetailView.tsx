"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Markdown from "./Markdown";
import { HUB_API_BASE_URL } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { SentinelPackage } from "@/lib/hub";

type Tab = "overview" | "security" | "package";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "security", label: "Security & Compliance" },
  { id: "package", label: "Package File" },
];

/** Tabbed package workspace + sticky metadata rail. */
export default function PackageDetailView({ pkg }: { pkg: SentinelPackage }) {
  const [tab, setTab] = useState<Tab>("overview");
  const downloadHref = `${HUB_API_BASE_URL}/hub/packages/${pkg.slug}/download`;

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-10 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
            <Link href="/explore" className="transition-colors hover:text-cyan">
              ← Back to Catalog
            </Link>
            <span className="text-muted/40">/</span>
            <Link
              href={`/explore?sector=${encodeURIComponent(pkg.sector)}`}
              className="transition-colors hover:text-cyan"
            >
              {pkg.sector}
            </Link>
            <span className="text-muted/40">/</span>
            <span className="text-ink">{pkg.slug}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {pkg.verified && <Badge variant="kernel">✓ Verified</Badge>}
                <Badge variant="cyan">{pkg.tier_display}</Badge>
                <Badge variant="muted">{pkg.latency_display}</Badge>
              </div>
              <h1 className="mt-3 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
                {pkg.name}
              </h1>
              <p className="mt-2 font-mono text-[11.5px] text-muted">
                Author: <span className="text-ink">{pkg.author}</span>
                {"  •  "}Version: <span className="text-cyan">{pkg.version}</span>
                {"  •  "}{pkg.language}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5">
              <a
                href={downloadHref}
                className="rounded-md bg-cyan px-6 py-3 text-center font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                [ Download .spkg ]
              </a>
              <CopyButton text={pkg.install_command} label="Copy install command" className="justify-center" />
            </div>
          </div>

          <div className="terminal-body mt-5 flex items-center gap-2 overflow-x-auto rounded-md border border-hairline px-4 py-3">
            <span className="shrink-0 font-mono text-[12px] text-kernel" aria-hidden="true">$</span>
            <code className="whitespace-nowrap font-mono text-[12.5px] text-ink">{pkg.install_command}</code>
            <span className="ml-auto shrink-0">
              <CopyButton text={pkg.install_command} />
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Tabbed workspace */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Package sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                    tab === t.id ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-hairline bg-panel p-6">
              {tab === "overview" && <Markdown source={pkg.technical_details} />}

              {tab === "security" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-ink">Mitigation Action</h3>
                    <p className="mt-2">
                      <span className="rounded border border-threat/40 bg-threat/10 px-2 py-1 font-mono text-[11px] text-threat">
                        {pkg.mitigation_action}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-ink">Compliance Tags</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {pkg.compliance_tags.map((t) => (
                        <li
                          key={t}
                          className="rounded border border-hairline px-2 py-1 font-mono text-[11px] text-muted"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-hairline bg-void p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Signature</p>
                      <p className="mt-1 font-mono text-[13px] text-kernel">{pkg.signature_algorithm} Signed</p>
                    </div>
                    <div className="rounded-md border border-hairline bg-void p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Protocol</p>
                      <p className="mt-1 font-mono text-[13px] text-ink">{pkg.target_protocol}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        {pkg.default_port === 0 ? "all ports" : `Port ${pkg.default_port}`}
                      </p>
                    </div>
                    <div className="rounded-md border border-hairline bg-void p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Latency SLA</p>
                      <p className="tabular mt-1 font-mono text-[13px] text-kernel">{pkg.latency_display}</p>
                      <p className="tabular mt-1 font-mono text-[11px] text-muted">
                        {pkg.latency_sla_ns.toLocaleString("en-US")} ns
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "package" && (
                <div className="space-y-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-hairline bg-void p-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">File</dt>
                      <dd className="mt-1 break-all font-mono text-[12px] text-ink">{pkg.package_file_name}</dd>
                    </div>
                    <div className="rounded-md border border-hairline bg-void p-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Size</dt>
                      <dd className="tabular mt-1 font-mono text-[12px] text-ink">
                        {bytes(pkg.package_file_size_bytes)}{" "}
                        <span className="text-muted">({pkg.package_file_size_bytes.toLocaleString("en-US")} B)</span>
                      </dd>
                    </div>
                  </dl>
                  <a
                    href={downloadHref}
                    className="block rounded-md bg-cyan px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
                  >
                    Download {pkg.package_file_name} ↓
                  </a>
                  <p className="font-mono text-[10.5px] leading-relaxed text-muted">
                    Verify offline with the X-Checksum-SHA256 response header after download.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky metadata rail */}
          <aside className="w-full shrink-0 lg:w-72">
            <div className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-md border border-hairline bg-panel p-4">
                <h2 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Installation Targets
                </h2>
                <dl className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Tier</dt>
                    <dd className="text-right text-ink">{pkg.tier_display}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Protocol</dt>
                    <dd className="text-right font-mono text-[11.5px] text-ink">{pkg.target_protocol}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Port</dt>
                    <dd className="tabular text-right text-ink">
                      {pkg.default_port === 0 ? "all" : pkg.default_port}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Sector</dt>
                    <dd className="text-right text-ink">{pkg.sector}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-hairline bg-panel p-4">
                <h2 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Provenance & Signatures
                </h2>
                <div className="mt-3 space-y-2.5">
                  <p className="font-mono text-[11px] text-muted">
                    Author: <span className="text-ink">{pkg.author}</span>
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    Signature: <span className="text-kernel">{pkg.signature_algorithm} Signed</span>
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    Updated: <span className="text-ink">{pkg.updated_at.slice(0, 10)}</span>
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
