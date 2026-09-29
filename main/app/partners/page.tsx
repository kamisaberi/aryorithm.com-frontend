import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Partner Program | Aryorithm",
  description: "Technology alliances, system integrators, and OEM partnerships. Build sovereign defense with Aryorithm.",
};

const PARTNER_TIERS = [
  {
    tier: "Technology Alliance",
    color: "#00E5FF",
    desc: "For silicon vendors, compiler teams, and OS distributors building on the Aryorithm stack.",
    benefits: ["Early access to xInfer silicon matrix", "Joint benchmark program", "Co-engineering on new backends", "SLAB protocol specification access"],
  },
  {
    tier: "System Integrator",
    color: "#00FFA3",
    desc: "For defense integrators and critical infrastructure consultants deploying Aryorithm appliances.",
    benefits: ["Certified deployment training", "Field engineer enablement", "Priority procurement desk", "Co-marketing opportunities"],
  },
  {
    tier: "OEM & Appliance",
    color: "#FFB800",
    desc: "For hardware manufacturers embedding Blackbox Sentinel technology in their own appliance lines.",
    benefits: ["White-label appliance program", "Hardware datasheet license", "Custom form factor engineering", "Revenue share model"],
  },
];

const PARTNERS = [
  { name: "Silicon & Accelerator", focus: "NPU, GPU, FPGA vendors integrating with xInfer Engine", count: "8 partners" },
  { name: "Industrial OEMs", focus: "Turbine, breaker, and substation hardware manufacturers", count: "5 partners" },
  { name: "Defense Integrators", focus: "Cleared system integrators for government and defense deployment", count: "12 partners" },
  { name: "Academic Research", focus: "University labs collaborating on kernel and protocol research", count: "6 partners" },
];

export default function PartnersPage() {
  return (
    <>
      <section id="partners-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Partner Program" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Alliances & Integrations <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Build Sovereign Defense <span className="text-cyan">Together.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            We partner with silicon vendors, industrial OEMs, defense integrators, and academic labs to extend the
            Aryorithm sovereign defense ecosystem. No cloud dependencies, no data sharing, no compromise.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Become A Partner ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Integration Docs ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Partners", "31"], ["Countries", "14"], ["Deployments", "2,400+"]]} />
          </div>
        </div>
      </section>

      <section id="tiers" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Partnership Tiers"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Three Ways To Partner.</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {PARTNER_TIERS.map((t) => (
            <div key={t.tier} className="rounded-md border border-hairline bg-panel p-6">
              <h3 className="font-display text-[16px] font-bold" style={{ color: t.color }}>{t.tier}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{t.desc}</p>
              <ul className="mt-4 space-y-2">
                {t.benefits.map((b) => (
                  <li key={b} className="flex gap-2 text-[12.5px] text-muted">
                    <span className="text-cyan">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="ecosystem" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Ecosystem"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Who We Work With.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PARTNERS.map((p) => (
            <div key={p.name} className="rounded-md border border-hairline bg-panel p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[15px] font-bold text-ink">{p.name}</h3>
                <span className="font-mono text-[10.5px] text-cyan">{p.count}</span>
              </div>
              <p className="mt-2 text-[13px] text-muted">{p.focus}</p>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
