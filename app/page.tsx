import type { Metadata } from "next";
import Link from "next/link";
import TopologyCanvas from "@/components/simulations/TopologyCanvas";
import LatencyComparator from "@/components/simulations/LatencyComparator";
import NexusTerminal from "@/components/simulations/NexusTerminal";
import ClosingCTA from "@/components/sections/ClosingCTA";
import MatrixTable from "@/components/sections/MatrixTable";
import TelemetryBar from "@/components/simulations/TelemetryBar";
import { DIVIDE_ROWS, ECO_TIERS } from "@/data/home";
import EcoTiers from "@/components/simulations/EcoTiers";

export const metadata: Metadata = {
  title: "Aryorithm Technologies — Deterministic Sub-Millisecond Active Defense",
  description:
    "Autonomous cyber-physical active defense: 0.84µs eBPF/XDP kernel mitigation, libxinfer across 15 silicon backends, air-gapped collective immunity.",
};

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section id="hero-section" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-14 pt-14 lg:px-8 lg:pt-20">
          <div className="grid items-end gap-8 lg:grid-cols-2">
            <div className="flex h-full flex-col justify-end">
              <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                {["0.84µs eBPF Mitigation", "15 Silicon Targets", "100% Air-Gapped"].map((b) => (
                  <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 text-muted">
                    <span className="text-cyan">[</span> {b} <span className="text-cyan">]</span>
                  </span>
                ))}
              </div>
              <h1 className="mt-6 font-display text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[46px] lg:text-[52px]">
                From 60-Second Cloud Detection To{" "}
                <span className="text-cyan text-glow">0.84-Microsecond</span> Kernel Mitigation.
              </h1>
              <p className="mt-5 text-[15px] leading-[1.75] text-muted">
                Aryorithm delivers the world&apos;s first autonomous cyber-physical active defense ecosystem. Powered by
                libxinfer across 15 silicon backends and native Linux eBPF/XDP, Sentinel Nexus turns distributed edge
                appliances into an air-gapped, collective immunity defense grid.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/platform/nexus"
                  className="rounded-md bg-cyan px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110"
                >
                  [ Explore Sentinel Nexus ]
                </Link>
                <Link
                  href="/#latency-comparator"
                  className="rounded-md border border-hairline px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan"
                >
                  [ Read Academic Preprint (PDF) ]
                </Link>
              </div>
              <dl className="mt-8 grid gap-px overflow-hidden rounded-md border border-hairline bg-hairline/50 sm:grid-cols-3">
                {[
                  ["Runtime", "Native C++20"],
                  ["Attestation", "TPM 2.0 Quote"],
                  ["Deployment", "On-Prem / Sovereign"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-panel px-4 py-3">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{k}</dt>
                    <dd className="mt-1 font-mono text-[12.5px] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <figure id="hero-topology" className="flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-panel/60">
              <TopologyCanvas />
              <figcaption className="grid grid-cols-2 gap-px border-t border-hairline bg-hairline/40 font-mono text-[11px] sm:grid-cols-4">
                {[
                  ["Nodes", "1,482"],
                  ["Fanout", "38.4 ms"],
                  ["Egress", "0 B"],
                  ["TPM", "Pass"],
                ].map(([k, v]) => (
                  <span key={k} className="bg-panel px-4 py-2.5">
                    <span className="text-muted">{k.toUpperCase()} </span>
                    <span className="tabular text-cyan">{v}</span>
                  </span>
                ))}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* TELEMETRY */}
      <section id="telemetry-bar" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <TelemetryBar />
      </section>

      {/* DIVIDE */}
      <section id="architectural-divide" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// The Architectural Divide"}</p>
        <h2 className="mt-2 max-w-2xl font-display text-[26px] font-bold text-ink lg:text-[32px]">
          Passive Cloud Alerting vs. Active Kernel Defense.
        </h2>
        <div className="mt-6">
          <MatrixTable
            head={["Dimension", "Legacy Cloud SIEM / EDR", "Aryorithm Active Defense"]}
            rows={DIVIDE_ROWS.map((r) => [r.dimension, r.legacy, r.aryorithm])}
          />
        </div>
      </section>

      {/* LATENCY */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <LatencyComparator />
      </section>

      {/* ECOSYSTEM */}
      <section id="ecosystem-overview" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Ecosystem Overview"}</p>
        <h2 className="mt-2 max-w-2xl font-display text-[26px] font-bold text-ink lg:text-[32px]">
          Three Tiers. One Deterministic Pipeline.
        </h2>
        <div className="mt-6">
          <EcoTiers tiers={ECO_TIERS} />
        </div>
      </section>

      {/* CLI */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <NexusTerminal />
      </section>

      <ClosingCTA />
    </>
  );
}
