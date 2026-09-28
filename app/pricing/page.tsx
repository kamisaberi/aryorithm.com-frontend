import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import { TIERS } from "@/data/pricing";
import RoiCalculator from "@/components/simulations/RoiCalculator";

export const metadata: Metadata = {
  title: "Enterprise Pricing & Licensing | Aryorithm",
  description: "Predictable sovereign licensing: $0 research, $4,800/node/yr edge, custom Nexus fleet, classified enclave. Zero egress taxes.",
};

function TierCard({ tier }: { tier: (typeof TIERS)[number] }) {
  const ctaCls =
    tier.ctaStyle === "solid"
      ? "bg-cyan text-void hover:brightness-110"
      : tier.ctaStyle === "outline"
        ? "border border-cyan/60 text-cyan hover:bg-cyan/10"
        : "border border-hairline text-muted hover:border-cyan/60 hover:text-cyan";
  return (
    <article
      className="flex flex-col rounded-md border bg-panel p-6"
      style={tier.featured ? { borderColor: "#00E5FF88", boxShadow: "0 0 34px -12px #00E5FF" } : { borderColor: "#1A2232" }}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: tier.color }}>{tier.n}</p>
        {tier.featured && (
          <span className="rounded bg-cyan px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-void">Most Deployed</span>
        )}
      </div>
      <h3 className="mt-2 font-display text-[20px] font-bold text-ink">{tier.name}</h3>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">{tier.audience}</p>
      <p className="mt-3 font-mono text-[28px] font-bold text-ink">
        {tier.price} <span className="text-[11px] font-normal text-muted">{tier.priceNote}</span>
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {tier.features.map((f) => (
          <li key={f} className="flex gap-2 text-[12.5px] text-muted"><span className="text-kernel">✓</span>{f}</li>
        ))}
      </ul>
      <Link href={tier.ctaSection ? `${tier.ctaTo}#${tier.ctaSection}` : tier.ctaTo} className={`mt-5 rounded-md px-4 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] transition-all ${ctaCls}`}>
        [ {tier.cta} ]
      </Link>
    </article>
  );
}

export default function PricingPage() {
  return (
    <>
      <section id="pricing-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Pricing" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Predictable Sovereign Licensing <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Zero Cloud Egress Taxes. <span className="text-cyan text-glow">Deterministic Node Economics.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Simple, node-based pricing for air-gapped enclaves and distributed industrial infrastructure. No ingestion
            metering, no bandwidth penalties, no query limits.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing#roi-calculator" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Calculate Your Savings ]
            </Link>
            <Link href="/pricing#licensing-matrix" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Compare License Tiers ]
            </Link>
          </div>
          <div className="mt-8 grid max-w-4xl gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Metering We Do Not Do</p>
              <ul className="mt-3 space-y-1.5 font-mono text-[11.5px] text-muted">
                {["Per-GB log ingestion fees", "Cross-zone / WAN egress charges", "Hot-to-cold retention tiering", "Search & query concurrency limits", "Per-seat analyst dashboard licences", "Overage penalties on traffic spikes"].map((l) => (
                  <li key={l} className="flex justify-between gap-2"><span>✕ {l}</span><span className="text-kernel">$0.00</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-5">
              <StatStrip items={[["Billing Unit", "per node"], ["Egress", "$0.00", "#00FFA3"], ["Term", "annual"]]} />
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                A substation that doubles its telemetry costs exactly the same to defend. Licensing scales with the
                appliances you rack — never with traffic spikes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="licensing-matrix" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Tiered Commercial Licensing"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Four Tiers. One Billing Unit. No Surprises.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Licensing scales with the number of appliances you rack, not with how much traffic your plant happens to
          generate that quarter.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <TierCard key={t.id} tier={t} />
          ))}
        </div>
        <p className="mt-4 font-mono text-[10.5px] leading-relaxed text-muted">
          All commercial tiers include the full 26-module subsystem set. Aryorithm does not gate detection capability
          behind pricing tiers — a single-node customer runs the identical kernel enforcement path as a 5,000-node
          sovereign fleet.
        </p>
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
