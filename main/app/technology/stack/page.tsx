import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";

export const metadata: Metadata = {
  title: "Sentinel Stack Master Documentation | Aryorithm",
  description:
    "Deployment guide for the Sentinel Stack meta-installer: reproducible builds, dependency verification, service startup, and deterministic teardown.",
};

const STACK_STAGES = [
  {
    name: "Prepare",
    description: "Verify the host kernel, compiler toolchain, container runtime, and required hardware capabilities.",
  },
  {
    name: "Build",
    description: "Compile and link the six tiers with the pinned dependency graph and signed build outputs.",
  },
  {
    name: "Verify",
    description: "Check every artifact hash, service manifest, and runtime capability before starting the stack.",
  },
  {
    name: "Launch",
    description: "Start the daemons in dependency order, attach the management plane, and confirm health checks.",
  },
  {
    name: "Remove",
    description: "Stop services and clean generated state without touching persistent evidence or customer data.",
  },
];

export default function SentinelStackManualPage() {
  return (
    <>
      <section id="stack-manual-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Technology" }, { label: "Sentinel Stack" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Tier 7 Meta-Installer <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Sentinel Stack <span className="text-cyan text-glow">Master Documentation.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Build and operate the full active-defense stack from one verified entry point. The installer binds the
            runtime, appliance, learning, lab, command, and range tiers into a reproducible deployment.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/projects/sentinel-stack"
              className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110"
            >
              [ Open Project Overview ]
            </Link>
            <Link
              href="/docs/sentinel-stack"
              className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan"
            >
              [ Read Full Documentation ]
            </Link>
            <Link
              href="/contact"
              className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan"
            >
              [ Contact Systems Team ]
            </Link>
          </div>
        </div>
      </section>

      <section id="stack-stages" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Deployment Lifecycle"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Five Deterministic Stages.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STACK_STAGES.map((stage, index) => (
            <div key={stage.name} className="rounded-md border border-hairline bg-panel p-5">
              <span className="font-mono text-[10px] text-cyan">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-[16px] font-bold text-ink">{stage.name}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{stage.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="stack-quickstart" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-md border border-hairline bg-panel p-6 lg:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Bootstrap"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink">One command to a verified stack.</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
              The installer resolves the pinned dependency graph, builds each tier, writes signed manifests, and
              starts the services in order. Use the dry-run mode on a new host before the first installation.
            </p>
            <pre className="mt-5 overflow-x-auto rounded border border-hairline bg-void/70 p-4 font-mono text-[10.5px] leading-relaxed text-kernel">
{`git clone https://github.com/kamisaberi/sentinel-stack.git
cd sentinel-stack

make verify
make dry-run
make bootstrap
make status`}
            </pre>
            <p className="mt-3 font-mono text-[10.5px] text-muted">
              A failed verification stops the build before any service is started.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">What Gets Installed</p>
              <ul className="mt-3 space-y-2 font-mono text-[11px] text-muted">
                <li>◆ xInfer runtime and silicon compiler</li>
                <li>◆ Blackbox kernel engine and appliance service</li>
                <li>◆ xInfer Forge continuous-learning pipeline</li>
                <li>◆ Sentinel Lab and Matrix range tooling</li>
                <li>◆ Sentinel Nexus command plane</li>
              </ul>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Safety Notes</p>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-muted">
                <li>Run the first install in a disposable environment.</li>
                <li>Keep persistent evidence outside the generated stack directory.</li>
                <li>Review the build manifest before enabling automatic updates.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="stack-next" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="rounded-md border border-cyan/30 bg-panel px-6 py-8 lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Continue Reading"}</p>
          <h2 className="mt-2 font-display text-[24px] font-bold text-ink">Operational references.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/docs/sentinel-stack" className="rounded-md border border-hairline p-4 text-[13px] text-muted transition-colors hover:border-cyan/50 hover:text-ink">
              → Sentinel Stack documentation
            </Link>
            <Link href="/docs/sentinel-lab/getting-started/installation-and-build" className="rounded-md border border-hairline p-4 text-[13px] text-muted transition-colors hover:border-cyan/50 hover:text-ink">
              → Build prerequisites and toolchain
            </Link>
            <Link href="/projects/sentinel-stack" className="rounded-md border border-hairline p-4 text-[13px] text-muted transition-colors hover:border-cyan/50 hover:text-ink">
              → Project overview and FAQ
            </Link>
          </div>
        </div>
      </section>

      <ClosingCTA />
    </>
  );
}
