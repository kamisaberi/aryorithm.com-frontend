import Link from "next/link";

export default function ClosingCTA() {
  return (
    <section id="poc-cta" className="relative overflow-hidden border-b border-hairline py-16 lg:py-20">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="flex flex-col gap-8 rounded-md border border-hairline bg-panel p-7 lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-[24px] font-bold leading-tight tracking-[-0.015em] text-ink lg:text-[30px]">
              Deploy A Two-Node Defense POC In Your Own Air-Gapped Segment.
            </h2>
            <p className="mt-3.5 text-[14.5px] leading-[1.7] text-muted">
              Ship-to-site in 10 business days. Aryorithm field engineers install one Blackbox Sentinel appliance and
              one Sentinel Nexus instance inside your segment, replay your own captured traffic, and hand you a signed
              latency attestation report. No cloud tenancy, no data leaves your perimeter.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/contact"
              className="rounded-md bg-cyan px-6 py-3.5 text-center font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void transition-all duration-200 hover:brightness-110"
            >
              [ Request Defense POC ]
            </Link>
            <Link
              href="/contact#intake-portals"
              className="rounded-md border border-hairline px-6 py-3.5 text-center font-mono text-[12px] uppercase tracking-[0.1em] text-ink transition-all duration-200 hover:border-cyan/60 hover:text-cyan"
            >
              [ Talk To An Engineer ]
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
