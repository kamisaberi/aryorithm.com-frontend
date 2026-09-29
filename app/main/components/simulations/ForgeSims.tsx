"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CodeViewer from "@/components/ui/CodeViewer";
import { GOLDEN_ATTACKS, YAML_SNIPPET } from "@/data/forge";

function prand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function MaeVisualizer() {
  const [epoch, setEpoch] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setEpoch((e) => e + 1), 1500);
    return () => window.clearInterval(id);
  }, [running]);

  const masked = useMemo(() => {
    const s = new Set<number>();
    let i = 0;
    while (s.size < 10 && i < 200) {
      s.add(Math.floor(prand(epoch * 31 + i) * 32));
      i++;
    }
    return s;
  }, [epoch ]);

  const recErr = Math.max(0.021, 0.42 * Math.pow(0.86, epoch));
  const fidelity = (1 - recErr) * 100;

  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Masked Autoencoder · 32-dim · 30% masked</p>
      <div className="mt-3 flex h-20 items-end gap-[3px]">
        {Array.from({ length: 32 }, (_, i) => {
          const truth = 0.25 + prand(i * 7.7) * 0.6;
          const isMasked = masked.has(i);
          const recon = isMasked ? Math.min(1, Math.max(0, truth + (prand(i * 3.1 + epoch) - 0.5) * recErr * 2.2)) : truth;
          return (
            <span key={i} className="flex flex-1 flex-col justify-end gap-[2px]" style={{ height: "100%" }}>
              <span className="rounded-sm" style={{ height: `${truth * 48}%`, background: isMasked ? "transparent" : "rgba(0,229,255,0.7)", border: isMasked ? "1px dashed rgba(255,184,0,0.7)" : undefined }} />
              <span className="rounded-sm" style={{ height: `${recon * 48}%`, background: isMasked ? "#00FFA3" : "rgba(0,229,255,0.3)" }} />
            </span>
          );
        })}
      </div>
      <p className="tabular mt-3 font-mono text-[11px] text-muted">
        epoch {epoch} · recon loss {recErr.toFixed(3)} · fidelity {fidelity.toFixed(1)}% · labels 0
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setRunning((v) => !v)} className="rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void">
          {running ? "Pause" : epoch === 0 ? "Start Training" : "Resume"}
        </button>
        <button type="button" onClick={() => { setRunning(false); setEpoch(0); }} className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Reset Epochs
        </button>
        <button type="button" onClick={() => setEpoch((e) => e + 1)} className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Step + Re-Mask
        </button>
      </div>
    </div>
  );
}

