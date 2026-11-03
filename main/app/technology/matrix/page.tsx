import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";

export const metadata: Metadata = {
  title: "Sentinel Matrix Operations Manual | Aryorithm",
  description:
    "Operational guide for the Sentinel Matrix cyber-range mesh: topology planning, traffic replay, adversary control, and closed-loop telemetry.",
};

const RANGE_MODES = [
  {
    name: "Replay",
    description: "Replay a captured PCAP against the twin with deterministic timing and repeatable reset points.",
    tag: "DETERMINISTIC",
  },
  {
    name: "Live adversary",
    description: "Drive an isolated adversary node with scripted TTPs while the defensive stack responds in real time.",
    tag: "INTERACTIVE",
  },
  {
    name: "Continuous",
    description: "Run the closed-loop flywheel with ambient telemetry, automated scoring, and regression checks.",
    tag: "FLYWHEEL",
  },
];

const LAUNCH_STEPS = [
  "Validate the hypervisor and container prerequisites from the Matrix quickstart.",
  "Define the target topology, node templates, and isolated network ranges in the scenario profile.",
  "Stage the PCAP catalog or connect a live telemetry source.",
  "Start the twin, verify health checks, and confirm management-plane isolation.",
  "Run the scenario, capture telemetry, and review the signed latency and mitigation report.",
];

export default function SentinelMatrixManualPage() {
  return (
    <>
      <section id="matrix-manual-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Technology" }, { label: "Sentinel Matrix" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Tier 5 Cyber-Range Mesh <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Sentinel Matrix <span className="text-cyan text-glow">Operations Manual.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            A practical operating guide for the containerized cyber-range mesh: build a twin, replay real traffic,
            run an isolated adversary, and verify defensive behavior before the scenario reaches production.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/projects/sentinel-matrix"
              className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110"
            >
              [ Open Project Overview ]
            </Link>
            <Link
              href="/docs/sentinel-matrix"
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

      <section id="matrix-modes" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Operating Modes"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">One Mesh, Three Verification Loops.</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {RANGE_MODES.map((mode) => (
            <div key={mode.name} className="rounded-md border border-hairline bg-panel p-6">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan">{mode.tag}</span>
              <h3 className="mt-3 font-display text-[18px] font-bold text-ink">{mode.name}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{mode.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="matrix-launch" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-hairline bg-panel p-6 lg:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Launch Sequence"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink">From topology to signed result.</h2>
            <ol className="mt-5 space-y-3">
              {LAUNCH_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-[13.5px] leading-relaxed text-muted">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-cyan/30 bg-cyan/5 font-mono text-[10px] text-cyan">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Prerequisites</p>
              <ul className="mt-3 space-y-2 font-mono text-[11px] text-muted">
                <li>◆ Linux host with KVM / VMware support</li>
                <li>◆ Docker or Podman with isolated bridge networks</li>
                <li>◆ At least 16 GB RAM for the starter mesh</li>
                <li>◆ Sentinel Nexus reachable for scoring and telemetry</li>
              </ul>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Reference Commands</p>
              <pre className="mt-3 overflow-x-auto rounded border border-hairline bg-void/70 p-3 font-mono text-[10.5px] leading-relaxed text-kernel">
{`make bootstrap
make up
make scenario SCENARIO=hospital-pacs
make observe
make down`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section id="matrix-next" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="rounded-md border border-cyan/30 bg-panel px-6 py-8 lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Go Deeper"}</p>
          <h2 className="mt-2 font-display text-[24px] font-bold text-ink">Choose your next document.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/docs/sentinel-matrix/getting-started/quickstart-one-command-launch" className="rounded-md border border-hairline p-4 text-[13px] text-muted transition-colors hover:border-cyan/50 hover:text-ink">
              → Quickstart: one-command launch
            </Link>
            <Link href="/docs/sentinel-matrix/real-pcap-replay/pcap-replay-pipeline-overview" className="rounded-md border border-hairline p-4 text-[13px] text-muted transition-colors hover:border-cyan/50 hover:text-ink">
              → PCAP replay pipeline
            </Link>
            <Link href="/docs/sentinel-matrix/live-adversary-node/adversary-node-architecture" className="rounded-md border border-hairline p-4 text-[13px] text-muted transition-colors hover:border-cyan/50 hover:text-ink">
              → Live adversary architecture
            </Link>
          </div>
        </div>
      </section>

      <ClosingCTA />
    </>
  );
}
