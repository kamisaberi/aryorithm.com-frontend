import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";
import XinferSections from "@/components/simulations/XinferSections";

export const metadata: Metadata = {
  title: "xInfer Essential (libxinfer.so) — Zero-Copy AI Runtime | Aryorithm",
  description:
    "xinfer-essential (libxinfer.so): open-core C++20 zero-copy neural inference across 15 silicon targets. 11.8µs latency, 1.25M EPS, zero managed dependencies.",
};

const GITHUB_URL = "https://github.com/kamisaberi/xinfer";

const KPI_STRIP = [
  { metric: "11.8 µs", label: "Mean NetFlow Infer", desc: "Latency on Core NPU" },
  { metric: "1,250,000 EPS", label: "Sustained Inference", desc: "Throughput per node" },
  { metric: "0 Copies", label: "Direct DMA-BUF", desc: "Host-pinned pointers" },
  { metric: "15 Targets", label: "Heterogeneous NPUs", desc: "GPUs, DSPs & FPGAs" },
];

const FAILURE_MODES = [
  {
    n: "01",
    title: "Unpredictable Latency Jitter",
    sub: "Garbage collection & GIL",
    body: "Python-based inference engines and JVM wrappers introduce non-deterministic garbage-collection pauses ranging from 15ms to over 250ms. In a physical system where an overpressure valve must be actuated in under 3ms, non-deterministic execution causes mechanical failure.",
  },
  {
    n: "02",
    title: "Memory Copy Bottlenecks",
    sub: "Driver → socket → userspace → framework → device",
    body: "Standard pipelines copy data repeatedly: network driver, OS socket buffer, userspace application, framework tensor, device memory. Every copy consumes memory-bus bandwidth and degrades CPU cache locality at line rate.",
  },
  {
    n: "03",
    title: "Bloated Images & Dependency Fragility",
    sub: "Gigabytes of CUDA, Python, conflicting .so files",
    body: "Deploying an edge model with standard toolchains drags in gigabytes of CUDA toolkits, interpreters and conflicting dynamic libraries. libxinfer.so compiles to a single shared object under 15 MB — ideal for bare metal, embedded Yocto Linux and air-gapped microcontrollers.",
  },
];

const TENSOR_SNIPPET = `// Map a raw hardware descriptor directly into an xInfer tensor (zero-copy).
#include <xinfer/xinfer.hpp>

// Pre-allocated DMA-BUF region owned by the driver — xinfer never reallocates.
void* raw_dma_pointer = driver_claim_dma_buf();

xinfer::Tensor input_tensor(
    {1, 32},                           // Batch 1, 32-dim NetFlow vector
    xinfer::DataType::FLOAT32,         // Element type
    raw_dma_pointer,                   // Backing physical address
    xinfer::MemoryType::DMA_BUF        // Memory domain
);

// Silicon reads this pointer in place; logits land straight in the
// kernel-space drop map. Zero heap allocations, zero context switches.`;

const CMAKE_SNIPPET = `cmake_minimum_required(VERSION 3.20)
project(my_edge_detector LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find system-installed xInfer libraries and headers
find_library(XINFER_LIB xinfer REQUIRED PATHS /usr/local/lib)
find_path(XINFER_INCLUDE_DIR xinfer/xinfer.hpp PATHS /usr/local/include)

add_executable(my_edge_detector src/main.cpp)
target_include_directories(my_edge_detector PRIVATE \${XINFER_INCLUDE_DIR})
target_link_libraries(my_edge_detector PRIVATE \${XINFER_LIB} pthread)`;

