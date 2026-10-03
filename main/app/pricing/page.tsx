"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import { PLAN_CATEGORIES, PLAN_ITEMS, SUB_PLANS } from "@/data/subscription-matrix";
import RoiCalculator from "@/components/simulations/RoiCalculator";

const PLAN_ORDER = ["community", "enterprise", "critical", "sovereign"];

function annualFor(cents: number | null): string | null {
  if (cents === null) return null;
  if (cents === 0) return "€0";
  return `€${Math.round((cents * 12 * 0.8) / 100).toLocaleString("en-US")}`;
}

function monthlyFor(cents: number | null): string | null {
  if (cents === null) return null;
  if (cents === 0) return "€0";
  return `€${(cents / 100).toLocaleString("en-US")}`;
}

function Cell({ value }: { value: string }) {
  const v = value ?? "—";
  if (v.startsWith("✔")) {
    const rest = v.slice(1).trim();
    return (
      <span className="text-kernel">
        ✔{rest && rest.toLowerCase() !== "included" ? <span className="ml-1 text-[10.5px] text-muted">{rest}</span> : null}
      </span>
    );
  }
  if (v.startsWith("✖")) {
    const rest = v.slice(1).trim();
    return (
      <span className="text-muted/50">
        ✖{rest ? <span className="ml-1 text-[10.5px] text-muted">{rest}</span> : null}
      </span>
    );
  }
  return <span className="text-[11px] text-ink">{v}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [tab, setTab] = useState("all");

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: PLAN_ITEMS.length };
    for (const c of PLAN_CATEGORIES) m[c.slug] = PLAN_ITEMS.filter((i) => i.category === c.slug).length;
    return m;
  }, []);

  const visibleCats = PLAN_CATEGORIES.filter((c) => tab === "all" || tab === c.slug);

  return (
    <>
      <section id="pricing-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Pricing" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Commercial Subscription Matrix <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Four Plans. <span className="text-cyan text-glow">92 Capabilities.</span> Zero Egress Taxes.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Node-based licensing for air-gapped enclaves and distributed infrastructure. Every cell below is served
            from the live subscription catalog — prices change in the database, not in a redeploy.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-hairline bg-panel p-1" role="group" aria-label="Billing period">
              {(["Monthly", "Annual"] as const).map((label) => {
                const active = annual === (label === "Annual");
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAnnual(label === "Annual")}
                    className={`rounded px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] transition-colors ${active ? "bg-cyan font-bold text-void" : "text-muted hover:text-ink"}`}
                  >
                    {label}{label === "Annual" ? " −20%" : ""}
                  </button>
                );
              })}
            </div>
            <span className="font-mono text-[11px] text-muted">Annual billing saves 20% on every paid tier.</span>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUB_PLANS.map((p) => {
              const price = annual ? annualFor(p.priceMonthCents) : monthlyFor(p.priceMonthCents);
              const per = p.priceMonthCents === null ? "Enterprise / Year" : p.priceMonthCents === 0 ? "Free Forever" : annual ? "per node / year" : "per node / month";
              const featured = p.slug === "critical";
              return (
                <article
                  key={p.slug}
                  className="flex flex-col rounded-md border bg-panel p-6"
                  style={featured ? { borderColor: "#00E5FF88", boxShadow: "0 0 34px -12px #00E5FF" } : { borderColor: "#1A2232" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{p.name}</p>
                    {featured && (
                      <span className="rounded bg-cyan px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-void">Most Deployed</span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-[28px] font-bold text-ink">
                    {price ?? p.priceDisplay} <span className="text-[11px] font-normal text-muted">{per}</span>
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">{p.target}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-[12.5px] text-muted">
                    {[["Deployment", p.deployment], ["Capacity", p.nodeCapacity], ["Licensing", p.licensing], ["Support", p.support]].map(([k, v]) => (
                      <li key={k} className="flex gap-2"><span className="shrink-0 font-mono text-[10.5px] text-cyan">{k}:</span><span>{v}</span></li>
                    ))}
                  </ul>
                  <Link href={p.ctaHref.startsWith("http") ? p.ctaHref : p.ctaHref} {...(p.ctaHref.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} className={`mt-5 rounded-md px-4 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] transition-all ${featured ? "bg-cyan font-bold text-void hover:brightness-110" : "border border-hairline text-ink hover:border-cyan/60 hover:text-cyan"}`}>
                    [ {p.ctaLabel} ]
                  </Link>
                </article>
              );
            })}
          </div>
          <div className="mt-6 max-w-4xl">
            <StatStrip items={[["Billing Unit", "per node"], ["Egress", "$0.00", "#00FFA3"], ["Catalog", "live DB", "#00E5FF"]]} />
          </div>
        </div>
      </section>

      <section id="subscription-matrix" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Full Capability Matrix"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Every Tier. Every Module. Every Plugin.</h2>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Feature categories">
          {[{ slug: "all", label: "All Features" }, ...PLAN_CATEGORIES].map((c) => (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={tab === c.slug}
              onClick={() => setTab(c.slug)}
              className={`rounded-md border px-3 py-2 font-mono text-[11px] transition-colors ${tab === c.slug ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {c.label} ({counts[c.slug] ?? 0})
            </button>
          ))}
        </div>

        {visibleCats.map((cat) => {
          const rows = PLAN_ITEMS.filter((i) => i.category === cat.slug);
          return (
            <div key={cat.slug} className="mt-8">
              <h3 className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink">{cat.label} <span className="text-muted">({rows.length})</span></h3>
              <div className="mt-3 overflow-x-auto rounded-md border border-hairline">
                <table className="w-full min-w-[860px] border-collapse bg-panel text-left">
                  <thead>
                    <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      <th className="px-4 py-3">Capability</th>
                      {PLAN_ORDER.map((slug) => (
                        <th key={slug} className="px-4 py-3">{SUB_PLANS.find((p) => p.slug === slug)?.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[11.5px]">
                    {rows.map((row) => (
                      <tr key={row.itemKey} className="border-b border-hairline/60 last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="block text-[12px] text-ink">{row.itemLabel}</span>
                          {row.itemSub && <span className="mt-0.5 block text-[10.5px] text-muted">{row.itemSub}</span>}
                        </td>
                        {PLAN_ORDER.map((slug) => (
                          <td key={slug} className="whitespace-nowrap px-4 py-2.5"><Cell value={row.values[slug] ?? "—"} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <RoiCalculator />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
            [ Request A Costed Architecture ]
          </Link>
          <Link href="/trust" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
            [ Verify Our Compliance Claims ]
          </Link>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
