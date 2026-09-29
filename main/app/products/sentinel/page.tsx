import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import SentinelSections from "@/components/simulations/SentinelSections";

export const metadata: Metadata = {
  title: "Blackbox Sentinel — Tier 3 Edge Appliance | Aryorithm",
  description: "Sub-millisecond cyber-physical XDR & SIEM: 26 decoupled modules, 30 protocol dissectors, three form factors.",
};

export default function SentinelPage() {
  return (
    <>
      <section id="sentinel-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Products" }, { label: "Blackbox Sentinel" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Tier 3 Edge Appliance <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Blackbox Sentinel: Sub-Millisecond Cyber-Physical XDR &amp; SIEM.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Turnkey 1U hardware appliances and hardened virtual appliances engineered for zero-latency detection, deep
            packet inspection, and in-kernel physical constraint enforcement across IT, OT, and medical environments.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products/sentinel#form-factors" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Compare Form Factors ]
            </Link>
            <Link href="/products/sentinel#subsystem-matrix" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Browse 26 Subsystems ]
            </Link>
          </div>
          <figure className="mt-8 max-w-3xl rounded-md border border-hairline bg-panel p-5">
            <figcaption className="flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              <span>Front Panel · Model S-5000</span>
              <span className="text-kernel">● Armed</span>
            </figcaption>
            <p className="mt-3 font-display text-[15px] font-bold tracking-[0.2em] text-ink">ARYORITHM BLACKBOX SENTINEL</p>
            <div className="mt-3 flex gap-4 font-mono text-[10.5px]">
              {["PWR", "TPM", "XDP", "CNRY"].map((l) => (
                <span key={l} className="flex items-center gap-1.5 text-muted"><span className="h-1.5 w-1.5 rounded-full bg-kernel" />{l}</span>
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-hairline bg-hairline/50 font-mono text-[11px]">
              {[["Throughput", "1.25M EPS"], ["Drop Path", "0.84 µs"], ["Modules", "26"]].map(([k, v]) => (
                <div key={k} className="bg-void px-3 py-2.5"><dt className="text-[9px] uppercase tracking-[0.14em] text-muted">{k}</dt><dd className="tabular mt-0.5 text-cyan">{v}</dd></div>
              ))}
            </dl>
          </figure>
        </div>
      </section>
      <SentinelSections />
      <ClosingCTA />
    </>
  );
}