const PIPELINE_SNIPPET = `#include <iostream>
#include <vector>
#include <chrono>
#include <xinfer/xinfer.hpp>

int main() {
    std::cout << "[*] Initializing xInfer Universal AI Runtime..." << std::endl;

    // 1. Resolve and cache the model via ModelHub (verified by SHA-256).
    std::string model_path = xinfer::ModelHub::instance().resolve(
        "models/network_threat_v1.onnx",
        "https://hub.aryorithm.com/models/network_threat_v1.onnx",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );

    // 2. Instantiate the native silicon backend.
    auto engine = xinfer::InferenceEngine::create(
        xinfer::BackendType::INTEL_OPENVINO);

    xinfer::EngineConfig config{
        .device_target = "NPU",
        .precision = xinfer::Precision::FP16,
        .enable_zero_copy = true,
        .worker_threads = 4
    };

    if (!engine->load_model(model_path, config)) {
        std::cerr << "[-] Error loading model into target silicon." << std::endl;
        return 1;
    }

    // 3. Pre-allocate the zero-copy input tensor (32-dim NetFlow vector).
    std::vector<float> input_features(32, 0.123f);
    xinfer::Tensor input_tensor({1, 32}, xinfer::DataType::FLOAT32,
                                input_features.data());

    // 4. Execute the microsecond forward pass.
    auto t0 = std::chrono::high_resolution_clock::now();
    xinfer::Tensor output = engine->infer(input_tensor);
    auto t1 = std::chrono::high_resolution_clock::now();
    double us = std::chrono::duration_cast<std::chrono::nanoseconds>(
        t1 - t0).count() / 1000.0;

    // 5. Extract the classification score and enforce the verdict.
    float threat_score = output.data<float>()[0];
    std::cout << "[+] Latency: " << us << " us"
              << " | Threat: " << (threat_score * 100.0f) << "%"
              << " | Action: " << (threat_score > 0.85f ? "KERNEL_DROP" : "PASS")
              << std::endl;
    return 0;
}`;

const BENCHMARKS = [
  { engine: "PyTorch LibTorch (C++ Frontend)", lang: "C++", mem: "1,420 MB", p50: "84.2 µs", p99: "310 µs", eps: "82,000" },
  { engine: "ONNX Runtime (Python Binding)", lang: "Python/C++", mem: "890 MB", p50: "62.1 µs", p99: "450 µs", eps: "120,000" },
  { engine: "Native Intel OpenVINO SDK", lang: "C++", mem: "340 MB", p50: "18.2 µs", p99: "42 µs", eps: "380,000" },
  { engine: "Native NVIDIA TensorRT SDK", lang: "C++", mem: "480 MB", p50: "14.5 µs", p99: "28 µs", eps: "450,000" },
  { engine: "xInfer Engine (libxinfer.so)", lang: "Native C++20", mem: "18 MB", p50: "11.8 µs", p99: "14 µs", eps: "1,250,000", hot: true },
];

const FINDINGS = [
  { metric: "8.5×", label: "Lower Memory Footprint", desc: "18 MB idle — fits resource-constrained embedded targets" },
  { metric: "14 µs", label: "Deterministic p99", desc: "Flat tail latency under saturation, no interpreter spikes" },
  { metric: "1.25M", label: "Events / Second", desc: "Single node paired with the lock-free SPMC ring buffer" },
];

const VERTICALS = [
  {
    n: "01",
    title: "Electrical Substations",
    sub: "IEC 61850 / SCADA",
    targets: "Rockchip RK3588 (RKNPU2) · Intel Atom OpenVINO",
    workload: "Real-time Modbus FC05 coil validation and directional NetFlow autoencoding.",
    result: "Malicious tripping commands dropped in < 0.84µs before physical breakers disconnect.",
  },
  {
    n: "02",
    title: "Maritime & Drone Avionics",
    sub: "MAVLink / GPS",
    targets: "Hailo-8 M.2 · NVIDIA Jetson Orin Nano",
    workload: "Sensor-spoofing detection and visual GPS-denied obstacle navigation (YOLOv8 NMS).",
    result: "Zero cloud dependence — operates under strict 15-watt power envelopes.",
  },
  {
    n: "03",
    title: "Healthcare Radiology Enclaves",
    sub: "DICOM PACS / HL7",
    targets: "Intel Core Ultra NPU · NVIDIA RTX 4000 Ada",
    workload: "Deep packet inspection of medical imaging streams and exfiltration detection.",
    result: "Eliminates patient-data theft while preserving uncompressed high-resolution transfers.",
  },
  {
    n: "04",
    title: "Air-Gapped Defense Perimeters",
    sub: "CMMC 2.0 Level 2",
    targets: "AMD Vitis AI (Xilinx FPGA) · Qualcomm QNN",
    workload: "Multi-modal threat scoring and hardware side-channel acoustic monitoring.",
    result: "$0 cloud data egress under strict CMMC 2.0 Level 2 controls.",
  },
];

