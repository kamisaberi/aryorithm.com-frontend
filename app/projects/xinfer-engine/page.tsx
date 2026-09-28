import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "xInfer Engine — Heterogeneous Silicon Inference Runtime | Aryorithm",
  description: "libxinfer.so — one model graph, fifteen silicon backends, zero-copy DMA-mapped memory. Sub-millisecond inference across NPU, GPU, and FPGA accelerators.",
};

const BACKENDS = [
  { name: "Intel OpenVINO", type: "CPU / NPU / GPU", status: "GA" },
  { name: "NVIDIA TensorRT", type: "GPU", status: "GA" },
  { name: "ARM Compute Library", type: "CPU / GPU", status: "GA" },
  { name: "Qualcomm QNN", type: "NPU / GPU", status: "GA" },
  { name: "Apple Core ML", type: "Neural Engine", status: "GA" },
  { name: "Google TFLite", type: "CPU / GPU / NPU", status: "GA" },
  { name: "Xilinx Vitis AI", type: "FPGA", status: "GA" },
  { name: "Intel oneAPI", type: "CPU / GPU / FPGA", status: "GA" },
  { name: "AMD ROCm", type: "GPU", status: "GA" },
  { name: "Huawei HiAI", type: "NPU", status: "GA" },
  { name: "Samsung NPU SDK", type: "NPU", status: "GA" },
  { name: "Rockchip RKNN", type: "NPU", status: "GA" },
  { name: "Ambarella CVflow", type: "NPU", status: "GA" },
  { name: "Microchip MPLAB", type: "NPU", status: "GA" },
  { name: "RISC-V Vector", type: "CPU", status: "Beta" },
];

export default function XInferEnginePage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "xInfer Engine" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Tier 1 Silicon Runtime <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            xInfer Engine
          </h1>
          <p className="mt-2 font-mono text-[13px] text-kernel">Heterogeneous Silicon Inference Runtime</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            libxinfer.so — one model graph, fifteen silicon backends, zero-copy DMA-mapped memory. Sub-millisecond
            inference across NPU, GPU, and FPGA accelerators without a staging copy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/xinfer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Technology ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v4.2.0"], ["Backends", "15"], ["Latency", "<1ms"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">One Model Graph. Fifteen Backends.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Deploying machine learning inference across heterogeneous accelerators typically requires per-backend model
            copies, staging buffers, and format conversions. xInfer Engine eliminates all of that. A single model
            graph is compiled once and executed natively on fifteen different silicon targets.
          </p>
          <p>
            The key innovation is the zero-copy DMA-mapped memory architecture. Each backend addresses the appliance's
            own DMA-mapped memory directly — no staging copies, no intermediate buffers, no format conversions. This
            is what enables sub-millisecond inference latency across all backends.
          </p>
          <p>
            The compiler pipeline uses MLIR-based lowering to take a single model graph and emit optimized code for
            each target. Operator fusion, tensor arena layout, and instruction scheduling are all handled
            automatically, with hand-tuning available for performance-critical paths.
          </p>
        </div>
      </section>

      <section id="backends" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Silicon Matrix"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">15 Silicon Backends.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BACKENDS.map((b) => (
            <div key={b.name} className="flex items-center justify-between rounded-md border border-hairline bg-panel p-4">
              <div>
                <h3 className="font-display text-[13px] font-bold text-ink">{b.name}</h3>
                <p className="font-mono text-[10px] text-muted">{b.type}</p>
              </div>
              <span className={`rounded border px-2 py-0.5 font-mono text-[9px] ${b.status === "GA" ? "border-kernel/50 text-kernel" : "border-telemetry/50 text-telemetry"}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="quantization" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Quantization"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">int8 At Fixed Recall.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The int8 calibration pipeline preserves recall across all supported models. Unlike naive quantization
            that degrades accuracy, our fixed-recall calibration method ensures that the quantized model produces
            identical outputs to the fp32 original on the calibration dataset.
          </p>
          <p>
            This is achieved through a combination of per-channel scaling, bias correction, and outlier-aware
            calibration. The calibration process runs entirely on the appliance — no cloud connectivity, no data
            egress, no external model zoo.
          </p>
          <p>
            The result: int8 models that are 4x smaller and 2-3x faster than their fp32 counterparts, with zero
            measurable recall degradation. This is what makes sub-millisecond inference possible on edge appliances
            with limited memory and compute budgets.
          </p>
        </div>
      </section>

      <section id="compiler" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Compiler Pipeline"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">MLIR-Based Lowering.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The xInfer compiler pipeline takes a single model graph and emits optimized code for each of the 15
            silicon backends. The pipeline is built on MLIR (Multi-Level Intermediate Representation), which allows
            us to define backend-specific lowering passes at the right abstraction level.
          </p>
          <p>
            Key compiler passes include operator fusion (combining consecutive operations into single kernels),
            tensor arena layout (optimizing memory allocation for DMA-mapped access), and instruction scheduling
            (reordering operations to maximize pipeline utilization).
          </p>
          <p>
            The compiler is designed to be extensible. New backends can be added by implementing a backend interface
            — a set of code generation passes and runtime hooks. The existing 15 backends serve as reference
            implementations for new backend development.
          </p>
        </div>
      </section>

      <section id="performance" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Performance"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Sub-Millisecond Inference.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { metric: "<1ms", label: "Inference Latency", desc: "Worst-case across all 15 backends" },
            { metric: "15", label: "Silicon Targets", desc: "NPU, GPU, FPGA support" },
            { metric: "0", label: "Staging Copies", desc: "Zero-copy DMA-mapped memory" },
            { metric: "4x", label: "Size Reduction", desc: "int8 vs fp32 model size" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-hairline bg-panel p-5 text-center">
              <p className="font-display text-[28px] font-bold text-cyan">{s.metric}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">{s.label}</p>
              <p className="mt-1 text-[11px] text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
