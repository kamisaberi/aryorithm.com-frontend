"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import PageSidebar from "@/components/layout/PageSidebar";
import CodeViewer from "@/components/ui/CodeViewer";
import { StatStrip } from "@/components/ui/StatusBadge";
import { INSIGHT_CATEGORIES, JITTER_ROWS, MODBUS_SNIPPET, PUBLICATIONS, THROUGHPUT_ROWS } from "@/data/insights";

function ThroughputTable() {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline">
      <table className="w-full min-w-[560px] text-left font-mono text-[11px]">
        <thead><tr className="border-b border-hairline text-muted">{["CPU", "Mode", "EPS", "Cache", "Bypass"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {THROUGHPUT_ROWS.map((r) => (
            <tr key={`${r.cpu}-${r.mode}`} className="matrix-row border-b border-hairline/60 last:border-0">
              <td className="px-3 py-2 text-ink">{r.cpu}</td>
              <td className="px-3 py-2 text-muted">{r.mode}</td>
              <td className="tabular px-3 py-2 text-cyan">{r.eps.toLocaleString("en-US")}</td>
              <td className="tabular px-3 py-2 text-ink">{r.cache.toFixed(1)}%</td>
              <td className="px-3 py-2 text-kernel">{r.bypass ? "zero-copy" : "copy"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JitterTable() {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline">
      <table className="w-full min-w-[480px] text-left font-mono text-[11px]">
        <thead><tr className="border-b border-hairline text-muted">{["Percentile", "JVM G1GC", "C++20 Native"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {JITTER_ROWS.map(([p, jvm, nat]) => (
            <tr key={p} className="matrix-row border-b border-hairline/60 last:border-0">
              <td className="px-3 py-2 text-muted">{p}</td>
              <td className="tabular px-3 py-2 text-threat">{jvm}</td>
              <td className="tabular px-3 py-2 text-kernel">{nat}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MATH = [
  "Contrastive objective  L_InfoNCE = −log[ exp(sim(z_i,z_i⁺)/τ) / Σ_j exp(sim(z_i,z_j)/τ) ]",
  "Margin condition  min_{a∈A} d(z_a,M_normal) ≥ γ   where γ = margin, M = ambient manifold",
  "Promotion gate  promote(θ′) ⟺ ∀a∈G: detect(θ′,a) = 1,  |G| = 18",
  "Poisoning bound  if ∃a∈G: detect(θ′,a) = 0  ⟹  purge(θ′) ∧ retain(θ)",
];

export default function InsightsPage() {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>("pub-modbus");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PUBLICATIONS.filter((p) => {
      const okC = cat === "all" || p.cat === cat;
      const okQ = !q || `${p.title} ${p.summary} ${p.kicker}`.toLowerCase().includes(q);
      return okC && okQ;
    });
  }, [cat, query]);

  return (
    <>
      <section id="insights-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Research" }, { label: "Technical Insights" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-telemetry">[</span> Zero Marketing Fluff · Pure Systems Engineering <span className="text-telemetry">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Kernel Dissections, Exploit Post-Mortems &amp; Whitepapers.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Written by the engineers who shipped the code, for engineers who will read the disassembly. Every claim
            carries the measurement that produced it, and where we lost a benchmark we say so.
          </p>
        </div>
      </section>

      <section id="publications" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Engineering Publications"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Four Papers. Every Number Reproducible.</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <input
                id="insight-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search papers…"
                className="min-w-[200px] flex-1 rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink placeholder:text-muted/40"
              />
              {[{ id: "all", label: `All ${PUBLICATIONS.length}` }, ...INSIGHT_CATEGORIES.map((c) => ({ id: c.id, label: `${c.label} (${PUBLICATIONS.filter((p) => p.cat === c.id).length})` }))].map((c) => (
                <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-md border px-3 py-2 font-mono text-[11px] ${cat === c.id ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <p role="status" className="mt-3 font-mono text-[11px] text-muted">{filtered.length} publications listed</p>
            <div className="mt-5 space-y-4">
              {filtered.map((p) => {
                const open = openId === p.id;
                const c = INSIGHT_CATEGORIES.find((x) => x.id === p.cat);
                return (
                  <article key={p.id} className="rounded-md border border-hairline bg-panel" style={open ? { borderColor: "#00E5FF88", boxShadow: "0 0 34px -12px #00E5FF" } : undefined}>
                    <button type="button" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open} className="block w-full px-5 py-5 text-left lg:px-7">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        {c?.label} · {p.kicker} · {p.readTime} · {p.date}
                      </p>
                      <h3 className="mt-2 max-w-4xl font-display text-[17px] font-bold leading-snug text-ink">{p.title}</h3>
                      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{p.summary}</p>
                    </button>
                    <div className="px-5 pb-4 lg:px-7"><StatStrip items={p.stats} /></div>
                    {open && (
                      <div className="rise-in space-y-4 border-t border-hairline bg-void/40 px-5 py-5 lg:px-7">
                        {p.body.map((para) => (
                          <p key={para.slice(0, 32)} className="max-w-4xl text-[13.5px] leading-[1.8] text-muted">{para}</p>
                        ))}
                        {p.kind === "code" && <CodeViewer code={MODBUS_SNIPPET} lang="cpp" filename="dissectors/modbus_tcp.cpp — function-code 0x05 constraint check" />}
                        {p.kind === "throughput" && <ThroughputTable />}
                        {p.kind === "jitter" && <JitterTable />}
                        {p.kind === "math" && (
                          <ul className="space-y-2 rounded-md border border-hairline bg-void p-4 font-mono text-[11.5px] text-cyan">
                            {MATH.map((m) => <li key={m}>{m}</li>)}
                          </ul>
                        )}
                        <p className="rounded-md border border-hairline bg-void px-4 py-2.5 font-mono text-[11px] text-muted">
                          <span className="text-cyan">[ {p.artefact} ]</span> · {p.artefactNote}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/research/sentinel-lab" className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">[ Sentinel-Lab Evaluation Harness ]</Link>
              <Link href="/faq" className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">[ Architectural FAQ ]</Link>
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "Categories",
                items: INSIGHT_CATEGORIES.map((c) => ({
                  label: c.label,
                  href: `/insights?category=${c.id}`,
                  meta: String(PUBLICATIONS.filter((p) => p.cat === c.id).length),
                })),
              },
              {
                heading: "Featured",
                items: PUBLICATIONS.slice(0, 3).map((p) => ({
                  label: p.title,
                  href: `/insights#${p.id}`,
                  meta: p.date,
                })),
              },
            ]}
            cta={{ label: "Sentinel-Lab", href: "/research/sentinel-lab" }}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
