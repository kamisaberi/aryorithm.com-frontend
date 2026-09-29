import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import NexusHud, { CAPABILITY_SIMS } from "@/components/simulations/NexusHud";
import CapabilityPanels from "@/components/simulations/CapabilityPanels";

export const metadata: Metadata = {
  title: "Sentinel Nexus — Tier 6 Command Plane | Aryorithm",
  description: "Orchestrate up to 5,000 autonomous Blackbox Sentinel appliances with sub-50ms collective immunity.",
};

const CAPABILITIES = [
  { id: "cap-ioc", index: "01", name: "Collective Immunity Engine", sub: "IocBroadcaster", color: "#00E5FF", blurb: "One node detects; five thousand kernels enforce. Signed indicators fan out over gRPC into every appliance's eBPF hash table inside the 50 ms immunity SLA.", stats: [["Fanout SLA", "< 50 ms", "#00FFA3"], ["Transport", "gRPC bidi"], ["Map Type", "BPF HASH"]] as [string, string, string?][] },
  { id: "cap-forge", index: "02", name: "Continuous Active Learning Feeder", sub: "ForgeBridge & DatasetCurator", color: "#FFB800", blurb: "The fleet gets smarter without leaking. Only ambiguous or novel feature vectors travel back to xinfer-forge — never packets, never payloads.", stats: [["Uncertainty Band", "0.40–0.60", "#FFB800"], ["Novelty Gate", "> 0.75"], ["Egress", "0 B raw"]] as [string, string, string?][] },
  { id: "cap-canary", index: "03", name: "Automated Over-The-Air Canary Pipeline", sub: "Shadow → 5% Cohort → Fleet Promote", color: "#00FFA3", blurb: "Three enforced gates stand between a new model and your substation: a 24-hour passive shadow, a hash-selected 5% cohort, then zero-downtime fleet promotion.", stats: [["Stages", "3 gated"], ["Shadow Window", "24 h"], ["Downtime", "0 frames", "#00FFA3"]] as [string, string, string?][] },
  { id: "cap-rollback", index: "04", name: "RollbackGuard Automated Safety Circuit", sub: "Telemetry Watchdog", color: "#FF3366", blurb: "A live circuit breaker on model quality. Breach the 1000 µs latency SLA or surge false positives and the artefact is revoked automatically — no human in the loop.", stats: [["Latency SLA", "< 1000 µs", "#FFB800"], ["FP Abort", "> 2.00 %"], ["Restore Time", "1.9 s"]] as [string, string, string?][] },
  { id: "cap-attest", index: "05", name: "Hardware Identity & Attestation Validator", sub: "TPM 2.0 PCR Quote Verification", color: "#00FFA3", blurb: "Machine trust is rooted in silicon, not software. Each appliance presents a TPM 2.0 quote checked against a pre-registered golden identity before it is trusted.", stats: [["PCR Bank", "[0–7]"], ["Signature", "EK / ed25519"], ["Spoofable", "No", "#00FFA3"]] as [string, string, string?][] },
];

export default function NexusPage() {
  return (
    <>
      <section id="nexus-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Platform" }, { label: "Sentinel Nexus" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Tier 6 Command Plane <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Sentinel Nexus: <span className="text-cyan text-glow">Collective Defense Fleet Grid.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Orchestrate up to 5,000 autonomous Blackbox Sentinel appliances across factories, naval vessels, and
            enterprise enclaves. Enforce collective immunity within 50 milliseconds of any single edge attack.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/platform/nexus#nexus-capabilities" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Inspect Orchestration Engine ]
            </Link>
            <Link href="/products/sentinel" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ View Edge Appliance ]
            </Link>
          </div>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline/50 sm:grid-cols-4">
            {[["Managed Nodes", "5,000"], ["Immunity SLA", "< 50 ms"], ["Control Port", "TCP 9443"], ["Consensus", "Raft"]].map(([k, v]) => (
              <div key={k} className="bg-panel px-4 py-3">
                <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{k}</dt>
                <dd className="tabular mt-1 font-mono text-[12.5px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mx-auto max-w-[1400px] px-5 pb-14 lg:px-8">
          <NexusHud />
        </div>
      </section>

      <section id="nexus-capabilities" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Five Capability Simulations"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">The Orchestration Engine, Live.</h2>
        <div className="mt-6">
          <CapabilityPanels capabilities={CAPABILITIES} sims={CAPABILITY_SIMS} />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
