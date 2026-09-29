"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CANARY_STAGES, FLEET_REGIONS, PCR_BANK, SPOOF_GOLDEN, SPOOF_INDEX, TOTAL_NODES, VECTOR_SAMPLES, isExported } from "@/data/nexus";
import { useInView } from "@/components/ui/TelemetryCounter";

function useHudTelemetry(active: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setT((v) => v + 1), 1200);
    return () => window.clearInterval(id);
  }, [active]);
  return useMemo(() => {
    const i = t % 12;
    return {
      t,
      online: TOTAL_NODES - 3 - (t % 2),
      canary: 250,
      fanout: 41.2 + Math.sin(t / 3) * 5.1,
      quorum: 99.94,
      rtt: 3.4 + i * 0.4 + Math.sin(t / 2) * 0.6,
      eps: 780000 + i * 91000,
    };
  }, [t]);
}

function HeartbeatMeter({ seed, label, color, active }: { seed: number; label: string; color: string; active: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setPhase((p) => p + 1), 180);
    return () => window.clearInterval(id);
  }, [active]);
  const bars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const h = 12 + Math.abs(Math.sin(i * 0.7 + seed + phase * 0.25)) * Math.abs(Math.cos(i * 0.3 + phase * 0.15)) * 88;
        return Math.max(8, h);
      }),
    [phase, seed],
  );
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-2 flex h-12 items-end gap-[3px]">
        {bars.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}%`,
              background: i >= bars.length - 4 ? color : `${color}55`,
              boxShadow: i >= bars.length - 4 ? `0 0 8px ${color}` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function IocBroadcaster() {
  const [phase, setPhase] = useState(0);
  const [acked, setAcked] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const fire = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase(1);
    setAcked(0);
    timers.current.push(window.setTimeout(() => setPhase(2), 700));
    const start = performance.now() + 700;
    const dur = 1400;
    const step = () => {
      const el = performance.now() - start;
      const k = Math.min(1, Math.max(0, el / dur));
      setAcked(Math.floor(TOTAL_NODES * (1 - Math.pow(1 - k, 2.2))));
      if (k < 1) timers.current.push(window.setTimeout(step, 50) as unknown as number);
      else setPhase(3);
    };
    timers.current.push(window.setTimeout(step, 700));
  };

  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: "Node #01", d: "198.51.100.77 · p=0.981", on: phase >= 1 },
          { t: "Sentinel Nexus", d: "ed25519 signed", on: phase >= 2 },
          { t: "blocked_ip_map", d: "XDP_DROP @0.84µs", on: phase >= 3 },
        ].map((b) => (
          <div key={b.t} className={`rounded-md border px-3 py-3 font-mono text-[11px] ${b.on ? "border-kernel/60 text-kernel" : "border-hairline text-muted"}`}>
            <p>{b.t}</p>
            <p className="mt-1 text-[10px]">{b.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-hairline">
        <div className="h-full bg-kernel" style={{ width: `${(acked / TOTAL_NODES) * 100}%` }} />
      </div>
      <p className="tabular mt-2 font-mono text-[11px] text-muted">
        {acked.toLocaleString("en-US")} / {TOTAL_NODES.toLocaleString("en-US")} ACK
        {phase === 3 && <span className="ml-2 text-kernel">FANOUT COMPLETE · SLA &lt; 50ms</span>}
      </p>
      <button
        type="button"
        onClick={fire}
        disabled={phase === 1 || phase === 2}
        className="mt-3 rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void disabled:opacity-40"
      >
        [ Broadcast IOC ]
      </button>
    </div>
  );
}

function ForgeBridge() {
  const [selected, setSelected] = useState("v-2");
  const active = VECTOR_SAMPLES.find((v) => v.id === selected) ?? VECTOR_SAMPLES[1];
  const qualified = VECTOR_SAMPLES.filter(isExported).length;
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <div className="relative h-16 rounded-md border border-hairline bg-void">
        <div className="absolute bottom-0 top-0 bg-telemetry/15" style={{ left: "40%", width: "20%" }} />
        {VECTOR_SAMPLES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelected(v.id)}
            aria-label={`Vector ${v.id}`}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              left: `${v.p * 100}%`,
              background: isExported(v) ? "#00E5FF" : "#1A2232",
              borderColor: selected === v.id ? "#F0F4F8" : "transparent",
              boxShadow: selected === v.id ? "0 0 10px rgba(0,229,255,0.8)" : undefined,
            }}
          />
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted">
        Vector <span className="text-ink">{active.id}</span> · p={active.p.toFixed(2)} · novelty={active.novelty.toFixed(2)} ·{" "}
        {active.label} ·{" "}
        <span className={isExported(active) ? "text-cyan" : "text-muted"}>
          {isExported(active) ? "EXPORT" : "RETAIN LOCAL"}
        </span>
      </p>
      <p className="mt-1 font-mono text-[10.5px] text-muted">
        {qualified} of {VECTOR_SAMPLES.length} qualified · 1.8 KB quantised float · zero raw egress
      </p>
    </div>
  );
}

function CanaryPipeline() {
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!auto) return;
    if (stage >= 2) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => setStage((s) => Math.min(2, s + 1)), 1900);
    return () => window.clearTimeout(id);
  }, [auto, stage]);
  const current = CANARY_STAGES[stage];
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <div className="flex gap-2">
        {CANARY_STAGES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setStage(i);
              setAuto(false);
            }}
            className={`flex-1 rounded-md border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.1em] ${
              i <= stage ? "border-kernel/60 text-kernel" : "border-hairline text-muted"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div key={current.id} className="rise-in mt-4">
        <p className="font-mono text-[11.5px] text-ink">{current.headline}</p>
        <p className="mt-1 font-mono text-[10.5px] text-muted">model-ot-anomaly-g420.xif · sha256:4c81e7…9ab2</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {current.rows.map(([k, v]) => (
            <div key={k} className="rounded border border-hairline px-3 py-2 font-mono text-[10.5px]">
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{current.detail}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setStage(0);
            setAuto(true);
          }}
          className="rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void"
        >
          [ Run Full OTA Rollout ]
        </button>
        <button
          type="button"
          onClick={() => {
            setAuto(false);
            setStage(0);
          }}
          className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
        >
          [ Reset To Shadow ]
        </button>
      </div>
    </div>
  );
}

