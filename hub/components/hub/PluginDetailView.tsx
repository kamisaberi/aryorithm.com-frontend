"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Markdown from "./Markdown";
import InstallModal from "./InstallModal";
import CapTooltip from "./CapTooltip";
import { HUB_API_BASE_URL } from "@/lib/api";
import { bytes, latency, prettyRuntime, prettySilicon, prettyTier } from "@/lib/format";
import type { PluginDetail, SecurityEnvelope, VersionSummary } from "@/lib/hub";

type Tab = "overview" | "security" | "manifest" | "versions";

interface PluginDetailViewProps {
  detail: PluginDetail;
  readmeMarkdown: string;
  manifestYaml: string;
  versions: VersionSummary[];
  security: SecurityEnvelope | null;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview / Readme" },
  { id: "security", label: "Security & Privileges" },
  { id: "manifest", label: "splugin.yaml Spec" },
  { id: "versions", label: "Version Changelog" },
];

/** Tabbed evaluation workspace + sticky metadata rail (§2.3). */
export default function PluginDetailView({
  detail,
  readmeMarkdown,
  manifestYaml,
  versions,
  security,
}: PluginDetailViewProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [installOpen, setInstallOpen] = useState(false);

  const active = detail.active_version;
  const downloadHref = active ? `${HUB_API_BASE_URL}${active.download_url}` : undefined;
  const caps: { name: string; justification: string }[] =
    security?.runtime_privileges.linux_capabilities ?? [];
  const maps: string[] = security?.runtime_privileges.ebpf_maps_requested ?? [];
  const tpm: string[] = security?.runtime_privileges.tpm_compatibility ?? [];

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
              href={`/explore?category=${encodeURIComponent(detail.category)}`}
              className="transition-colors hover:text-cyan"
            >
              {detail.category}
            </Link>
            <span className="text-muted/40">/</span>
            <span className="text-ink">{detail.slug}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="kernel">{detail.author.verified ? "✓ Verified Official" : prettyTier(detail.verification_tier)}</Badge>
                {security?.runtime_privileges.zero_cloud_egress_verified && (
                  <Badge variant="cyan">Air-Gapped OK</Badge>
                )}
              </div>
              <h1 className="mt-3 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
                {detail.title}
              </h1>
              <p className="mt-2 font-mono text-[11.5px] text-muted">
                Author: <span className="text-ink">{detail.author.name}</span>
                {"  •  "}Version: <span className="text-cyan">{active?.version ?? "—"}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                [ Install Extension ]
              </button>
              {downloadHref && (
                <a
                  href={downloadHref}
                  className="rounded-md border border-hairline px-6 py-3 text-center font-mono text-[12px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  Direct .splugin ↓
                </a>
              )}
            </div>
          </div>

          {active && (
            <div className="terminal-body mt-5 flex items-center gap-2 overflow-x-auto rounded-md border border-hairline px-4 py-3">
              <span className="shrink-0 font-mono text-[12px] text-kernel" aria-hidden="true">$</span>
              <code className="whitespace-nowrap font-mono text-[12.5px] text-ink">
                {detail.install_commands.sentinel_cli || `sentinel plugin install ${detail.slug}:${active.version}`}
              </code>
              <span className="ml-auto shrink-0">
                <CopyButton
                  text={detail.install_commands.sentinel_cli || `sentinel plugin install ${detail.slug}:${active.version}`}
                />
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Tabbed workspace */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Extension sections">
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
              {tab === "overview" &&
                (readmeMarkdown ? (
                  <Markdown source={readmeMarkdown} />
                ) : (
                  <p className="text-[13px] text-muted">{detail.short_description}</p>
                ))}

              {tab === "security" &&
                (security ? (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-display text-[15px] font-bold text-ink">
                        Linux Kernel Privileges Requested
                      </h3>
                      {caps.length === 0 ? (
                        <p className="mt-2 text-[13px] text-muted">
                          No elevated capabilities — runs fully sandboxed.
                        </p>
                      ) : (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {caps.map((c) => (
                            <li key={c.name}>
                              <CapTooltip name={c.name} justification={c.justification} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-hairline bg-void p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Max Memory</p>
                        <p className="tabular mt-1 font-mono text-[15px] text-ink">
                          {security.runtime_privileges.max_memory_allocated_mb ?? "—"} MB
                        </p>
                        <p className="mt-1 text-[11.5px] text-muted">Pre-allocated, zero heap on fast path</p>
                      </div>
                      <div className="rounded-md border border-hairline bg-void p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Cloud Egress</p>
                        <p className="mt-1 font-mono text-[15px] text-kernel">
                          {security.runtime_privileges.zero_cloud_egress_verified ? "$0.00 bytes" : "Declared"}
                        </p>
                        <p className="mt-1 text-[11.5px] text-muted">Certified zero-egress</p>
                      </div>
                      <div className="rounded-md border border-hairline bg-void p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">eBPF Maps</p>
                        <p className="mt-1 font-mono text-[12px] text-ink">
                          {maps.length > 0 ? maps.join(", ") : "—"}
                        </p>
                        <p className="mt-1 text-[11.5px] text-muted">Requested maps</p>
                      </div>
                    </div>
                    <div className="rounded-md border border-hairline bg-void p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        Cryptographic Signatures
                      </p>
                      <dl className="mt-2 space-y-1.5 font-mono text-[11.5px]">
                        <div className="flex flex-wrap gap-2">
                          <dt className="text-muted">Signer key:</dt>
                          <dd className="break-all text-ink">{security.provenance.signer_public_key || "—"}</dd>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <dt className="text-muted">Build:</dt>
                          <dd className="text-cyan">{security.provenance.build_reproducibility || "—"}</dd>
                        </div>
                        {tpm.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <dt className="text-muted">TPM PCR:</dt>
                            <dd className="text-ink">{tpm.join(", ")}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">No security audit published for this version yet.</p>
                ))}

              {tab === "manifest" &&
                (manifestYaml ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                        splugin.yaml
                      </p>
                      <CopyButton text={manifestYaml} label="Copy spec" />
                    </div>
                    <pre className="code-fade overflow-x-auto rounded-md border border-hairline bg-void p-4 font-mono text-[11.5px] leading-[1.75] text-ink">
                      <code>{manifestYaml}</code>
                    </pre>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">No manifest published.</p>
                ))}

              {tab === "versions" && (
                <ol className="space-y-4">
                  {versions.length === 0 && (
                    <li className="text-[13px] text-muted">No releases yet.</li>
                  )}
                  {versions.map((v) => (
                    <li key={v.version} className="rounded-md border border-hairline bg-void p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular font-mono text-[13px] font-bold text-ink">
                          v{v.version}
                        </span>
                        {v.yanked && <Badge variant="threat">Yanked</Badge>}
                        <span className="ml-auto font-mono text-[10.5px] text-muted">
                          {v.release_date.slice(0, 10)}
                        </span>
                      </div>
                      {v.changelog && (
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{v.changelog}</p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <a
                          href={`${HUB_API_BASE_URL}/plugins/${detail.slug}/versions/${encodeURIComponent(v.version)}/download`}
                          className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
                        >
                          Archive ↓
                        </a>
                        <span className="truncate font-mono text-[10px] text-muted/70" title={v.sha256}>
                          sha256: {v.sha256 ? `${v.sha256.slice(0, 16)}…` : "—"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
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
                    <dt className="text-muted">Runtime</dt>
                    <dd className="text-right text-ink">{prettyRuntime(detail.runtime)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Silicon</dt>
                    <dd className="text-right text-ink">
                      {(detail.supported_silicon || []).map(prettySilicon).join(", ") || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Ports</dt>
                    <dd className="tabular text-right text-ink">
                      {(detail.ports || []).map((p) => `TCP ${p}`).join(", ") || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Size</dt>
                    <dd className="tabular text-right text-ink">{bytes(active?.package_size_bytes ?? 0)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-hairline bg-panel p-4">
                <h2 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Provenance & Signatures
                </h2>
                <div className="mt-3 space-y-2.5">
                  <div>
                    <p className="font-mono text-[10px] text-muted">Package SHA-256</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-kernel">
                        {active?.sha256 || "—"}
                      </code>
                      {active?.sha256 && <CopyButton text={active.sha256} label="⎘" />}
                    </div>
                  </div>
                  <p className="font-mono text-[11px] text-muted">
                    Signature:{" "}
                    <span className="text-kernel">
                      {security ? "Ed25519 Verified" : "Unverified"}
                    </span>
                  </p>
                  {tpm.length > 0 && (
                    <p className="font-mono text-[11px] text-muted">
                      TPM PCR: <span className="text-ink">{tpm.join(", ")}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-hairline bg-panel p-4">
                <h2 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                  Runtime Quotas
                </h2>
                <dl className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Max Memory</dt>
                    <dd className="tabular text-right text-ink">
                      {security?.runtime_privileges.max_memory_allocated_mb ?? "—"} MB
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Est. Latency</dt>
                    <dd className="tabular text-right text-kernel">
                      {latency(detail.metrics.fast_path_latency_us)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Kernel Capabilities</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {caps.length === 0 ? (
                        <span className="text-[12px] text-muted">None — sandboxed</span>
                      ) : (
                        caps.map((c) => (
                          <CapTooltip key={c.name} name={c.name} justification={c.justification} />
                        ))
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title={detail.title}
        version={active?.version ?? ""}
        verified={detail.author.verified}
        packageRef={detail.slug}
        sha256={active?.sha256 ?? ""}
        downloadUrl={downloadHref}
      />
    </>
  );
}