export function InfoNceVisualizer() {
  const [temp, setTemp] = useState(0.07);
  const [trained, setTrained] = useState(0.82);
  const points = useMemo(() => {
    const pts: { x: number; y: number; anomaly: boolean }[] = [];
    for (let i = 0; i < 74; i++) pts.push({ x: prand(i * 3.3), y: prand(i * 9.1), anomaly: false });
    for (let i = 0; i < 16; i++) pts.push({ x: prand(500 + i * 5.7), y: prand(900 + i * 2.3), anomaly: true });
    return pts;
  }, []);
  const tight = 0.5 - temp * 1.6;
  const place = (p: { x: number; y: number; anomaly: boolean }) => {
    const sep = trained;
    const cx = p.anomaly ? 70 + 9 * sep : 30 - 9 * sep;
    const cy = p.anomaly ? 38 + 4 * sep : 58 - 6 * sep;
    const spread = (p.anomaly ? 26 : 30) * (1 - sep * tight * 1.25);
    return { x: cx + (p.x - 0.5) * spread, y: cy + (p.y - 0.5) * spread };
  };
  const loss = 2.94 * Math.pow(0.36, trained) + 0.08;
  const linear = trained > 0.6;
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <div className="relative h-56 overflow-hidden rounded-md border border-hairline bg-void">
        <div className="absolute bottom-0 top-0 bg-kernel/10" style={{ left: `${50 - (6 + trained * 13)}%`, width: `${(6 + trained * 13) * 2}%` }} />
        <div className="absolute bottom-0 top-0 w-px bg-kernel/60" style={{ left: "50%" }} />
        {points.map((p, i) => {
          const q = place(p);
          return (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ left: `${q.x}%`, top: `${q.y}%`, background: p.anomaly ? "#FF3366" : "#00E5FF", opacity: 0.85 }}
            />
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="infonce-training" className="flex justify-between font-mono text-[10.5px] text-muted"><span>Training progress</span><span className="text-cyan">{trained.toFixed(2)}</span></label>
          <input id="infonce-training" type="range" min={0} max={1} step={0.01} value={trained} onChange={(e) => setTrained(parseFloat(e.target.value))} className="mt-1 w-full accent-cyan" />
        </div>
        <div>
          <label htmlFor="infonce-temp" className="flex justify-between font-mono text-[10.5px] text-muted"><span>Temperature τ</span><span className="text-cyan">{temp.toFixed(2)}</span></label>
          <input id="infonce-temp" type="range" min={0.02} max={0.25} step={0.01} value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="mt-1 w-full accent-cyan" />
        </div>
      </div>
      <p className="tabular mt-3 font-mono text-[11px] text-muted">
        InfoNCE loss {loss.toFixed(3)} · separation <span className={linear ? "text-kernel" : "text-telemetry"}>{linear ? "LINEAR" : "ENTANGLED"}</span>
      </p>
    </div>
  );
}

type GateState = "idle" | "running" | "pass" | "fail";

export function SafetyGate() {
  const [state, setState] = useState<GateState>("idle");
  const [results, setResults] = useState<Record<string, "pass" | "fail">>({});
  const [compileStep, setCompileStep] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const run = (poisoned: boolean) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setResults({});
    setCompileStep(0);
    setState("running");
    GOLDEN_ATTACKS.forEach((a, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setResults((r) => ({ ...r, [a.id]: poisoned && i === 3 ? "fail" : "pass" }));
        }, 150 * (i + 1)),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setState(poisoned ? "fail" : "pass");
        if (!poisoned) {
          [1, 2, 3].forEach((s) => {
            timers.current.push(window.setTimeout(() => setCompileStep(s), 520 * s));
          });
        }
      }, 150 * GOLDEN_ATTACKS.length + 380),
    );
  };

  const checked = Object.keys(results).length;

  return (
    <div id="safety-gate" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-5 lg:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-threat">{"// Regression Safety Gate"}</p>
      <h3 className="mt-2 font-display text-[18px] font-bold text-ink">18 attacks. 1.00 required. No exceptions.</h3>
      <div className="mt-4">
        <CodeViewer code={YAML_SNIPPET} lang="yaml" filename="configs/safety/golden_attacks.yaml — release-signed, read-only" note="Mounted read-only. Any modification invalidates the release signature." />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded bg-hairline">
        <div className={`h-full ${state === "fail" ? "bg-threat" : "bg-kernel"}`} style={{ width: `${(checked / GOLDEN_ATTACKS.length) * 100}%` }} />
      </div>
      <ul className="mt-4 grid gap-1.5 font-mono text-[10.5px] sm:grid-cols-2 lg:grid-cols-3">
        {GOLDEN_ATTACKS.map((a) => {
          const r = results[a.id];
          return (
            <li key={a.id} className={`flex justify-between gap-2 rounded border px-2.5 py-1.5 ${r === "fail" ? "border-threat/60 text-threat" : r === "pass" ? "border-kernel/40 text-kernel" : "border-hairline text-muted"}`}>
              <span>{r === "fail" ? "✕" : r === "pass" ? "✓" : "·"} {a.id}</span>
              <span className="truncate">{a.name}</span>
            </li>
          );
        })}
      </ul>
      {state === "fail" && (
        <div className="rise-in mt-4 rounded-md border border-threat/60 bg-threat/[0.05] p-4">
          <p className="font-mono text-[12px] font-bold text-threat">[ ABORT ADAPTATION &amp; PURGE ]</p>
          <p className="mt-1 font-mono text-[11px] text-muted">Detection rate below 1.00 (GA-004 missed) — escalated to Sentinel Nexus as AI TRiSM event.</p>
        </div>
      )}
      {state === "pass" && (
        <div className="rise-in mt-4 rounded-md border border-kernel/50 bg-kernel/[0.05] p-4 font-mono text-[11px] text-kernel">
          <p>[ Compile to ONNX Opset 17 ]</p>
          <ul className="mt-2 space-y-1 text-muted">
            {[1, 2, 3].map((s) => (
              <li key={s}>{compileStep >= s ? "✓" : "·"} {["quantise int8 @ fixed recall", "fuse operators · profile worst-case", "sign artefact · stage to Nexus canary"][s - 1]}</li>
            ))}
          </ul>
          {compileStep >= 3 && <p className="mt-2 text-kernel">model-ot-anomaly-g421.onnx → Tier 6 canary (24h shadow → 5% cohort)</p>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => run(false)} disabled={state === "running"} className="rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void disabled:opacity-40">
          [ Evaluate Clean Candidate ]
        </button>
        <button type="button" onClick={() => run(true)} disabled={state === "running"} className="rounded-md border border-threat/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-threat disabled:opacity-40">
          [ Evaluate Poisoned Candidate ]
        </button>
        <button type="button" onClick={() => { setState("idle"); setResults({}); setCompileStep(0); }} className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          [ Re-Arm ]
        </button>
      </div>
    </div>
  );
}