const FAQS = [
  {
    id: "faq-zero-copy",
    badge: "Q.01",
    title: "How does xinfer achieve zero-copy without data corruption?",
    body: "xinfer::Tensor maintains persistent ownership semantics over backing memory descriptors. When mapped to contiguous hardware regions — Linux DMA-BUF handles or pinned CUDA host pointers — addresses pass directly to the accelerator's IOMMU. Strict read/write fencing guarantees concurrent inference threads never overwrite active driver rings.",
  },
  {
    id: "faq-concurrent",
    badge: "Q.02",
    title: "Can xinfer run multiple models concurrently on the same chip?",
    body: "Yes. InferenceEngine instances are lightweight and fully thread-safe. Multiple engines share one physical accelerator — e.g. a primary NetFlow autoencoder beside a secondary vision classifier — over dedicated asynchronous hardware queues with no memory collisions.",
  },
  {
    id: "faq-compile-cache",
    badge: "Q.03",
    title: "Does xinfer recompile models from scratch on every boot?",
    body: "No. Compiled hardware-specific binaries (.engine, .rknn, .hef) are cached on local disk. Once compiled for target silicon, subsequent launches load the pre-compiled binary in under 5 milliseconds.",
  },
  {
    id: "faq-custom-ops",
    badge: "Q.04",
    title: "How are custom or unsupported neural operators handled?",
    body: "Through the IInferencePlugin architecture. A specialized layer — custom geometric transform, non-standard activation — compiles to an isolated C++ .so plugin that xinfer injects into the execution graph at load time.",
  },
];

const PLUGIN_CATEGORIES = [
  { title: "Vision & Video Decoding", items: "NVDEC hardware stream unpacker · YOLOv8 NMS decoder · UltraFace landmark extractor · Thermal IR matrix normalizer" },
  { title: "Audio & Signals", items: "Mel-spectrogram FFT generator for acoustic machine monitoring · RF I/Q constellation mapper" },
  { title: "Security & Cryptography", items: "AES-256-GCM weight decryption on boot · SHA-256 weight integrity validator · Hardware TPM key unwrapper" },
  { title: "Network & Flow Tensors", items: "Directional NetFlow tensor assembler · Modbus APDU payload vectorizer · DICOM PACS image tensor normalizer" },
];

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{kicker}</p>
      <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">{title}</h2>
    </>
  );
}

