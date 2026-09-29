"use client";

import { useEffect, useRef, useState } from "react";
import { ARY_STAGES, CLOUD_STAGES } from "@/data/home";

export default function LatencyComparator() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [cloudTime, setCloudTime] = useState(0);
  const [aryUs, setAryUs] = useState(0);
  const rafRef = useRef(0);

  const simulate = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(true);
    setDone(false);
    setCloudTime(0);
    setAryUs(0);
    const start = performance.now();
    const ARY_MS = 460;
    const CLOUD_MS = 8400;
    const tick = (now: number) => {
      const el = now - start;
      setAryUs(Math.min(0.84, (Math.min(el, ARY_MS) / ARY_MS) * 0.84));
      setCloudTime(Math.min(41.6, (Math.min(el, CLOUD_MS) / CLOUD_MS) * 41.6));
      if (el < CLOUD_MS) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
        setDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setDone(false);
    setCloudTime(0);
    setAryUs(0);
  };

  const aryComplete = aryUs >= 0.84;

  return (
    <div id="latency-comparator" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6 lg:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Deterministic Latency Model"}</p>
      <h3 className="mt-2 font-display text-[20px] font-bold text-ink">
        0.84 µs vs. 41.6 s — run the race.
      </h3>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-kernel/40 p-5">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-kernel">Aryorithm Kernel Path</h4>
          <p className="tabular mt-2 font-mono text-[28px] text-kernel">{aryUs.toFixed(2)} µs</p>
          <div className="relative mt-3 h-2 overflow-hidden rounded bg-hairline">
            <div className="h-full bg-kernel transition-none" style={{ width: `${(aryUs / 0.84) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-1.5 font-mono text-[11px]">
            {ARY_STAGES.map((s) => (
              <li key={s.label} className={aryUs >= s.us ? "text-kernel" : "text-muted"}>
                {aryUs >= s.us ? "✓" : "·"} {s.label} — {s.us.toFixed(2)}µs
              </li>
            ))}
          </ul>
          {aryComplete && (
            <p className="mt-3 rounded-md border border-kernel/50 bg-kernel/10 px-3 py-2 font-mono text-[11px] text-kernel">
              XDP_DROP executed — frame destroyed before sk_buff allocation.
            </p>
          )}
        </div>
        <div className="rounded-md border border-threat/40 p-5">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-threat">Cloud SIEM / EDR Path</h4>
          <p className="tabular mt-2 font-mono text-[28px] text-threat">{cloudTime.toFixed(1)} s</p>
          <div className="relative mt-3 h-2 overflow-hidden rounded bg-hairline">
            <div className="h-full bg-threat transition-none" style={{ width: `${(cloudTime / 41.6) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-1.5 font-mono text-[11px]">
            {CLOUD_STAGES.map((s) => (
              <li key={s.label} className={cloudTime >= s.at ? "text-threat" : "text-muted"}>
                {cloudTime >= s.at ? "✓" : "·"} {s.label} — {s.at.toFixed(1)}s
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10.5px] text-muted">
            EGRESS {(cloudTime * 9.9).toFixed(0)} MB · QUEUE {(cloudTime * 442).toFixed(0)} events
            {cloudTime > 1.2 && <span className="ml-2 text-threat">PLC COMPROMISED</span>}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          id="simulate-exploit-btn"
          type="button"
          onClick={simulate}
          disabled={running}
          className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110 disabled:opacity-50"
        >
          {running ? "[ Simulating… ]" : "[ Simulate Exploit ]"}
        </button>
        {(done || cloudTime > 0) && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
          >
            [ Reset ]
          </button>
        )}
      </div>
    </div>
  );
}
