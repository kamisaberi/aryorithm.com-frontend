"use client";

import { useEffect, useRef, useState } from "react";
import type { TelemetryMetric } from "@/types/telemetry";
import { TELEMETRY } from "@/data/home";
import TelemetryCounter, { useInView } from "@/components/ui/TelemetryCounter";

function MetricCard({ metric, active }: { metric: TelemetryMetric; active: boolean }) {
  const [seq, setSeq] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeq((s) => s + 1), 1400);
    return () => window.clearInterval(id);
  }, [active]);
  void seq;
  return (
    <div className="relative overflow-hidden rounded-md border border-hairline bg-panel p-5">
      <div className="sweep-line pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan/[0.06] to-transparent" aria-hidden="true" />
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">{metric.label}</p>
      <p className="tabular mt-2 font-mono text-[26px] font-bold" style={{ color: metric.color }}>
        <TelemetryCounter target={metric.target} decimals={metric.decimals} prefix={metric.prefix ?? ""} suffix={metric.suffix} active={active} duration={1700} />
      </p>
      <p className="mt-1 text-[12px] text-muted">{metric.note}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-hairline">
        <div className="h-full transition-all duration-1000" style={{ width: `${metric.bar}%`, background: metric.color }} />
      </div>
      <span className="mt-3 inline-block rounded border border-hairline px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {metric.tag}
      </span>
    </div>
  );
}

export default function TelemetryBar() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TELEMETRY.map((m) => (
        <MetricCard key={m.id} metric={m} active={inView} />
      ))}
    </div>
  );
}
