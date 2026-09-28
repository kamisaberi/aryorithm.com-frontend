import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Sentinel-Lab — Open Research & Benchmark Platform | Aryorithm",
  description: "Tier 5 open research platform for reproducible evaluation of cyber-physical defense systems. Apache-2.0 licensed, free to use.",
};

export default function SentinelLabPage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Sentinel-Lab" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Tier 5 Open Research <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Sentinel-Lab
          </h1>
          <p className="mt-2 font-mono text-[13px] text-cyan">Open Research & Benchmark Platform</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The peer-reviewed academic foundation of the Aryorithm ecosystem. Dedicated to reproducible evaluation
            across Intel OpenVINO and NVIDIA TensorRT architectures. Apache-2.0, $0.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/research/sentinel-lab" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Platform ]
            </Link>
            <Link href="/papers" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Research Papers ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v2.4.0"], ["License", "Apache-2.0"], ["Cost", "$0"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What Is Sentinel-Lab?</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Sentinel-Lab is the open research platform that provides the academic foundation for the Aryorithm
            ecosystem. It is a Tier 5 testbed for reproducible evaluation of cyber-physical defense systems, free for
            anyone to use.
          </p>
          <p>
            The platform includes a full evaluation harness, public dataset replay (CIC-IDS-2017), deterministic seed
            and fixed toolchain, and published p99 latency — not mean latency. Both Intel OpenVINO and NVIDIA TensorRT
            are evaluated under the same harness.
          </p>
          <p>
            Sentinel-Lab is where we publish our negative results, our benchmark methodology, and our conformance test
            vectors. It is where the community can verify our claims, reproduce our results, and build on our work.
          </p>
        </div>
      </section>

      <section id="reproducibility" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Reproducibility Contract"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Six Commitments.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Open-Source Core", desc: "All core libraries are Apache-2.0 licensed. No proprietary dependencies, no hidden components." },
            { title: "Public Dataset Replay", desc: "CIC-IDS-2017 and other public datasets. No private data, no proprietary captures." },
            { title: "Deterministic Seed", desc: "Fixed random seed and fixed toolchain. Every run produces identical results." },
            { title: "Published p99", desc: "We publish p99 latency, not mean. Averages hide the tail that matters." },
            { title: "Both Accelerators", desc: "Intel OpenVINO and NVIDIA TensorRT evaluated under the same harness. No cherry-picking." },
            { title: "Negative Results", desc: "We publish what doesn't work, not just what does. Science requires both." },
          ].map((item) => (
            <div key={item.title} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[14px] font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="preprint" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Academic Preprint"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Sub-Millisecond Active Defense.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The Sentinel-Lab preprint, "Sub-Millisecond Active Defense: A Kernel-Level Approach to Cyber-Physical
            Attack Mitigation," has been accepted to IEEE S&P 2026. It presents the full architecture, evaluation
            methodology, and results.
          </p>
          <p>
            The paper demonstrates that physical constraint mapping — validating commands against mechanical reality —
            catches attacks that evade traditional deep packet inspection. It also presents the 0.84µs worst-case
            mitigation latency, verified across kernel versions 5.15 through 6.11.
          </p>
          <p>
            The preprint is available as a free PDF download. The full evaluation harness, dataset, and results are
            available in the Sentinel-Lab repository.
          </p>
        </div>
      </section>

      <section id="slab" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// SLAB Protocol"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Zero-Allocation Wire Format.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Sentinel-Lab v2.4 introduced the SLAB (Synchronous Lightweight Air-gapped Binary) wire protocol — a
            zero-allocation binary frame specification for environments where every allocation is a liability.
          </p>
          <p>
            The release includes a full benchmark harness, reference implementations in C and Rust, and conformance
            test vectors. SLAB achieves 2.3M frames/second on a single core, compared to 340K for Protobuf and 890K for
            FlatBuffers on the same hardware.
          </p>
          <p>
            The SLAB specification is a single 40-page document. No external dependencies, no code generation, no
            schema registry. It is designed for air-gapped environments where traditional serialization frameworks
            introduce unacceptable overhead.
          </p>
        </div>
      </section>

      <section id="harness" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Evaluation Harness"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Run The Benchmarks.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The Sentinel-Lab evaluation harness is a complete benchmarking suite for cyber-physical defense systems.
            It includes dataset replay, latency measurement, recall evaluation, and report generation.
          </p>
          <p>
            The harness is designed to be reproducible: fixed seed, fixed toolchain, fixed dataset. Every run produces
            identical results. This is essential for academic credibility and for comparing results across different
            systems and configurations.
          </p>
          <p>
            The harness evaluates both Intel OpenVINO (CPU/NPU) and NVIDIA TensorRT (GPU) architectures under the same
            conditions. Results are published as p99 latency, not mean, because the tail is what matters for critical
            infrastructure.
          </p>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
