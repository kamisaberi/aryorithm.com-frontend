"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import AddToDeviceModal from "@/components/hub/AddToDeviceModal";
import { HUB_API_BASE_URL } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { VaultModel } from "@/lib/hub";

function stageVariant(stage: string): "kernel" | "cyan" | "muted" | "telemetry" {
  if (stage === "FLEET_PRODUCTION") return "kernel";
  if (stage === "CANARY_5_PERCENT") return "cyan";
  if (stage === "DEPRECATED") return "muted";
  return "muted";
}

/** Model detail: manifest, version tree with per-artifact downloads. */
export default function ModelDetailView({ model }: { model: VaultModel }) {
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-10 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
            <Link href="/models" className="transition-colors hover:text-cyan">
              ← Back to Models
            </Link>
            <span className="text-muted/40">/</span>
            <span className="text-ink">{model.slug}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="cyan">{model.tier}</Badge>
                <Badge variant="muted">{model.domain}</Badge>
                <Badge variant="muted">{model.architecture}</Badge>
              </div>
              <h1 className="mt-3 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
                {model.name}
              </h1>
              <p className="mt-2 font-mono text-[11.5px] text-muted">
                By <span className="text-ink">{model.author}</span>
              </p>
              <p className="mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
                {model.technical_description}
              </p>
              <dl className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Input</dt>
                  <dd className="mt-1 font-mono text-[12px] text-ink">{model.input_tensor_shape}</dd>
                </div>
                <div className="rounded-md border border-hairline bg-panel p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Output</dt>
                  <dd className="mt-1 font-mono text-[12px] text-ink">{model.output_tensor_shape}</dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                [ Add to Device ]
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
        <h2 className="font-display text-[20px] font-bold text-ink">Version tree</h2>
        <ol className="mt-4 space-y-4">
          {model.versions.map((v) => (
            <li key={v.version} className="rounded-md border border-hairline bg-panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular font-mono text-[13px] font-bold text-ink">
                  {v.version}
                </span>
                <Badge variant={stageVariant(v.rollout_stage)}>{v.rollout_stage}</Badge>
                {v.golden_safety_verified ? (
                  <Badge variant="kernel">✓ Golden 100%</Badge>
                ) : (
                  <Badge variant="telemetry">Unverified</Badge>
                )}
                <span className="ml-auto font-mono text-[10.5px] text-muted">
                  p99 {(v.p99_latency_ns / 1000).toFixed(0)} µs
                  {v.base_accuracy !== null && v.base_accuracy !== undefined
                    ? ` · acc ${(v.base_accuracy * 100).toFixed(2)}%`
                    : ""}
                </span>
              </div>
              {v.release_notes && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{v.release_notes}</p>
              )}
              <p className="mt-1 font-mono text-[10.5px] text-muted">
                {v.training_dataset_summary}
              </p>
              <div className="mt-3 divide-y divide-hairline/70 overflow-hidden rounded-md border border-hairline bg-void">
                {v.artifacts.map((a) => (
                  <div
                    key={`${a.format}/${a.precision}/${a.target_hardware}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5"
                  >
                    <span className="font-mono text-[11px] font-bold text-ink">{a.format}</span>
                    <span className="font-mono text-[10.5px] text-muted">
                      {a.precision} · {a.target_hardware}
                    </span>
                    <span className="tabular font-mono text-[10.5px] text-muted">
                      {bytes(a.file_size_bytes)}
                    </span>
                    <span className="truncate font-mono text-[10px] text-muted/70" title={a.sha256_checksum}>
                      {a.sha256_checksum.slice(0, 16)}…
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <CopyButton text={a.sha256_checksum} label="⎘ hash" />
                      <a
                        href={`${HUB_API_BASE_URL}${a.download_url}`}
                        className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
                      >
                        Download ↓
                      </a>
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <AddToDeviceModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        modelSlug={model.slug}
        modelName={model.name}
        versions={model.versions}
      />
    </>
  );
}
