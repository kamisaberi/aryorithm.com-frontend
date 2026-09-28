"use client";

import { useEffect, useRef, useState } from "react";
import CopyButton from "@/components/ui/CopyButton";
import { BIBTEX, HARNESS_LINES, SLAB_FIELDS } from "@/data/lab";

export function PreprintBlock() {
  const [showBib, setShowBib] = useState(false);
  return (
    <div id="preprint" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Academic Preprint"}</p>
      <h3 className="mt-2 font-display text-[18px] font-bold leading-snug text-ink">
        “Autonomous Cyber-Physical Threat Mitigation: A Sub-Millisecond Active Defense Architecture on Heterogeneous
        Silicon.”
      </h3>
      <dl className="mt-4 grid gap-2 font-mono text-[11px] sm:grid-cols-2">
        {[
          ["Authors", "Aryorithm Systems Lab"],
          ["Target Venue", "IEEE/ACM TDSC"],
          ["Pages / Figures", "18 pp · 11 figures"],
          ["Artefact Status", "Available & reproducible"],
        ].map(([k, v]) => (
          <div key={k} className="rounded border border-hairline px-3 py-2">
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="tabular mt-3 break-all font-mono text-[10.5px] text-muted">
        SHA-256: c47d91e0a8b3f6259d14708ce2ab5f3097b62d84a15e0fc39b7d248e6a05cb17
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowBib((v) => !v)} className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-cyan">
          {showBib ? "[ Hide BibTeX ]" : "[ View BibTeX Citation ]"}
        </button>
        <CopyButton text={BIBTEX} label="Copy Citation" copiedLabel="✓ Citation Copied" />
      </div>
      {showBib && (
        <pre className="rise-in mt-4 whitespace-pre-wrap rounded-md border border-hairline bg-void p-4 font-mono text-[11px] leading-relaxed text-muted">
          {BIBTEX}
        </pre>
      )}
    </div>
  );
}

export function SlabExplorer() {
  const [selected, setSelected] = useState("magic");
  const [dims, setDims] = useState(32);
  const active = SLAB_FIELDS.find((f) => f.id === selected) ?? SLAB_FIELDS[0];
  const total = 20 + dims * 4;
  return (
    <div id="slab-protocol" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// SLAB Wire Protocol"}</p>
      <h3 className="mt-2 font-display text-[18px] font-bold text-ink">Zero-allocation binary frame spec.</h3>
      <div className="mt-4 flex h-14 overflow-hidden rounded-md border border-hairline">
        {SLAB_FIELDS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelected(f.id)}
            className={`border-r border-hairline px-2 font-mono text-[9.5px] uppercase last:border-0 ${selected === f.id ? "bg-cyan/15 text-cyan" : "text-muted"}`}
            style={{ flexGrow: f.bytes ?? dims * 4 / 4 }}
          >
            {f.label}
            <span className="block text-[8.5px]">{f.bytes ?? `${dims}×f32`}</span>
          </button>
        ))}
      </div>
      <div key={active.id} className="rise-in mt-4 rounded-md border border-hairline bg-void/60 p-4">
        <p className="font-mono text-[11.5px] text-ink">
          {active.label} <span className="text-cyan">{active.type}</span>
          <span className="ml-2 text-muted">offset {active.offset} · {active.bytes ?? `${dims * 4} bytes @ ${dims}-dim`}</span>
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{active.detail}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10.5px] text-muted">Feature dims:</span>
        {[32, 42, 80].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDims(d)}
            className={`rounded-md border px-3 py-1.5 font-mono text-[11px] ${dims === d ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}
          >
            {d}-dim
          </button>
        ))}
        <span className="tabular ml-auto font-mono text-[11px] text-kernel">frame = {total} B · single read · 0 allocs</span>
      </div>
    </div>
  );
}

export function HarnessRunner() {
  const [lines, setLines] = useState<{ t: string; c?: string }[]>([]);
  const [running, setRunning] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const run = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setLines([]);
    setRunning(true);
    let delay = 0;
    HARNESS_LINES.forEach((l) => {
      delay += l.d;
      const snap = l;
      timers.current.push(window.setTimeout(() => setLines((p) => [...p, { t: snap.t, c: snap.c }]), delay));
    });
    timers.current.push(window.setTimeout(() => setRunning(false), delay + 150));
  };

  return (
    <div id="eval-harness" className="scroll-mt-24 overflow-hidden rounded-md border border-hairline bg-panel">
      <div className="flex items-center gap-3 border-b border-hairline bg-void/70 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-threat/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-telemetry/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-kernel/70" />
        </span>
        <span className="flex-1 font-mono text-[10.5px] text-muted">sentinel-lab · eval harness 1.8.0</span>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md bg-cyan px-4 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-void disabled:opacity-40"
        >
          {running ? "Replaying…" : "Execute Evaluation"}
        </button>
      </div>
      <div ref={bodyRef} className="terminal-body h-[380px] overflow-y-auto p-4 font-mono text-[11.5px] leading-relaxed">
        {lines.length === 0 && (
          <p className="text-muted">Harness idle. Press [ Execute Evaluation ] to replay 286,467 labelled flows across both backends.</p>
        )}
        {lines.map((l, i) => (
          <p key={i} className={l.c ?? "text-ink"}>{l.t || " "}</p>
        ))}
        {running && <span className="caret text-cyan">▊</span>}
      </div>
    </div>
  );
}
