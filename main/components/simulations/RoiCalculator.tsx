"use client";

import { useEffect, useMemo, useState } from "react";
import { CLOUD_RATES, sliderToVolume, volumeToSlider } from "@/data/pricing";
import { formatCurrency, formatVolumeLabel } from "@/lib/formatters";
import { useInView, useCountUp } from "@/components/ui/TelemetryCounter";

export default function RoiCalculator() {
  const [sites, setSites] = useState(25);
  const [volPos, setVolPos] = useState(() => volumeToSlider(500));
  const [revealed, setRevealed] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>(0.2);

  const model = useMemo(() => {
    const gbPerDay = sliderToVolume(volPos);
    const gbYear = gbPerDay * 365;
    const ingest = gbYear * CLOUD_RATES.ingest;
    const egress = gbYear * CLOUD_RATES.egress;
    const retain = gbYear * CLOUD_RATES.retain * 12;
    const compute = gbYear * CLOUD_RATES.compute;
    const siteOverhead = sites * CLOUD_RATES.siteOverhead;
    const cloudTotal = ingest + egress + retain + compute + siteOverhead;
    const nodeLicence = sites * CLOUD_RATES.node;
    const aryTotal = nodeLicence;
    const savings = Math.max(0, cloudTotal - aryTotal);
    const pct = cloudTotal > 0 ? (savings / cloudTotal) * 100 : 0;
    return { gbPerDay, gbYear, ingest, egress, retain, compute, siteOverhead, cloudTotal, nodeLicence, aryTotal, savings, pct, fiveYear: savings * 5 };
  }, [sites, volPos]);

  const animated = useCountUp(model.savings, inView && !revealed, 1200);

  useEffect(() => {
    if (inView && !revealed) {
      const t = window.setTimeout(() => setRevealed(true), 1250);
      return () => window.clearTimeout(t);
    }
  }, [inView, revealed]);

  const shown = revealed ? model.savings : inView ? animated : 0;

  return (
    <div ref={ref} id="roi-calculator" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6 lg:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Interactive ROI Model"}</p>
      <h3 className="mt-2 font-display text-[20px] font-bold text-ink">Cloud Metering vs. Sovereign Node Economics.</h3>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="roi-sites" className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span>Deployed Sites</span>
            <span className="text-cyan">{sites} nodes</span>
          </label>
          <input
            id="roi-sites"
            type="range"
            min={1}
            max={500}
            step={1}
            value={sites}
            onChange={(e) => setSites(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-cyan"
          />
        </div>
        <div>
          <label htmlFor="roi-volume" className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span>Daily Telemetry Volume</span>
            <span className="text-cyan">{formatVolumeLabel(model.gbPerDay)}</span>
          </label>
          <input
            id="roi-volume"
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={volPos}
            onChange={(e) => setVolPos(parseFloat(e.target.value))}
            className="mt-2 w-full accent-cyan"
          />
          <p className="mt-1 font-mono text-[10px] text-muted">Logarithmic scale · 10 GB to 10 TB/day</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-threat/40 p-5">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-threat">Cloud SIEM / EDR Model</h4>
          <dl className="mt-3 space-y-2 font-mono text-[11.5px]">
            {[
              ["Log ingestion $2.50/GB", model.ingest],
              ["Cross-zone egress $0.09/GB", model.egress],
              ["Hot retention (12 mo) $0.023/GB/mo", model.retain],
              ["Indexing compute tax $0.12/GB", model.compute],
              ["Per-site collectors $1,850/site", model.siteOverhead],
            ].map(([label, v]) => (
              <div key={label as string} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="tabular text-ink">{formatCurrency(v as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="tabular mt-4 border-t border-hairline pt-3 font-mono text-[14px] text-threat">
            {formatCurrency(model.cloudTotal)} / yr
          </p>
        </div>
        <div className="rounded-md border border-kernel/40 p-5">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-kernel">Aryorithm On-Premises</h4>
          <dl className="mt-3 space-y-2 font-mono text-[11.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Edge appliance licences $4,800/node/yr</dt>
              <dd className="tabular text-ink">{formatCurrency(model.nodeLicence)}</dd>
            </div>
            {["Cloud egress — 100% local inference", "Log ingestion — not metered", "Retention — local evidence store", "Query/seat — unlimited"].map((l) => (
              <div key={l} className="flex justify-between gap-3">
                <dt className="text-muted">{l}</dt>
                <dd className="tabular text-kernel">$0.00</dd>
              </div>
            ))}
          </dl>
          <p className="tabular mt-4 border-t border-hairline pt-3 font-mono text-[14px] text-kernel">
            {formatCurrency(model.aryTotal)} / yr
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-kernel/40 bg-void/60 p-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Net Realized Savings</p>
        <p className="tabular mt-2 font-mono text-[40px] font-bold leading-none text-kernel lg:text-[54px]" style={{ textShadow: "0 0 24px rgba(0,255,163,0.4)" }}>
          {formatCurrency(shown)}
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted">
          per year · {sites} sites · {formatVolumeLabel(model.gbPerDay)}
        </p>
        <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded bg-hairline">
          <div className="h-full bg-kernel transition-all" style={{ width: `${Math.min(100, model.pct)}%` }} />
        </div>
        <p className="tabular mt-2 font-mono text-[12px] text-kernel">{model.pct.toFixed(0)}% operational cost reduction</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-hairline p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">5-Year Saving</p>
            <p className="tabular mt-1 font-mono text-[16px] text-ink">{formatCurrency(model.fiveYear)}</p>
          </div>
          <div className="rounded-md border border-hairline p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Egress Saved</p>
            <p className="tabular mt-1 font-mono text-[16px] text-ink">{formatCurrency(model.egress)}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 font-mono text-[10.5px] leading-relaxed text-muted">
        Reference estates average a 91% operational cost reduction at roughly 47 GB/day of telemetry per site. Cloud
        rates reflect published 2026 list pricing. Indicative only — request a costed architecture for a binding quote.
      </p>
    </div>
  );
}