export default function XInferEssentialPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "xInfer Essential" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 1 Core Runtime", "ISO C++20 Native", "Zero Runtime Dependencies", "15 Silicon Targets"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Hardware-Agnostic Neural Inference at Wire Speed. Zero Copies. Zero Managed Overhead.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">xinfer-essential (libxinfer.so) — Universal ISO C++20 Zero-Copy AI Runtime</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            An open-core, native C++20 execution engine for mission-critical edge appliances, robotics, and
            cyber-physical systems. Bypassing Python interpreters, JVM garbage collection, and dynamic heap
            reallocation, xInfer delivers deterministic sub-microsecond tensor execution across 15 heterogeneous
            hardware architectures via unified memory-mapped DMA buffers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View on GitHub ]
            </a>
            <Link href="#quickstart" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Download C++ SDK / libxinfer.so ]
            </Link>
            <Link href="#silicon-matrix" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore 15 Silicon Targets ]
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KPI_STRIP.map((s) => (
              <div key={s.label} className="rounded-md border border-hairline bg-panel p-5 text-center">
                <p className="font-display text-[28px] font-bold text-cyan">{s.metric}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">{s.label}</p>
                <p className="mt-1 text-[11px] text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. SYSTEMS PROBLEM ──────────────────────────────── */}
      <section id="problem" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SectionHead kicker="// The Systems Problem" title="Why Managed Runtimes Fail at the Physical Edge" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Traditional Runtime Bottleneck</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Ethernet Frame → Kernel Socket (sk_buff) → Userspace Copy → Python Buffer → Numpy Wrapper →
                  Host-to-Device memcpy → Managed Evaluation → <span className="text-threat">GC Pause (15ms–250ms jitter)</span>
                </p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">xInfer Zero-Copy Fast Path</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Sensor Ingress → Physical DMA-BUF / Host-Pinned Descriptor → Direct Pointer Pass into Silicon Core →
                  <span className="text-kernel"> Execution in &lt; 12 µs</span>
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">Zero heap allocations · Zero context switches · Hard real-time</p>
              </div>
            </div>
            <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
              <p>
                Modern deep-learning frameworks are designed for hyperscale cloud data centers, where batch throughput
                matters more than individual packet latency. At the low-power edge, traditional runtimes introduce
                critical failure modes.
              </p>
            </div>
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {FAILURE_MODES.map((f) => (
                <div key={f.n} className="rounded-md border border-hairline bg-panel p-5">
                  <p className="font-mono text-[11px] text-cyan">{f.n}</p>
                  <h3 className="mt-2 font-display text-[15px] font-bold text-ink">{f.title}</h3>
                  <p className="mt-1 font-mono text-[10.5px] text-kernel">{f.sub}</p>
                  <p className="mt-3 text-[12.5px] leading-[1.8] text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Systems Problem", href: "#problem" },
                  { label: "Silicon Matrix", href: "#silicon-matrix" },
                  { label: "Zero-Copy Architecture", href: "#zero-copy" },
                  { label: "Plugin Subsystem", href: "#plugins" },
                  { label: "Model Hub", href: "#modelhub" },
                  { label: "Quickstart", href: "#quickstart" },
                  { label: "Benchmarks", href: "#benchmarks" },
                  { label: "Use Cases", href: "#use-cases" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "xInfer Forge", href: "/projects/xinfer-forge", meta: "v1.0.0" },
                  { label: "Blackbox Core", href: "/projects/blackbox-core", meta: "v2.8.3" },
                ],
              },
            ]}
            cta={{ label: "View on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. SILICON MATRIX (interactive) ─────────────────── */}
      <XinferSections />

      {/* ── 4. ZERO-COPY ARCHITECTURE ───────────────────────── */}
      <section id="zero-copy" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Zero-Copy Architecture" title="Direct Hardware Pointer Mapping" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-md border border-hairline bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Memory Pipeline — DMA-BUF & Host-Pinned</p>
            <div className="mt-4 space-y-0 font-mono text-[11.5px]">
              {[
                ["Physical hardware ingress", "10GbE frame (AF_XDP) · 4K camera (V4L2) · SCADA ADC (SPI/I²C)", "#00E5FF"],
                ["Kernel contiguous allocation", "ion_alloc() / dma_buf_export() / cudaHostRegister()", "#00E5FF"],
                ["xinfer::Tensor binding", "void* physical pointer · shape/stride, no reallocation · driver-owned memory", "#00FFA3"],
                ["Accelerator execution", "NPU via ov::Tensor · GPU via unified address space · RKNPU2 via rknn_inputs_set()", "#00FFA3"],
              ].map(([t, d, c], i, arr) => (
                <div key={t}>
                  <div className="rounded border px-3 py-2.5" style={{ borderColor: `${c}55` }}>
                    <p style={{ color: c }}>{i + 1}. {t}</p>
                    <p className="mt-1 text-muted">{d}</p>
                  </div>
                  {i < arr.length - 1 && <div className="mx-auto h-3 w-px bg-hairline" />}
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] text-muted">Eliminates TLB shootdowns · L1/L2 cache invalidation · heap fragmentation</p>
          </div>
          <div>
            <CodeViewer code={TENSOR_SNIPPET} lang="cpp" filename="zero_copy_tensor.cpp — map once, infer forever" note="The driver reads this pointer in place; logits land straight in the kernel drop map." />
            <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">Eliminating the Memory-Bus Bottleneck</h3>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                Above 1,000,000 EPS, per-sample allocation triggers continuous TLB shootdowns, rapid cache
                invalidation, and heap fragmentation. <span className="font-mono text-[12px] text-ink">xinfer::Tensor</span> wraps
                pre-allocated contiguous ranges instead — mapping AF_XDP rings and V4L2 DMA-BUF handles directly into
                model input geometry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PLUGIN SUBSYSTEM ───────────────────────────────── */}
      <section id="plugins" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Dynamic C++20 Plugin Subsystem" title="IInferencePlugin & Symbol Isolation" />
        <p className="mt-4 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
          Pre-processing, post-processing, and proprietary hardware decoders ship as independent <span className="font-mono text-[13px] text-ink">.so</span> binaries,
          loaded via <span className="font-mono text-[13px] text-ink">dlopen(…, RTLD_LAZY | RTLD_LOCAL)</span>. CMake
          <span className="font-mono text-[13px] text-ink"> -fvisibility=hidden</span> plus explicit
          <span className="font-mono text-[13px] text-ink"> XINFER_API</span> macros keep plugin symbols out of the global
          table — a plugin with conflicting FFmpeg or OpenCV builds can never collide with the host.
        </p>
        <div className="mt-6 rounded-md border border-hairline bg-panel p-5">
          <p className="font-mono text-[11px] text-cyan">PluginManager::load_plugin(&quot;/usr/local/lib/xinfer/plugins/libyolo_nms.so&quot;)</p>
          <p className="mt-1 font-mono text-[10.5px] text-muted">Validates plugin ABI version → instantiates IInferencePlugin handle</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[
              ["PLUGIN 01 · libyolo_nms", "Non-maximum suppression · bounding-box scoring"],
              ["PLUGIN 02 · libaes_wdec", "Hardware-decrypted model weight decryption key"],
              ["PLUGIN 03 · libnvdec_vid", "Hardware zero-copy video stream decoder"],
            ].map(([t, d]) => (
              <div key={t} className="rounded border border-hairline bg-void/60 p-4">
                <p className="font-mono text-[11px] text-kernel">{t}</p>
                <p className="mt-1.5 text-[12.5px] text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLUGIN_CATEGORIES.map((c) => (
            <div key={c.title} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[14px] font-bold text-ink">{c.title}</h3>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{c.items}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted">30 pre-compiled native plugins ship in /usr/local/lib/xinfer/</p>
      </section>

      {/* ── 6. MODEL HUB ──────────────────────────────────────── */}
      <section id="modelhub" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Automated Model Hub" title="HTTPS Retrieval & Local Cryptographic Cache" />
        <p className="mt-4 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
          <span className="font-mono text-[13px] text-ink">xinfer::ModelHub</span> resolves models autonomously — pull,
          verify, and cache over HTTPS with no Python package managers or git commands.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-kernel/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Model found in cache</p>
            <ul className="mt-3 space-y-1.5 font-mono text-[11.5px] text-muted">
              <li>✓ Verifies SHA-256 checksum</li>
              <li>✓ Validates ONNX magic header</li>
              <li>✓ Passes verified path to loader</li>
            </ul>
          </div>
          <div className="rounded-md border border-cyan/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">Local cache miss</p>
            <ul className="mt-3 space-y-1.5 font-mono text-[11.5px] text-muted">
              <li>→ HTTPS stream with remote TLS verification</li>
              <li>→ Computes cryptographic hash on the fly</li>
              <li>→ Writes to models/ and hot-loads into silicon</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
          <h3 className="font-display text-[15px] font-bold text-ink">Strict Air-Gap Mode</h3>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-[1.8] text-muted">
            For classified defense networks and plants with zero internet access, outbound WAN sockets are disabled at
            compile level. Models load exclusively from local directories or encrypted sneakernet bundles
            (<span className="font-mono text-[12px] text-ink">.snbundle</span>), each SHA-256 verified against an
            immutable signature file before execution.
          </p>
        </div>
      </section>

      {/* ── 7. QUICKSTART ─────────────────────────────────────── */}
      <section id="quickstart" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Developer Quickstart" title="C++20 API Implementation Walkthrough" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">1 · Minimal CMake integration</p>
            <CodeViewer code={CMAKE_SNIPPET} lang="cpp" filename="CMakeLists.txt — find_package style, no vendoring" note="Links libxinfer.so directly. No Python, no conda, no container required." />
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">2 · End-to-end inference pipeline</p>
            <CodeViewer code={PIPELINE_SNIPPET} lang="cpp" filename="src/main.cpp — resolve → load → infer → enforce" note="ModelHub resolution, zero-copy tensors, microsecond loop, KERNEL_DROP verdict." />
          </div>
        </div>
      </section>

      {/* ── 8. BENCHMARKS ─────────────────────────────────────── */}
      <section id="benchmarks" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Verified Empirical Benchmarks" title="xInfer vs. ONNX Runtime vs. LibTorch vs. Native Vendors" />
        <p className="mt-4 max-w-3xl text-[13px] leading-[1.8] text-muted">
          Bare-metal chassis (Core i9-14900K · 192GB DDR5 · Intel X520 10GbE) running identical 32-dim directional
          NetFlow threat models. Latency p50 / p99, single-vector online batch.
        </p>
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[760px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Engine / Runtime</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Memory</th>
                <th className="px-4 py-3">NetFlow p50 (p99)</th>
                <th className="px-4 py-3">Throughput</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {BENCHMARKS.map((b) => (
                <tr key={b.engine} className={`border-b border-hairline/60 last:border-0 ${b.hot ? "bg-kernel/[0.06]" : ""}`}>
                  <td className={`px-4 py-3 font-bold ${b.hot ? "text-kernel" : "text-ink"}`}>{b.engine}</td>
                  <td className="px-4 py-3 text-muted">{b.lang}</td>
                  <td className="px-4 py-3 text-muted">{b.mem}</td>
                  <td className="px-4 py-3 text-ink">{b.p50} <span className="text-muted">({b.p99})</span></td>
                  <td className="px-4 py-3 text-ink">{b.eps} EPS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {FINDINGS.map((f) => (
            <div key={f.label} className="rounded-md border border-hairline bg-panel p-5 text-center">
              <p className="font-display text-[26px] font-bold text-cyan">{f.metric}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">{f.label}</p>
              <p className="mt-1 text-[11px] text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. USE CASES ──────────────────────────────────────── */}
      <section id="use-cases" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Industrial & Embedded Use Cases" title="Production Edge Verticals" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {VERTICALS.map((v) => (
            <div key={v.n} className="rounded-md border border-hairline bg-panel p-6">
              <p className="flex items-center justify-between font-mono text-[11px]"><span className="text-cyan">{v.n}</span><span className="text-muted">{v.sub}</span></p>
              <h3 className="mt-2 font-display text-[17px] font-bold text-ink">{v.title}</h3>
              <p className="mt-1 font-mono text-[10.5px] text-kernel">{v.targets}</p>
              <p className="mt-3 text-[12.5px] leading-[1.8] text-muted"><span className="text-ink">Workload — </span>{v.workload}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted"><span className="text-ink">Result — </span>{v.result}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 10. FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Technical FAQ" title="Frequently Asked Questions" />
        <div className="mt-6 max-w-3xl space-y-3">
          {FAQS.map((f, i) => (
            <Accordion key={f.id} id={f.id} badge={f.badge} title={f.title} defaultOpen={i === 0}>
              <p className="text-[13px] leading-[1.85] text-muted">{f.body}</p>
            </Accordion>
          ))}
        </div>
      </section>

      {/* ── 11. CTA ───────────────────────────────────────────── */}
      <section id="cta" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 pb-16 pt-4 lg:px-8">
        <div className="rounded-md border border-cyan/30 bg-panel px-6 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Integrate The Runtime"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Integrate the xInfer Runtime Into Your Hardware
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Whether you are deploying cyber-physical XDR appliances, building autonomous UAV avionics, or optimizing
            industrial PLCs — xInfer delivers predictable, wire-speed neural inference.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Clone xInfer on GitHub ]
            </a>
            <Link href="/technology/xinfer" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read the Architecture Spec ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact Systems Team ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">github.com/kamisaberi/xinfer · aryorithm.com/technology/xinfer · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
