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
    id: "getting-started",
    title: "Getting Started",
    color: "#00E5FF",
    desc: "Deploy your first Blackbox Sentinel appliance in an air-gapped segment.",
    links: [
      { label: "Quick Start Guide", to: "/docs#getting-started" },
      { label: "Hardware Requirements", to: "/docs#getting-started" },
      { label: "Air-Gapped Installation", to: "/docs#getting-started" },
      { label: "First Appliance Boot", to: "/docs#getting-started" },
    ],
  },
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
    id: "blackbox-core",
    title: "Blackbox Core (eBPF/XDP)",
    color: "#00E5FF",
    desc: "Kernel-level fast-path inspection, mitigation, and the AF_XDP datapath.",
    links: [
      { label: "Fast-Path Architecture", to: "/technology/blackbox#fast-path" },
      { label: "eBPF Program Reference", to: "/docs#blackbox-core" },
      { label: "AF_XDP UMEM Configuration", to: "/docs#blackbox-core" },
      { label: "Verifier Compatibility Matrix", to: "/docs#blackbox-core" },
      { label: "XDP Hook Reference", to: "/docs#blackbox-core" },
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
    id: "sentinel-nexus",
    title: "Sentinel Nexus (Orchestration)",
    color: "#FFB800",
    desc: "The Tier 6 collective defense command plane — fleet management and attestation.",
    links: [
      { label: "Nexus Architecture", to: "/platform/nexus" },
      { label: "OTA Canary Pipeline", to: "/platform/nexus#nexus-capabilities" },
      { label: "Fleet Health Dashboard", to: "/platform/nexus#nexus-command-center" },
      { label: "Attestation Validator", to: "/platform/nexus#nexus-capabilities" },
    ],
  },
  {
    id: "protocol-engineering",
    title: "Protocol Engineering",
    color: "#FFB800",
    desc: "Industrial protocol dissectors, physical constraint maps, and SCADA integration.",
    links: [
      { label: "30 Industrial Plugins", to: "/products/sentinel#plugin-showcase" },
      { label: "Physical Constraint Maps", to: "/docs#protocol-engineering" },
      { label: "Modbus / DNP3 / IEC 61850", to: "/docs#protocol-engineering" },
      { label: "S7comm / Profinet Dissectors", to: "/docs#protocol-engineering" },
    ],
  },
  {
    id: "slab-protocol",
    title: "SLAB Wire Protocol",
    color: "#FF3366",
    desc: "The zero-allocation binary frame specification for air-gapped environments.",
    links: [
      { label: "SLAB Specification", to: "/research/sentinel-lab#slab-protocol" },
      { label: "Reference Implementation (C)", to: "/docs#slab-protocol" },
      { label: "Reference Implementation (Rust)", to: "/docs#slab-protocol" },
      { label: "Conformance Test Vectors", to: "/docs#slab-protocol" },
    ],
  },
  {
    id: "api-reference",
    title: "API Reference",
    color: "#00E5FF",
    desc: "REST and gRPC APIs for appliance management, fleet orchestration, and evidence carving.",
    links: [
      { label: "Appliance Management API", to: "/docs#api-reference" },
      { label: "Fleet Orchestration API", to: "/docs#api-reference" },
      { label: "Evidence Carving API", to: "/docs#api-reference" },
      { label: "Webhook & Alerting", to: "/docs#api-reference" },
    ],
  },
  {
    id: "security",
    title: "Security & Compliance",
    color: "#FF3366",
    desc: "Attestation, SBOM, regulatory crosswalks, and responsible disclosure.",
    links: [
      { label: "TPM 2.0 Attestation Profile", to: "/platform/nexus#nexus-capabilities" },
      { label: "SBOM Repository", to: "/trust#sbom-repository" },
      { label: "Regulatory Crosswalks", to: "/trust#regulatory-crosswalks" },
      { label: "Responsible Disclosure (PGP)", to: "/contact#pgp-panel" },
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
            Everything you need to deploy, configure, and integrate the Aryorithm sovereign defense stack. Air-gapped
            friendly — no external CDN, no cloud tenancy, no tracking.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#getting-started" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Quick Start ]
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
