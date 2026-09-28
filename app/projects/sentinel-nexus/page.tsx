import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Sentinel Nexus — Tier 6 Collective Defense Command Plane | Aryorithm",
  description: "The orchestration plane for fleet-wide collective immunity. OTA canary deployments, attestation, and cross-appliance threat correlation.",
};

const CAPABILITIES = [
  { name: "Fleet Command Center", desc: "Real-time health monitoring, canary wave status, and heartbeat meters for all connected appliances." },
  { name: "OTA Canary Pipeline", desc: "Shadow → 5% cohort → fleet promote rollout with automatic rollback on anomaly detection." },
  { name: "Attestation Validator", desc: "TPM 2.0 PCR quote verification and identity tier enforcement across the fleet." },
  { name: "Threat Correlation", desc: "Cross-appliance threat intelligence sharing without cloud connectivity." },
  { name: "Policy Distribution", desc: "Fleet-wide security policy updates with signed, verifiable manifests." },
  { name: "Evidence Aggregation", desc: "Centralized evidence carving and forensic timeline reconstruction." },
];

export default function SentinelNexusPage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Sentinel Nexus" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-telemetry">[</span> Tier 6 Collective Defense <span className="text-telemetry">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Sentinel Nexus
          </h1>
          <p className="mt-2 font-mono text-[13px] text-telemetry">Tier 6 Collective Defense Command Plane</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The orchestration plane for fleet-wide collective immunity. Sentinel Nexus manages OTA canary deployments,
            attestation, and cross-appliance threat correlation — all within the air-gapped enclave.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/platform/nexus" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Platform ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v3.1.0"], ["Fleet Size", "2,400+"], ["Countries", "14"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What Is Sentinel Nexus?</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Sentinel Nexus is the command plane that turns individual Blackbox Sentinel appliances into a collective
            defense fleet. It provides centralized visibility, policy management, and threat correlation without
            requiring any cloud connectivity.
          </p>
          <p>
            Traditional fleet management systems rely on cloud-based control planes — a model that is fundamentally
            incompatible with air-gapped critical infrastructure. Sentinel Nexus operates entirely within the
            enclave, communicating with appliances over the local network using the SLAB wire protocol.
          </p>
          <p>
            The system implements a three-tier identity hierarchy rooted in TPM 2.0 silicon. Each appliance proves its
            identity before the orchestration plane accepts a single verdict from it. This prevents compromised or
            spoofed appliances from injecting false threat intelligence into the fleet.
          </p>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Capabilities"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Six Core Capabilities.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.name} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[14px] font-bold text-ink">{c.name}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ota" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// OTA Canary Pipeline"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Shadow → Cohort → Fleet.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The OTA canary pipeline is the mechanism by which firmware and model updates are safely distributed across
            the fleet. It follows a three-stage promotion model that minimizes risk while maximizing deployment speed.
          </p>
          <p>
            <span className="text-ink">Shadow stage:</span> The update is deployed to a small number of appliances in
            shadow mode — running the new code alongside the old, comparing outputs, but not enforcing decisions.
            Anomalies are flagged for human review.
          </p>
          <p>
            <span className="text-ink">Cohort stage:</span> If the shadow stage shows no anomalies, the update is
            promoted to a 5% cohort of appliances in active enforcement mode. The cohort is monitored for 24 hours
            with automatic rollback on any recall degradation.
          </p>
          <p>
            <span className="text-ink">Fleet promote:</span> If the cohort stage is clean, the update is promoted to
            the full fleet. The promotion is gradual — 10% per hour — to prevent thundering herd issues and allow
            monitoring at each stage.
          </p>
        </div>
      </section>

      <section id="attestation" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Attestation"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">TPM-Rooted Identity.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Every appliance in the fleet proves its identity using TPM 2.0 attestation. The endorsement key sealed
            inside the TPM cannot leave the chip, so an appliance proves what it physically is before the
            orchestration plane accepts a single verdict from it.
          </p>
          <p>
            The attestation process covers PCR[0–7] measurements — the firmware, bootloader, and kernel integrity
            values. If any measurement deviates from the expected value, the appliance is quarantined and its
            verdicts are rejected by the fleet.
          </p>
          <p>
            Where no TPM exists, the system degrades loudly rather than failing open. The appliance is marked as
            untrusted and its verdicts are flagged for manual review. This is a deliberate design decision: a missing
            TPM is a security event, not a silent degradation.
          </p>
        </div>
      </section>

      <section id="command-center" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Command Center"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Port 9443 Fleet HUD.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The Nexus Command Center is a web-based fleet management interface that runs on port 9443 of the Nexus
            appliance. It provides real-time visibility into fleet health, canary wave status, and threat activity.
          </p>
          <p>
            The interface is entirely self-contained — no external CDN, no cloud fonts, no third-party scripts. Every
            asset is served from the local appliance, ensuring the command center remains fully functional even in
            the most restrictive air-gapped environments.
          </p>
          <p>
            Key views include the Fleet Overview (health, canary waves, heartbeat meters), the Threat Timeline
            (cross-appliance threat correlation), and the Policy Manager (fleet-wide security policy distribution).
          </p>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
