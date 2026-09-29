"use client";

import { useEffect, useRef, useState } from "react";
import { FRAME_TYPES, IDENTITY_TIERS, STAGES } from "@/data/blackbox";

type Kind = "benign" | "exploit";

export function FastPathDiagram() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [step, setStep] = useState(-1);
  const [stats, setStats] = useState({ passed: 18432, drops: 248117, mapKeys: 1204 });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const inject = (type: Kind) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setKind(type);
    setStep(0);
    const path = FRAME_TYPES[type].path as readonly string[];
    path.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setStep(i), 620 * i + 300));
    });
    timers.current.push(
      window.setTimeout(
        () => {
          setStats((s) => (type === "exploit" ? { ...s, drops: s.drops + 1 } : { ...s, passed: s.passed + 1 }));
        },
        620 * path.length + 480,
      ),
    );
  };

  const spec = kind ? FRAME_TYPES[kind] : null;
  const reached: string[] = spec ? (spec.path as readonly string[]).slice(0, step + 1) : [];
  const activeId = spec ? (spec.path as readonly string[])[Math.min(step, spec.path.length - 1)] : null;

  return (
    <div className="rounded-md border border-hairline bg-panel p-5 lg:p-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inject("benign")} className="rounded-md border border-kernel/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-kernel hover:bg-kernel/10">
          [ Inject Benign Flow ]
        </button>
        <button type="button" onClick={() => inject("exploit")} className="rounded-md border border-threat/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-threat hover:bg-threat/10">
          [ Inject SCADA Exploit ]
        </button>
      </div>
      <ol className="mt-5 grid gap-2 lg:grid-cols-6">
        {STAGES.map((s) => {
          const hit = reached.includes(s.id);
          const dim = kind === "exploit" && (s.id === "ring" || s.id === "threads" || s.id === "scoring" || s.id === "sync");
          return (
            <li
              key={s.id}
              className={`rounded-md border px-3 py-3 ${activeId === s.id ? "border-cyan/70 text-ink" : hit ? "border-kernel/50 text-kernel" : "border-hairline text-muted"} ${dim ? "opacity-35" : ""}`}
            >
              <p className="font-mono text-[16px]">{s.n}</p>
              <p className="mt-1 text-[11.5px] font-medium leading-tight">{s.title}</p>
              <p className="mt-1 font-mono text-[9.5px]">{s.sub}</p>
            </li>
          );
        })}
      </ol>
      {spec && (
        <div className="rise-in mt-4 rounded-md border border-hairline bg-void/60 p-4 font-mono text-[11.5px]">
          <p className="text-muted">{spec.summary}</p>
          <p className="mt-2">
            score <span style={{ color: spec.color }}>{spec.score}</span> · verdict{" "}
            <span style={{ color: spec.color }}>{spec.verdict}</span>
            {kind === "exploit" && <span className="ml-2 text-threat">· Frame destroyed at stage 02 — 0.84 µs, no sk_buff</span>}
          </p>
        </div>
      )}
      <p className="tabular mt-4 font-mono text-[10.5px] text-muted">
        passed {stats.passed.toLocaleString("en-US")} · drops {stats.drops.toLocaleString("en-US")} · map keys {stats.mapKeys.toLocaleString("en-US")}
      </p>
    </div>
  );
}

export function RingVisual() {
  const SLOTS = 16;
  const [write, setWrite] = useState(5);
  const [read, setRead] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setWrite((w) => (w + 1) % SLOTS);
      setRead((r) => (Math.random() < 0.72 ? r + 1 : r) % SLOTS);
    }, 520);
    return () => window.clearInterval(id);
  }, [running]);
  const pending = (write - read + SLOTS) % SLOTS;
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">SPMC Ring · {SLOTS} slots</p>
        <button type="button" onClick={() => setRunning((v) => !v)} className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-cyan">
          {running ? "Pause" : "Resume"}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-1.5">
        {Array.from({ length: SLOTS }, (_, i) => {
          const inFlight = ((i - read + SLOTS) % SLOTS) < pending;
          return (
            <span
              key={i}
              className="flex h-9 items-center justify-center rounded border font-mono text-[9.5px]"
              style={{
                borderColor: i === write ? "#FFB800" : i === read ? "#00FFA3" : inFlight ? "rgba(0,229,255,0.5)" : "#1A2232",
                background: inFlight ? "rgba(0,229,255,0.12)" : "transparent",
                color: i === write ? "#FFB800" : i === read ? "#00FFA3" : "#8A99AD",
              }}
            >
              {i}
            </span>
          );
        })}
      </div>
      <p className="tabular mt-3 font-mono text-[10.5px] text-muted">
        write_cursor {write} · read_cursor {read} · pending {pending} · mutex waits 0
      </p>
    </div>
  );
}

export function IdentityEngine() {
  const [probed, setProbed] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {IDENTITY_TIERS.map((t) => {
        const open = probed === t.id;
        return (
          <div key={t.id} className="rounded-md border border-hairline bg-panel" style={open ? { borderColor: `${t.color}88` } : undefined}>
            <button type="button" onClick={() => setProbed(open ? null : t.id)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: t.color }}>{t.tier}</span>
              <span className="flex-1">
                <span className="block text-[14px] font-medium text-ink">{t.name}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] text-muted">{t.device} · {t.spec}</span>
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-[0.1em] ${t.available ? "text-kernel" : "text-threat"}`}>
                {t.available ? "available" : "degraded"}
              </span>
            </button>
            {open && (
              <div className="rise-in border-t border-hairline bg-void/45 px-5 py-4">
                <p className="text-[13px] leading-relaxed text-muted">{t.detail}</p>
                <p className="mt-2 font-mono text-[11px]" style={{ color: t.color }}>Strength: {t.strength}</p>
              </div>
            )}
          </div>
        );
      })}
      <p className="font-mono text-[10.5px] text-muted">Auto ordered probe: Tier 1 → Tier 2 → Tier 3. Never fails open.</p>
    </div>
  );
}
