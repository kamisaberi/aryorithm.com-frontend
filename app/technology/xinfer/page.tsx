import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import CodeViewer from "@/components/ui/CodeViewer";
import { StatStrip } from "@/components/ui/StatusBadge";
import XinferSections from "@/components/simulations/XinferSections";
import { CPP_SNIPPET } from "@/data/xinfer";

export const metadata: Metadata = {
  title: "xInfer Engine — Tier 1 Silicon Runtime | Aryorithm",
  description: "Universal zero-copy AI runtime across 15 heterogeneous silicon architectures. C++20, zero managed dependencies.",
};

export default function XinferPage() {
  return (
    <>
      <section id="xinfer-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Technology" }, { label: "xInfer Engine" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Tier 1 Silicon Runtime <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            xInfer Engine (libxinfer.so): Universal Zero-Copy AI Runtime.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            High-performance C++20 model execution across 15 heterogeneous silicon architectures with zero managed
            runtime dependencies, zero Python execution overhead, and zero-copy memory transfers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/xinfer#silicon-matrix" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Explore 15 Silicon Targets ]
            </Link>
            <Link href="/technology/xinfer#cpp-api" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read C++20 API ]
            </Link>
          </div>
          <div className="mt-8 grid max-w-3xl gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Runtime Dependency Audit</p>
              <ul className="mt-3 space-y-1.5 font-mono text-[11.5px]">
                {[["Python interpreter", false], ["JVM / managed runtime", false], ["Docker daemon", false], ["External CDN fetch", false], ["CUDA / vendor driver only", true], ["Static C++20 binary", true]].map(([l, ok]) => (
                  <li key={l as string} className={ok ? "text-kernel" : "text-threat"}>
                    {ok ? "✓" : "✕"} {l as string} {ok ? "(linked)" : "(absent)"}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Backend Probe</p>
              <pre className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
                $ xinfer-cli --probe{"\n"}
                <span className="text-kernel">openvino  READY  (oneDNN 3.5)</span>{"\n"}
                <span className="text-kernel">tensorrt  READY  (CUDA 12.4)</span>{"\n"}
                rknn      absent (no /dev/rknpu){"\n"}
                hailort   absent (no PCIe device)
              </pre>
            </div>
          </div>
          <div className="mt-4 max-w-3xl">
            <StatStrip items={[["Binary", "4.2 MB"], ["Targets", "15", "#00E5FF"], ["Copies", "0", "#00FFA3"]]} />
          </div>
        </div>
      </section>

      <XinferSections />

      <section id="cpp-api" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// C++20 Zero-Copy API"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Five Calls. Zero Copies.</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <CodeViewer code={CPP_SNIPPET} lang="cpp" filename="examples/zero_copy_openvino.cpp — g++ -std=c++20 -lxinfer" note="Compiles to a 4.2 MB statically linked binary. Zero managed dependencies at runtime." />
          <div className="space-y-4">
            <div className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">Why Zero-Copy Decides The SLA</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12.5px] text-muted">
                <li>A single staging memcpy costs ~0.9 µs — the entire drop budget.</li>
                <li>One GC pause (40 ms) is 50,000× the 0.84 µs SLA.</li>
                <li>Unified memory means CPU, GPU and NPU address the identical physical page.</li>
              </ul>
            </div>
            <Link href="/technology/blackbox" className="block rounded-md border border-cyan/50 px-5 py-3.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10">
              [ Next Tier: Blackbox Core — where the verdict becomes an XDP_DROP → ]
            </Link>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
