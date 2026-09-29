"use client";

import CopyButton from "@/components/ui/CopyButton";
import type { SbomArtifact } from "@/types/compliance";

export default function SbomTable({ artifacts }: { artifacts: SbomArtifact[] }) {
  return (
    <div className="space-y-4">
      {artifacts.map((a) => (
        <article key={a.id} className="rounded-md border border-hairline bg-panel p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[13px] text-ink">
              {a.name} <span className="text-cyan">{a.version}</span>
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {a.kind} · {a.size} · {a.released}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-void px-3 py-2.5">
            <code className="tabular min-w-0 flex-1 break-all font-mono text-[11px] text-muted">
              sha256:{a.hash}
            </code>
            <CopyButton text={a.hash} label="copy hash" copiedLabel="✓ hash copied" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-cyan/50 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-cyan">
              [ {a.action} ]
            </span>
            <span className="font-mono text-[10.5px] text-muted">{a.format}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
