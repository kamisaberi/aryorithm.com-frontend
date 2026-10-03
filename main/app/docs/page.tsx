import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";

export const metadata: Metadata = {
  title: "Documentation | Aryorithm",
  description: "Technical documentation for the Aryorithm sovereign defense stack. API references, integration guides, and architecture docs.",
};

const DOC_SECTIONS = [
  {
    id: "blackbox-essential",
    title: "Blackbox Essential (libblackbox.so)",
    color: "#00E5FF",
    desc: "Sub-microsecond eBPF/XDP defense — full documentation: setup, kernel engine, ring, TPM, API.",
    links: [
      { label: "Full Documentation (69 guides)", to: "/docs/blackbox-essential" },
      { label: "eBPF/XDP Subsystem", to: "/docs/blackbox-essential/ebpf-xdp-subsystem" },
      { label: "SPMC Ring Buffer", to: "/docs/blackbox-essential/spmc-ring-buffer" },
      { label: "Hardware Identity & TPM", to: "/docs/blackbox-essential/hardware-identity-tpm" },
      { label: "C++20 API Reference", to: "/docs/blackbox-essential/api-reference" },
    ],
  },
  {
    id: "blackbox-sentinel",
    title: "Blackbox Sentinel (sentinel daemon)",
    color: "#00E5FF",
    desc: "Turnkey XDR appliance — full documentation: 26 subsystems, 30 plugins, uplink, console.",
    links: [
      { label: "Full Documentation (120+ guides)", to: "/docs/blackbox-sentinel" },
      { label: "26 Subsystems", to: "/docs/blackbox-sentinel/subsystems-26" },
      { label: "30 Protocol Plugins", to: "/docs/blackbox-sentinel/plugins-30" },
      { label: "Nexus Uplink Sync", to: "/docs/blackbox-sentinel/nexus-uplink" },
      { label: "Web Command Center", to: "/docs/blackbox-sentinel/web-command-center" },
    ],
  },
  {
    id: "xinfer-forge",
    title: "xInfer Forge (forge-cli)",
    color: "#00FFA3",
    desc: "Continual learning daemon — full documentation: MAE engine, golden gate, export, staging.",
    links: [
      { label: "Full Documentation (75 guides)", to: "/docs/xinfer-forge" },
      { label: "Self-Supervised MAE Engine", to: "/docs/xinfer-forge/self-supervised-engine" },
      { label: "Golden Safety Gate", to: "/docs/xinfer-forge/safety-regression-gate" },
      { label: "forge-cli Reference", to: "/docs/xinfer-forge/cli-reference" },
      { label: "Nexus Staging Bridge", to: "/docs/xinfer-forge/nexus-integration" },
    ],
  },
  {
    id: "xinfer-engine",
    title: "xInfer Essential (libxinfer.so)",
    color: "#00FFA3",
    desc: "The heterogeneous silicon runtime — full documentation: setup, 15 backends, memory, plugins, API.",
    links: [
      { label: "Full Documentation (75 guides)", to: "/docs/xinfer-essential" },
      { label: "Silicon Backend Matrix", to: "/docs/xinfer-essential/silicon-backends" },
      { label: "Zero-Copy Memory Model", to: "/docs/xinfer-essential/architecture/zero-copy-model" },
      { label: "Plugin Architecture", to: "/docs/xinfer-essential/plugin-development/plugin-architecture" },
      { label: "C++20 API Reference", to: "/docs/xinfer-essential/api-reference" },
    ],
  },
  {
    id: "sentinel-nexus-docs",
    title: "Sentinel Nexus Daemon Docs",
    color: "#FFB800",
    desc: "Fleet command plane manual — full documentation: defense bus, OTA, XAI, CLI.",
    links: [
      { label: "Full Documentation (99 guides)", to: "/docs/sentinel-nexus" },
      { label: "Collective Defense Bus", to: "/docs/sentinel-nexus/collective-defense" },
      { label: "Canary OTA & RollbackGuard", to: "/docs/sentinel-nexus/canary-ota-rollout" },
      { label: "nexus-ctl CLI", to: "/docs/sentinel-nexus/operations-cli-nexus-ctl" },
      { label: "REST API Reference", to: "/docs/sentinel-nexus/rest-api-reference" },
    ],
  },
  {
    id: "sentinel-lab",
    title: "Sentinel-Lab (sentinel_lab)",
    color: "#00E5FF",
    desc: "Open research testbed — full documentation: SLAB, dual-silicon, harness, preprint.",
    links: [
      { label: "Full Documentation (67 guides)", to: "/docs/sentinel-lab" },
      { label: "SLAB Protocol", to: "/docs/sentinel-lab/slab-protocol" },
      { label: "10-Minute Harness", to: "/docs/sentinel-lab/evaluation-harness" },
      { label: "Thesis Guide", to: "/docs/sentinel-lab/university-curriculum" },
      { label: "Preprint & Zenodo", to: "/docs/sentinel-lab/preprint-and-open-science" },
    ],
  },
  {
    id: "sentinel-matrix",
    title: "Sentinel-Matrix (cyber-range)",
    color: "#FFB800",
    desc: "VMware digital twin mesh — full documentation: OmniFlow, PCAP arsenal, adversary, runbook.",
    links: [
      { label: "Full Documentation (91 guides)", to: "/docs/sentinel-matrix" },
      { label: "OmniFlow Engine", to: "/docs/sentinel-matrix/omniflow-traffic-engine" },
      { label: "Live Adversary Node", to: "/docs/sentinel-matrix/live-adversary-node" },
      { label: "Makefile Runbook", to: "/docs/sentinel-matrix/operations-and-makefile" },
      { label: "Chaos Engineering", to: "/docs/sentinel-matrix/chaos-and-resilience" },
    ],
  },
  {
    id: "sentinel-stack",
    title: "Sentinel-Stack (install.sh)",
    color: "#00E5FF",
    desc: "1-click 6-tier installer — full documentation: phases, DAG builds, daemons, verification.",
    links: [
      { label: "Full Documentation (81 guides)", to: "/docs/sentinel-stack" },
      { label: "6-Phase Pipeline", to: "/docs/sentinel-stack/installation-phases" },
      { label: "Compilation DAG", to: "/docs/sentinel-stack/compilation-dag-tiers" },
      { label: "Matrix Bridge", to: "/docs/sentinel-stack/bridge-to-sentinel-matrix" },
      { label: "Makefile Runbook", to: "/docs/sentinel-stack/operations-and-makefile" },
    ],
  },
];

export default function DocsPage() {
  return (
    <>
      <section id="docs-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Documentation" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Technical Reference <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Documentation & <span className="text-cyan">Integration Guides.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Eight complete product manuals — one per project. Pick your tier below and start reading.
            Air-gapped friendly — no external CDN, no cloud tenancy, no tracking.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#docs-index" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Browse The 8 Manuals ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Talk To An Engineer ]
            </Link>
          </div>
        </div>
      </section>

      <section id="docs-index" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {DOC_SECTIONS.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6">
              <h2 className="font-display text-[16px] font-bold" style={{ color: section.color }}>{section.title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{section.desc}</p>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.to} className="link-underline text-[12.5px] text-muted transition-colors hover:text-cyan">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
