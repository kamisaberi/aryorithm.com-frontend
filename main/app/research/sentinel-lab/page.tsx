import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import { HarnessRunner, PreprintBlock, SlabExplorer } from "@/components/simulations/LabSims";

export const metadata: Metadata = {
  title: "Sentinel-Lab — Open Research Platform | Aryorithm",
  description: "Peer-reviewed academic foundation: reproducible evaluation across Intel OpenVINO and NVIDIA TensorRT. Apache-2.0, $0.",
};

export default function LabPage() {
  return (
    <>
      <section id="lab-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Research" }, { label: "Sentinel-Lab" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Tier 5 Academic Testbed <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Sentinel-Lab: Open Research &amp; Benchmark Platform.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The peer-reviewed academic foundation of the Aryorithm ecosystem. Dedicated to reproducible evaluation across
            Intel OpenVINO (CPU/NPU) and NVIDIA TensorRT (GPU) architectures.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/research/sentinel-lab#preprint" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Read The Preprint ]
            </Link>
            <Link href="/research/sentinel-lab#eval-harness" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Run The Evaluation Harness ]
            </Link>
          </div>
          <div className="mt-8 max-w-3xl rounded-md border border-hairline bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Reproducibility Contract</p>
            <ul className="mt-3 space-y-1.5 font-mono text-[11.5px] text-muted">
              {["Open-source core libraries", "Public dataset replay (CIC-IDS-2017)", "Deterministic seed & fixed toolchain", "Published p99, not mean latency", "Both accelerators, same harness", "Negative results published"].map((l) => (
                <li key={l} className="text-kernel">✓ <span className="text-muted">{l}</span></li>
              ))}
            </ul>
            <div className="mt-4"><StatStrip items={[["Licence", "Apache-2.0"], ["Backends", "2 evaluated"], ["Cost", "$0", "#00FFA3"]]} /></div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-8 px-5 py-12 lg:px-8">
        <PreprintBlock />
        <SlabExplorer />
        <HarnessRunner />
        <div className="grid gap-3 rounded-md border border-hairline bg-panel p-5 font-mono text-[11px] sm:grid-cols-3">
          {[["Corpus", "CIC-IDS-2017 · PortScan · 77 MB · 286,467 flows"], ["TensorRT", "12.4µs · L4 · CUDA 12.4"], ["OpenVINO", "18.2µs · Xeon D · AVX-512"]].map(([k, v]) => (
            <div key={k} className="rounded border border-hairline bg-void px-3 py-2.5"><p className="text-muted">{k}</p><p className="mt-1 text-ink">{v}</p></div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-muted">
          Both backends clear the 1.0 ms SLA by more than 31×. The GPU wins on latency; the CPU/NPU path wins on
          deployability in a fanless DIN-rail enclosure.
        </p>
      </div>
      <ClosingCTA />
    </>
  );
}
