import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import AboutPillars from "@/components/simulations/AboutPillars";
import { CONSEQUENCE_TIMELINE } from "@/data/about";

export const metadata: Metadata = {
  title: "Company Mission & Sovereignty | Aryorithm",
  description: "The Aryorithm manifesto: local, deterministic, physically attested defense — and the four pillars we will not trade away.",
};

export default function AboutPage() {
  return (
    <>
      <section id="manifesto" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Mission & Sovereignty" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> The Aryorithm Manifesto <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Engineered for the Millisecond Where Cloud Defense Fails.
          </h1>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="space-y-4 border-l-2 border-cyan/60 pl-5 text-[15px] leading-[1.8] text-muted">
                <p>
                  When weaponized exploits target a physical turbine, an electrical grid substation, or an airborne
                  avionics datalink, cloud-bound SIEMs taking 15 to 60 seconds to index logs are generating{" "}
                  <span className="text-ink">autopsies, not defense</span>.
                </p>
                <p>
                  Aryorithm was founded on the conviction that critical infrastructure security must be{" "}
                  <span className="text-cyan">local</span>, <span className="text-cyan">deterministic</span>, and{" "}
                  <span className="text-cyan">physically attested</span>.
                </p>
              </div>
              <p className="mt-5 text-[14.5px] leading-[1.8] text-muted">
                A relay does not wait for a ticket. A turbine governor does not pause for an analyst to acknowledge an
                alert. Physical processes proceed at the speed of physics, and any defense that arrives after the
                actuator has moved is documentation of a failure rather than prevention of one. That single observation
                determines every engineering decision in this company: why the mitigation path is C++20 and eBPF
                instead of a managed runtime, why identity is rooted in a TPM instead of a certificate file, and why
                not one byte of your telemetry is required to leave your perimeter for the system to work.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about#four-pillars" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
                  [ The Four Pillars ]
                </Link>
                <Link href="/trust" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
                  [ Verify Every Claim ]
                </Link>
              </div>
              <div className="mt-6 max-w-md"><StatStrip items={[["Founded", "2021"], ["Lab", "Amsterdam"], ["Cloud Deps", "0", "#00FFA3"]]} /></div>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The Window Cloud Defense Cannot Reach</p>
              <ol className="mt-4 space-y-3">
                {CONSEQUENCE_TIMELINE.map((t) => (
                  <li key={t.at} className="flex gap-3">
                    <span className="tabular w-20 shrink-0 font-mono text-[11.5px]" style={{ color: t.color }}>{t.at}</span>
                    <span>
                      <span className="block text-[12.5px] font-medium text-ink">{t.event}</span>
                      <span className="block font-mono text-[10px] text-muted">{t.note}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-hairline pt-3 font-mono text-[10.5px] leading-relaxed text-muted">
                By the time a cloud pipeline has indexed the log, the physical process has completed its state change
                roughly 60,000× over.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="four-pillars" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// The Four Pillars of Sovereign Defense"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Four Commitments We Will Not Trade Away.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          These are architectural constraints, not marketing positions. Each one forecloses design options that would
          have been easier to build, and each is independently verifiable in the shipped product.
        </p>
        <div className="mt-6"><AboutPillars /></div>
        <div className="mt-8 rounded-md border border-hairline bg-panel p-6">
          <h3 className="font-display text-[17px] font-bold text-ink">What This Costs Us</h3>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-[1.8] text-muted">
            Holding these four lines is commercially inconvenient. Refusing cloud dependency means we cannot bill per
            gigabyte ingested, which is the most profitable meter in this industry. Refusing managed runtimes means a
            smaller hiring pool and slower feature velocity. Rooting identity in silicon means we sometimes have to tell
            a prospective customer their existing hardware cannot achieve the strongest trust tier. We accept all of it,
            because a defense product that compromises on any of the four stops being able to make the only promise
            that matters to a substation operator.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/pricing" className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">[ See Node-Based Licensing ]</Link>
            <Link href="/contact" className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">[ Speak With A Field Architect ]</Link>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
