import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import ForgePipeline from "@/components/simulations/ForgePipeline";
import { InfoNceVisualizer, MaeVisualizer, SafetyGate } from "@/components/simulations/ForgeSims";

export const metadata: Metadata = {
  title: "xInfer Forge — Tier 4 Continuous Learning | Aryorithm",
  description: "On-device self-supervised adaptation across ambient, unlabeled site NetFlow vectors with guaranteed safety gates.",
};

export default function ForgePage() {
  return (
    <>
      <section id="forge-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Technology" }, { label: "xInfer Forge" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-telemetry">[</span> Tier 4 Continuous Learning <span className="text-telemetry">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            xInfer Forge: Air-Gapped Continual Learning Service.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            On-device self-supervised adaptation across ambient, unlabeled site NetFlow vectors with mathematically
            guaranteed safety gates against model poisoning.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/forge#safety-gate" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Run The Safety Gate ]
            </Link>
            <Link href="/technology/forge#learning-pipeline" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ View Learning Pipeline ]
            </Link>
          </div>
          <div className="mt-8 max-w-3xl rounded-md border border-hairline bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Adaptation Threat Model</p>
            <ul className="mt-3 space-y-1.5 font-mono text-[11.5px]">
              {[["✕ Manual data labeling required", false], ["✕ Raw packets leave the site", false], ["✕ Attacker can drift the baseline", false], ["✓ Self-supervised on ambient flow", true], ["✓ Golden attack suite is immutable", true], ["✓ Regression gate blocks promotion", true]].map(([l, ok]) => (
                <li key={l as string} className={ok ? "text-kernel" : "text-threat"}>{l as string}</li>
              ))}
            </ul>
            <div className="mt-4"><StatStrip items={[["Labels", "0", "#00FFA3"], ["Egress", "0 B", "#00FFA3"], ["Gate", "Mandatory", "#FFB800"]]} /></div>
          </div>
        </div>
      </section>

      <section id="learning-pipeline" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Learning Pipeline"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">MAE → InfoNCE → Safety Gate.</h2>
        <div className="mt-6"><ForgePipeline /></div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <MaeVisualizer />
          <InfoNceVisualizer />
        </div>
        <div className="mt-6"><SafetyGate /></div>
      </section>
      <ClosingCTA />
    </>
  );
}
