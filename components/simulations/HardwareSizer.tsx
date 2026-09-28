"use client";

import { useMemo, useState } from "react";
import { BACKENDS, THERMALS, THROUGHPUTS } from "@/data/contact";

export default function HardwareSizer() {
  const [throughput, setThroughput] = useState("10GbE");
  const [backend, setBackend] = useState("Intel OpenVINO");
  const [thermal, setThermal] = useState("1U Server (climate-controlled rack)");
  const [sites, setSites] = useState(4);

  const rec = useMemo(() => {
    const tp = THROUGHPUTS.find((t) => t.id === throughput) ?? THROUGHPUTS[1];
    const th = THERMALS.find((t) => t.id === thermal) ?? THERMALS[1];
    const be = BACKENDS.find((b) => b.id === backend) ?? BACKENDS[0];
    let model = th.model;
    const warnings: string[] = [];
    if (throughput === "100GbE" && model !== "S-5000") {
      warnings.push(`100GbE exceeds the ${model} envelope — S-5000 required.`);
      model = "S-5000";
    }
    if ((throughput === "40GbE" || throughput === "100GbE") && th.model === "S-1000") {
      warnings.push(`DIN-rail hardware cannot sustain ${throughput}; specify a 1U thermal envelope.`);
    }
    if (!be.fits.includes(model)) {
      warnings.push(`${backend} is not available on ${model} — nearest supported backend will be substituted.`);
    }
    if (throughput === "1GbE" && model === "S-5000") {
      warnings.push("S-5000 is oversized for 1GbE; S-1000 would halve the licence footprint.");
    }
    const unitsPerSite = throughput === "100GbE" ? 2 : 1;
    const total = unitsPerSite * sites;
    return {
      model,
      eps: tp.eps,
      note: tp.note,
      unitsPerSite,
      total,
      licence: total * 4800,
      warnings,
      backendOk: be.fits.includes(model),
    };
  }, [throughput, backend, thermal, sites]);

  const selectCls =
    "w-full rounded-md border border-hairline bg-void px-3 py-2.5 font-mono text-[12px] text-ink focus:border-cyan/60";

  return (
    <div className="rounded-md border border-hairline bg-panel p-6 lg:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Hardware Sizing Engine"}</p>
      <h3 className="mt-2 font-display text-[20px] font-bold text-ink">Throughput × Silicon × Thermal.</h3>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div>
          <label htmlFor="sizing-throughput" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            Network Throughput
          </label>
          <select id="sizing-throughput" value={throughput} onChange={(e) => setThroughput(e.target.value)} className={`${selectCls} mt-2`}>
            {THROUGHPUTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.note}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sizing-backend" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            Silicon Backend
          </label>
          <select id="sizing-backend" value={backend} onChange={(e) => setBackend(e.target.value)} className={`${selectCls} mt-2`}>
            {BACKENDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sizing-thermal" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            Thermal Envelope
          </label>
          <select id="sizing-thermal" value={thermal} onChange={(e) => setThermal(e.target.value)} className={`${selectCls} mt-2`}>
            {THERMALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="sizing-sites" className="flex justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
          <span>Sites</span>
          <span className="text-cyan">{sites}</span>
        </label>
        <input
          id="sizing-sites"
          type="range"
          min={1}
          max={200}
          step={1}
          value={sites}
          onChange={(e) => setSites(parseInt(e.target.value, 10))}
          className="mt-2 w-full accent-cyan"
        />
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Inspection budget", `${rec.eps.toLocaleString("en-US")} EPS`],
          ["Appliances per site", `${rec.unitsPerSite}`],
          ["Total appliances", `${rec.total}`],
          ["Backend supported", rec.backendOk ? "Yes" : "Substitution needed"],
          ["Indicative licence", `$${rec.licence.toLocaleString("en-US")} / yr`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-hairline bg-void px-3 py-3">
            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{k}</dt>
            <dd className="tabular mt-1 font-mono text-[12.5px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-md border border-cyan/40 bg-void px-4 py-3">
        <p className="font-mono text-[11.5px] text-ink">
          Recommendation: <span className="text-cyan">{rec.model}</span> × {rec.total}
          <span className="ml-2 text-muted">({rec.note})</span>
        </p>
      </div>

      {rec.warnings.length > 0 && (
        <div role="alert" className="mt-3 space-y-2 rounded-md border border-telemetry/50 bg-telemetry/[0.04] px-4 py-3">
          {rec.warnings.map((w) => (
            <p key={w} className="font-mono text-[11.5px] leading-relaxed text-telemetry">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
