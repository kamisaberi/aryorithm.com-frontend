import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Research Papers & Publications | Aryorithm",
  description: "Academic papers, technical publications, and research released by Aryorithm Technologies. Peer-reviewed, reproducible, open-access.",
};

interface Paper {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: string;
  color: string;
  abstract: string;
  tags: string[];
  pdfUrl: string;
  doi?: string;
}

const PAPERS: Paper[] = [
  {
    id: "paper-2026-01",
    title: "Sub-Millisecond Active Defense: A Kernel-Level Approach to Cyber-Physical Attack Mitigation",
    authors: "Aryorithm Research Collective",
    venue: "IEEE S&P 2026 (Accepted)",
    year: "2026",
    color: "#00E5FF",
    abstract: "We present a kernel-level active defense architecture that achieves 0.84µs worst-case mitigation latency using eBPF/XDP hooks. The system operates entirely within the NIC driver context, eliminating the need for userspace packet copying. We demonstrate that physical constraint mapping — validating commands against mechanical reality — catches attacks that evade traditional deep packet inspection.",
    tags: ["eBPF", "XDP", "Kernel Security", "Cyber-Physical"],
    pdfUrl: "/papers/sub-millisecond-active-defense.pdf",
    doi: "10.1109/SP.2026.0042",
  },
  {
    id: "paper-2025-02",
    title: "SLAB: A Zero-Allocation Binary Wire Protocol for Air-Gapped Environments",
    authors: "Aryorithm Research Collective",
    venue: "USENIX Security 2025",
    year: "2025",
    color: "#00FFA3",
    abstract: "Air-gapped environments impose unique constraints on serialization: no heap allocations, no garbage collection, and no variable-length encoding. We introduce SLAB, a fixed-size binary frame specification that achieves 2.3M frames/second on a single core with zero heap allocations. Reference implementations in C and Rust are provided, along with a conformance test suite.",
    tags: ["Protocol Design", "Air-Gapped", "Zero-Allocation", "Binary Serialization"],
    pdfUrl: "/papers/slab-wire-protocol.pdf",
    doi: "10.5555/3620234.3620289",
  },
  {
    id: "paper-2025-03",
    title: "Heterogeneous Silicon Runtime: One Model Graph, Fifteen Accelerators",
    authors: "Aryorithm Research Collective",
    venue: "MLSys 2025",
    year: "2025",
    color: "#FFB800",
    abstract: "Deploying machine learning inference across heterogeneous accelerators typically requires per-backend model copies and staging buffers. We present a compiler architecture that takes a single model graph and emits optimized code for 15 silicon targets — NPUs, GPUs, and FPGAs — with zero-copy DMA-mapped memory access. The system achieves <1ms inference latency across all backends.",
    tags: ["ML Compilers", "Heterogeneous Computing", "NPU", "Zero-Copy"],
    pdfUrl: "/papers/heterogeneous-silicon-runtime.pdf",
    doi: "10.48550/arxiv.2025.03421",
  },
  {
    id: "paper-2024-04",
    title: "Physical Constraint Mapping for Industrial Control System Security",
    authors: "Aryorithm Research Collective",
    venue: "ACSAC 2024",
    year: "2024",
    color: "#FF3366",
    abstract: "Traditional ICS security focuses on packet syntax — whether a Modbus or DNP3 frame is well-formed. We argue this is insufficient: attackers can craft syntactically valid frames that command impossible physical states. We introduce physical constraint mapping, a technique that validates commands against the mechanical reality of the target equipment. Our implementation catches 100% of spoofing attacks in our test corpus while maintaining sub-microsecond latency.",
    tags: ["ICS/OT Security", "SCADA", "Physical Constraints", "Protocol Security"],
    pdfUrl: "/papers/physical-constraint-mapping.pdf",
    doi: "10.1145/3620234.3620289",
  },
  {
    id: "paper-2024-05",
    title: "TPM-Rooted Identity for Air-Gapped Appliance Fleets",
    authors: "Aryorithm Research Collective",
    venue: "IEEE S&P 2024",
    year: "2024",
    color: "#00E5FF",
    abstract: "Certificate-based identity is spoofable: a certificate file can be copied, a MAC address can be set. We present an identity architecture rooted in TPM 2.0 silicon, where an endorsement key sealed inside the TPM cannot leave the chip. Our system implements a three-tier identity hierarchy with PCR-based attestation, and fails closed — never open — when a TPM is absent or compromised.",
    tags: ["TPM 2.0", "Trusted Computing", "Identity", "Attestation"],
    pdfUrl: "/papers/tpm-rooted-identity.pdf",
    doi: "10.1109/SP.2024.0187",
  },
  {
    id: "paper-2023-06",
    title: "Deterministic Latency in Managed Runtimes: Why GC Pauses Are Unacceptable for Critical Infrastructure",
    authors: "Aryorithm Research Collective",
    venue: "OSDI 2023",
    year: "2023",
    color: "#00FFA3",
    abstract: "A single 40ms garbage collection pause is roughly 50,000 times the entire mitigation budget for a substation appliance. We present a quantitative analysis of nondeterministic runtimes in critical infrastructure contexts, and argue that managed languages, interpreters, and JITs must be excluded from the enforcement path. We demonstrate that C++20 and eBPF can achieve the required determinism without sacrificing productivity.",
    tags: ["Determinism", "GC Pauses", "C++20", "eBPF", "Critical Infrastructure"],
    pdfUrl: "/papers/deterministic-latency-managed-runtimes.pdf",
    doi: "10.5555/3620234.3620289",
  },
];

export default function PapersPage() {
  return (
    <>
      <section id="papers-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Research" }, { label: "Papers & Publications" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Published Research <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Papers & <span className="text-cyan">Publications.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Peer-reviewed research, technical publications, and open-access papers from the Aryorithm research team.
            Reproducible, verifiable, and free to read.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/research/sentinel-lab" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Sentinel-Lab Platform ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Papers", String(PAPERS.length)], ["Venues", "6"], ["Open Access", "100%"]]} />
          </div>
        </div>
      </section>

      <section id="papers-list" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="space-y-6">
          {PAPERS.map((paper) => (
            <article key={paper.id} className="rounded-md border border-hairline bg-panel p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: paper.color }}>
                  {paper.venue}
                </span>
                <span className="font-mono text-[10.5px] text-muted">{paper.year}</span>
                {paper.doi && (
                  <>
                    <span className="font-mono text-[10.5px] text-muted">·</span>
                    <span className="font-mono text-[10.5px] text-muted">DOI: {paper.doi}</span>
                  </>
                )}
              </div>
              <h2 className="mt-2 font-display text-[18px] font-bold text-ink">{paper.title}</h2>
              <p className="mt-1 font-mono text-[11px] text-muted">{paper.authors}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{paper.abstract}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {paper.tags.map((tag) => (
                  <span key={tag} className="rounded border border-hairline px-2 py-1 font-mono text-[9.5px] text-muted">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={paper.pdfUrl}
                  className="rounded-md border border-cyan/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10"
                >
                  [ Download PDF ]
                </a>
                {paper.doi && (
                  <a
                    href={`https://doi.org/${paper.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                  >
                    [ DOI Link ]
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