function RollbackGuard() {
  const [mode, setMode] = useState<"nominal" | "latency" | "fp">("nominal");
  const metrics =
    mode === "nominal"
      ? { lat: 617, fp: 0.19, tripped: false }
      : mode === "latency"
        ? { lat: 1284, fp: 0.22, tripped: true }
        : { lat: 642, fp: 4.68, tripped: true };
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <div className={`rounded-md border px-4 py-3 font-mono text-[11.5px] ${metrics.tripped ? "border-threat/60 text-threat" : "border-kernel/50 text-kernel"}`}>
        {metrics.tripped ? "CIRCUIT TRIPPED — AUTO-ABORT · artefact g.420 revoked · g.418 restored in 1.9s" : "WATCHDOG ARMED · all signals inside envelope"}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex justify-between font-mono text-[10.5px] text-muted">
            <span>Inference latency (SLA &lt; 1000µs)</span>
            <span className={metrics.lat > 1000 ? "text-threat" : "text-kernel"}>{metrics.lat}µs</span>
          </p>
          <div className="mt-2 h-2 rounded bg-hairline">
            <div className={`h-full rounded ${metrics.lat > 1000 ? "bg-threat" : "bg-kernel"}`} style={{ width: `${Math.min(100, (metrics.lat / 1500) * 100)}%` }} />
          </div>
        </div>
        <div>
          <p className="flex justify-between font-mono text-[10.5px] text-muted">
            <span>False-positive rate (abort &gt; 2.00%)</span>
            <span className={metrics.fp > 2 ? "text-threat" : "text-kernel"}>{metrics.fp.toFixed(2)}%</span>
          </p>
          <div className="mt-2 h-2 rounded bg-hairline">
            <div className={`h-full rounded ${metrics.fp > 2 ? "bg-threat" : "bg-kernel"}`} style={{ width: `${Math.min(100, (metrics.fp / 5) * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["nominal", "latency", "fp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] ${mode === m ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}
          >
            {m === "nominal" ? "Nominal" : m === "latency" ? "Inject Latency Breach" : "Inject FP Surge"}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttestationValidator() {
  const [state, setState] = useState<"idle" | "running" | "pass" | "fail">("idle");
  const [checked, setChecked] = useState(0);
  const [spoof, setSpoof] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const verify = (withSpoof: boolean) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setSpoof(withSpoof);
    setChecked(0);
    setState("running");
    for (let i = 0; i < 8; i++) {
      timers.current.push(window.setTimeout(() => setChecked(i + 1), 180 * (i + 1)));
    }
    timers.current.push(window.setTimeout(() => setState(withSpoof ? "fail" : "pass"), 180 * 8 + 320));
  };

  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <ul className="grid gap-1.5 font-mono text-[11px] sm:grid-cols-2">
        {PCR_BANK.map((p, i) => {
          const done = checked > i;
          const bad = spoof && i === SPOOF_INDEX;
          return (
            <li key={p.pcr} className={`flex justify-between rounded border px-3 py-1.5 ${done ? (bad ? "border-threat/60 text-threat" : "border-kernel/50 text-kernel") : "border-hairline text-muted"}`}>
              <span>
                {done ? (bad ? "✕" : "✓") : "·"} {p.pcr} · {p.role}
              </span>
              <span>{done && bad ? SPOOF_GOLDEN : p.golden}</span>
            </li>
          );
        })}
      </ul>
      {state === "pass" && <p className="mt-3 font-mono text-[11.5px] text-kernel">ATTESTATION PASS · hardware root of trust intact</p>}
      {state === "fail" && <p className="mt-3 font-mono text-[11.5px] text-threat">ATTESTATION FAIL · PCR[04] drift — node quarantined, local enforcement continues</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={state === "running"}
          onClick={() => verify(false)}
          className="rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void disabled:opacity-40"
        >
          [ Verify Genuine Node ]
        </button>
        <button
          type="button"
          disabled={state === "running"}
          onClick={() => verify(true)}
          className="rounded-md border border-threat/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-threat disabled:opacity-40"
        >
          [ Verify Tampered Node ]
        </button>
      </div>
    </div>
  );
}

export const CAPABILITY_SIMS: Record<string, () => JSX.Element> = {
  "cap-ioc": IocBroadcaster,
  "cap-forge": ForgeBridge,
  "cap-canary": CanaryPipeline,
  "cap-rollback": RollbackGuard,
  "cap-attest": AttestationValidator,
};

export default function NexusHud() {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  const hud = useHudTelemetry(inView);
  const [tab, setTab] = useState<"fleet" | "canary" | "heartbeat">("fleet");

  return (
    <div ref={ref} id="nexus-command-center" className="scroll-mt-24 overflow-hidden rounded-md border border-hairline bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-void/70 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-threat/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-telemetry/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-kernel/70" />
        </span>
        <span className="flex-1 truncate font-mono text-[10.5px] text-muted">https://nexus.local:9443/command-center</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel">mTLS Operator Session</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-hairline/60 lg:grid-cols-4">
        {[
          ["Fleet Online", hud.online.toLocaleString("en-US")],
          ["Canary Cohort", `${hud.canary}`],
          ["Fanout", `${hud.fanout.toFixed(1)} ms`],
          ["Quorum", `${hud.quorum.toFixed(2)}%`],
        ].map(([k, v]) => (
          <div key={k} className="bg-panel px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{k}</p>
            <p className="tabular mt-1 font-mono text-[15px] text-ink">{v}</p>
          </div>
        ))}
      </div>
      <div role="tablist" aria-label="Command center views" className="flex gap-2 border-b border-hairline px-4 py-3">
        {(["fleet", "canary", "heartbeat"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${tab === t ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="p-4 lg:p-5">
        {tab === "fleet" && (
          <ul className="space-y-3">
            {FLEET_REGIONS.map((r) => (
              <li key={r.id}>
                <p className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink">{r.name} <span className="text-muted">· {r.klass}</span></span>
                  <span className="tabular text-cyan">{r.nodes.toLocaleString("en-US")}</span>
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-hairline">
                  <div className="h-full bg-cyan/70" style={{ width: `${(r.nodes / 1607) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {tab === "canary" && (
          <div className="space-y-2 font-mono text-[11.5px]">
            {[["Shadow · 15 nodes", 100], ["Canary 5% · 250 nodes", 62], ["Promote · 4,735 nodes", 0]].map(([l, w]) => (
              <div key={l as string}>
                <p className="flex justify-between text-muted"><span>{l}</span><span>{w}%</span></p>
                <div className="mt-1 h-1.5 rounded bg-hairline"><div className="h-full rounded bg-telemetry" style={{ width: `${w}%` }} /></div>
              </div>
            ))}
            <p className="pt-1 text-[10.5px] text-muted">artefact model-ot-anomaly-g420.xif · sha256:4c81e7…9ab2</p>
          </div>
        )}
        {tab === "heartbeat" && (
          <div className="grid gap-5 lg:grid-cols-3">
            <HeartbeatMeter seed={1} label="Beacon 1.000s · Missed 0" color="#00E5FF" active={inView} />
            <HeartbeatMeter seed={4} label="Clock skew ±0.4ms" color="#00FFA3" active={inView} />
            <HeartbeatMeter seed={8} label="ed25519 heartbeat auth" color="#FFB800" active={inView} />
          </div>
        )}
      </div>
    </div>
  );
}
