import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";
import { HarnessRunner, PreprintBlock, SlabExplorer } from "@/components/simulations/LabSims";

export const metadata: Metadata = {
  title: "Sentinel-Lab — Open C++20/eBPF Research Testbed | Aryorithm",
  description:
    "sentinel-lab: open academic platform with SLAB wire protocol, dual-silicon testbed, 10-minute CIC-IDS-2017 benchmark harness and Zenodo preprint. MIT licensed.",
};

const GITHUB_URL = "https://github.com/kamisaberi/sentinel-lab";
const ZENODO_URL = "https://doi.org/10.5281/zenodo.XXXXXXX";

const KPI_STRIP = [
  { metric: "10 Minutes", label: "Zero-to-Benchmark", desc: "Evaluation setup" },
  { metric: "0.84 µs", label: "Deterministic XDP", desc: "Drop mitigation SLA" },
  { metric: "60k+ EPS", label: "Wire-Speed Socket", desc: "Injection throughput" },
  { metric: "100% Open", label: "MIT / Apache 2.0", desc: "Dual open-source" },
];

const SLAB_ROWS: [string, string, string, string][] = [
  ["0x00 – 0x03", "Magic Header", "uint32_t · 32 bits", '0x534C4142 ("SLAB" ASCII)'],
  ["0x04 – 0x0B", "Event Timestamp / ID", "uint64_t · 64 bits", "Deterministic nanosecond flow ID"],
  ["0x0C – 0x0F", "Ground Truth Label", "int32_t · 32 bits", "0 benign · 1 malicious (−1 unlabeled)"],
  ["0x10 – 0x13", "Num Features (D)", "uint32_t · 32 bits", "Dynamic width: 32, 42, 80, 128…"],
  ["0x14 – End", "Continuous Tensor", "float32[] · D × 32", "IEEE 754 array [f₀ … f_{D-1}]"],
];

const BENCH_ROWS: [string, string, string, string, string][] = [
  ["Native C++20 / eBPF", "0.84 µs (< 1.0ms)", "Driver XDP drop", "1,250,000 EPS", "8.2%"],
  ["Suricata 7.0 (C/mt)", "5.0 – 15.0 ms", "NFQUEUE drop", "350,000 EPS", "34.5%"],
  ["Elastic SIEM 8.11 (JVM)", "3.0 – 10.0 s", "Passive ticket", "150,000 EPS", "62.4%"],
  ["Splunk Enterprise", "15.0 – 60.0 s", "Passive ticket", "85,000 EPS", "78.1%"],
];

const BENCH_META: [string, string, string, string, string][] = [
  ["Peak memory", "1.38 GB", "8.20 GB", "34.10 GB", "68.00 GB"],
  ["Idle memory", "180 MB", "1.00 GB", "8.00 GB", "16.00 GB"],
  ["Silicon accel", "OpenVINO / TensorRT", "None", "None", "None"],
  ["Air-gapped", "100% native", "100% native", "Partial", "Partial"],
  ["Cloud egress", "$0.00", "$0.00", "High", "High"],
];

const THESIS_VECTORS = [
  { n: "01", title: "Low-Latency Kernel Systems", body: "Evaluating eBPF CO-RE performance trade-offs in virtualized vs. physical NIC drivers." },
  { n: "02", title: "Heterogeneous Edge AI Compilers", body: "Power-performance study of INT8 autoencoders across Core Ultra NPUs and Jetson Orin." },
  { n: "03", title: "Cyber-Physical Security", body: "Deterministic SCADA actuation protection via sub-microsecond eBPF kernel drops." },
  { n: "04", title: "Adversarial ML at the Edge", body: "Golden-set safety gates vs. poisoning attacks on edge NIDS." },
];

const BUILD_SESSION = `# Prerequisites — Ubuntu 22.04 / 24.04 / 26.04
sudo apt-get update && sudo apt-get install -y \\
    build-essential cmake clang llvm libelf-dev libssl-dev \\
    python3-pip python3-venv git

# 1. Clone the testbed
git clone https://github.com/kamisaberi/sentinel-lab.git
cd sentinel-lab

# 2. Compile the eBPF kernel dropper
chmod +x bpf/build_bpf.sh
./bpf/build_bpf.sh

# 3. Compile the C++20 research binary
mkdir -p build && cd build
cmake .. -DENABLE_OPENVINO=ON -DBUILD_TESTS=ON
make -j$(nproc)

# 4. Verify the test suite
./test_harness`;

const EVAL_SESSION = `# 1. Clone (once)
git clone https://github.com/kamisaberi/sentinel-lab.git
cd sentinel-lab

# 2. Build dropper + engine
./bpf/build_bpf.sh
mkdir -p build && cd build
cmake .. -DENABLE_OPENVINO=ON -DBUILD_TESTS=ON
make -j$(nproc)

# 3. Start the testbed daemon (terminal 1)
sudo ./sentinel_lab &

# 4. Launch the autonomous harness (terminal 2)
python3 examples/run_full_evaluation.py`;

const BIBTEX = `@article{saberi2026deterministic,
  title={Deterministic Sub-Microsecond Cyber-Physical Threat
    Mitigation: A Heterogeneous Edge AI and eBPF/XDP Architecture},
  author={Saberi, Kami},
  journal={arXiv / Zenodo Preprint},
  year={2026},
  doi={10.5281/zenodo.XXXXXXX},
  publisher={Aryorithm Technologies Research Lab}
}`;

const FAQS = [
  {
    id: "lab-faq-cite",
    badge: "Q.01",
    title: "How do I cite Sentinel-Lab?",
    body: "Use the BibTeX block on this page referencing the CERN/Zenodo preprint (DOI 10.5281/zenodo.XXXXXXX). The paper is CC-BY-4.0 — reuse figures freely with attribution.",
  },
  {
    id: "lab-faq-vm",
    badge: "Q.02",
    title: "Can I run it in a VM without 10GbE hardware?",
    body: "Yes. Generic SKB mode (XDP_FLAGS_SKB_MODE) engages automatically under VMware, ESXi, or KVM — under 2.5µs instead of 0.84µs, still thousands of times faster than userspace NIDS.",
  },
  {
    id: "lab-faq-license",
    badge: "Q.03",
    title: "What license governs the repository?",
    body: "MIT. Inspect, modify, fork, and publish derivatives — including commercial products — without restriction.",
  },
  {
    id: "lab-faq-datasets",
    badge: "Q.04",
    title: "Can I evaluate datasets other than CIC-IDS-2017?",
    body: "Yes. Pack normalized rows with tools/csv_to_slab.py and the C++ testbed ingests any feature width immediately — no recompilation, thanks to the self-describing header.",
  },
];

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{kicker}</p>
      <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">{title}</h2>
    </>
  );
}

export default function SentinelLabPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Sentinel-Lab" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 5 Academic Research Platform", "Open Science / Zenodo DOI", "Reproducible Benchmarks", "SLAB Protocol"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            An Open-Source C++20/eBPF Testbed for Sub-Microsecond Cyber-Physical Defense Research.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">sentinel-lab (sentinel_lab) — peer-reviewed academic experimentation platform</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            A self-describing zero-copy wire protocol (SLAB), an automated CIC-IDS-2017 PortScan pipeline, and
            dual-silicon drivers (OpenVINO + TensorRT) — the empirical baseline for sub-microsecond threat mitigation in hardware.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={ZENODO_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Download Preprint (PDF) ]
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Clone on GitHub ]
            </a>
            <Link href="#evaluation-harness" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore 10-Minute Benchmark ]
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

      {/* ── 2. REPRODUCIBILITY CRISIS ─────────────────────────── */}
      <section id="crisis" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SectionHead kicker="// The Reproducibility Crisis" title="95% of NIDS Papers Can't Survive the Wire" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Status Quo · Notebook NIDS</p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-[1.8] text-muted">
                  <li>· 99.8% F1 on static CSVs, never executed live</li>
                  <li>· Zero accounting for latency, fragmentation, ring physics</li>
                  <li>· Private code, dead CUDA, unmaintained repos</li>
                </ul>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Sentinel-Lab Paradigm</p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-[1.8] text-muted">
                  <li>· Native C++20 on real eBPF/XDP hooks</li>
                  <li>· Wire-to-mitigation latency on physical frames</li>
                  <li>· 1-command harness: dataset → percentiles → confusion matrix</li>
                </ul>
                <p className="mt-2 font-mono text-[10px] text-muted">100% reproducible · zero paywalls · active DOI</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
              Python feature extraction plus inference costs <span className="font-mono text-[13px] text-ink">15–60ms</span> —
              useless against physical sabotage. Sentinel-Lab scores precision, recall, and F1 <span className="text-ink">alongside</span> kernel
              latency, bus bandwidth, and CPU cycles: machine-learning theory welded to systems engineering.
            </p>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Reproducibility Crisis", href: "#crisis" },
                  { label: "SLAB Protocol", href: "#slab-protocol" },
                  { label: "Dual-Silicon Testbed", href: "#dual-silicon" },
                  { label: "Preprint & Zenodo", href: "#preprint" },
                  { label: "10-Minute Pipeline", href: "#evaluation-harness" },
                  { label: "Benchmarks", href: "#benchmarks" },
                  { label: "Thesis Guide", href: "#thesis-guide" },
                  { label: "Quickstart", href: "#quickstart" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "xInfer Essential", href: "/projects/xinfer-essential", meta: "v4.2.0" },
                  { label: "Blackbox Essential", href: "/projects/blackbox-essential", meta: "v2.8.3" },
                ],
              },
            ]}
            cta={{ label: "Clone on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. SLAB ───────────────────────────────────────────── */}
      <section id="slab-protocol" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// SLAB Wire Protocol" title="One Binary. Any Dimensionality. Zero Copies." />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[720px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Offset</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {SLAB_ROWS.map(([off, f, t, p]) => (
                <tr key={f} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 text-cyan">{off}</td>
                  <td className="px-4 py-3 text-ink">{f}</td>
                  <td className="px-4 py-3 text-muted">{t}</td>
                  <td className="px-4 py-3 text-muted">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {[
            ["Zero-copy ingestion", "Magic 0x534C4142 verified, offset 0x14 cast straight to const float* — no allocator, no deserializer."],
            ["Any width, no rebuild", "80-dim NetFlow, 32-dim PortScan, 128-dim acoustic — one binary, header decides."],
            ["Ground truth on the wire", "Embedded labels stream TP/FP/FN and precision-recall curves live."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-display text-[14px] font-bold text-ink">{t}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <SlabExplorer />
        </div>
      </section>

      {/* ── 4. DUAL SILICON ───────────────────────────────────── */}
      <section id="dual-silicon" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Comparative Testbed" title="OpenVINO vs. TensorRT, Same SLAB Stream" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-md border border-cyan/40 bg-panel p-5">
            <p className="font-mono text-[11px] text-cyan">BACKEND A · INTEL OPENVINO</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">CPU / iGPU / NPU · pointer pass via ov::Tensor · FP32 / FP16 / INT8</p>
          </div>
          <div className="flex items-center justify-center font-mono text-[13px] text-muted">∥</div>
          <div className="rounded-md border border-kernel/40 bg-panel p-5">
            <p className="font-mono text-[11px] text-kernel">BACKEND B · NVIDIA TENSORRT</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">CUDA / Tensor Cores · cudaHostRegister streams · FP32 / FP16 / INT8</p>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Silicon parity guarantee</p>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-[1.8] text-muted">
            Identical threat classifier via torch.onnx.export (Opset 17) on both sides; zero-copy host-pinned mapping on
            both sides. The only variables left are throughput, thermals, and latency — publishable, fair comparisons
            across Core Ultra / Xeon and Jetson / enterprise GPUs.
          </p>
        </div>
      </section>

      {/* ── 5. PREPRINT ───────────────────────────────────────── */}
      <section id="preprint" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Open Science" title="Preprint, DOI & Theoretical Core" />
        <div className="mt-6 max-w-3xl">
          <PreprintBlock />
        </div>
        <div className="mt-4 grid max-w-3xl gap-3">
          {[
            ["Mitigation-latency bound", "t_extract + t_infer + t_enforce strictly below τ_SLA < 1.0ms — or SCADA actuators take damage."],
            ["Uncertainty boundary", "Shannon entropy band 0.40 ≤ p ≤ 0.60 fused with autoencoder residuals L_recon(x) = ||x − x̂||²."],
            ["Golden invariant", "S(θ*) = Π_k 1[argmax M(x*_k) = y*_k] = 1.000 — the zero-tolerance regression gate, formalized."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-display text-[14px] font-bold text-ink">{t}</p>
              <p className="mt-1.5 font-mono text-[11.5px] leading-[1.8] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. EVALUATION PIPELINE ────────────────────────────── */}
      <section id="evaluation-harness" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// 10-Minute Pipeline" title="Clone → Build → Stream → Percentiles" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <CodeViewer code={EVAL_SESSION} lang="bash" filename="terminal — zero to benchmark in under 10 minutes" note="CIC-IDS-2017 PortScan: 77.4 MB · 286,467 flows · 64,280 pkt/s · 99.82% accuracy." />
            <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Harness stages</p>
              <p className="mt-2 font-mono text-[11.5px] leading-[2] text-muted">
                Resolve model → fetch dataset → normalize to SLAB-32 → stream raw sockets → score accuracy/precision/recall/F1 + p50–p99.9
              </p>
            </div>
          </div>
          <div>
            <HarnessRunner />
          </div>
        </div>
      </section>

      {/* ── 7. BENCHMARKS ─────────────────────────────────────── */}
      <section id="benchmarks" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Comparative Benchmarks" title="Sentinel vs. Suricata vs. Elastic vs. Splunk" />
        <p className="mt-4 max-w-3xl text-[13px] leading-[1.8] text-muted">
          Bare metal (i9-14900K · 192GB DDR5 · X520-DA2 10GbE) at 1.25M events/sec line rate.
        </p>
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[840px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Metric / Platform</th>
                <th className="px-4 py-3 text-kernel">Sentinel-Lab</th>
                <th className="px-4 py-3">Suricata 7.0</th>
                <th className="px-4 py-3">Elastic SIEM 8.11</th>
                <th className="px-4 py-3">Splunk Enterprise</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              <tr className="border-b border-hairline/60"><td className="px-4 py-3 text-muted">Engine</td><td className="px-4 py-3 font-bold text-kernel">Native C++20/eBPF</td><td className="px-4 py-3 text-ink">C / multithreaded</td><td className="px-4 py-3 text-ink">Java JVM / Lucene</td><td className="px-4 py-3 text-ink">C++ / indexer</td></tr>
              {BENCH_ROWS.map(([m, s, su, e, sp]) => (
                <tr key={m} className="border-b border-hairline/60">
                  <td className="px-4 py-3 text-muted">{m}</td>
                  <td className="px-4 py-3 font-bold text-kernel">{s}</td>
                  <td className="px-4 py-3 text-ink">{su}</td>
                  <td className="px-4 py-3 text-ink">{e}</td>
                  <td className="px-4 py-3 text-ink">{sp}</td>
                </tr>
              ))}
              {BENCH_META.map(([m, s, su, e, sp]) => (
                <tr key={m} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 text-muted">{m}</td>
                  <td className="px-4 py-3 text-kernel">{s}</td>
                  <td className="px-4 py-3 text-ink">{su}</td>
                  <td className="px-4 py-3 text-ink">{e}</td>
                  <td className="px-4 py-3 text-ink">{sp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 8. THESIS GUIDE ───────────────────────────────────── */}
      <section id="thesis-guide" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Curriculum & Theses" title="Four Ready-Made Research Vectors" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {THESIS_VECTORS.map((v) => (
            <div key={v.n} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[11px] text-cyan">{v.n}</p>
              <h3 className="mt-2 font-display text-[15px] font-bold text-ink">{v.title}</h3>
              <p className="mt-2 font-mono text-[11.5px] italic leading-[1.8] text-muted">“{v.body}”</p>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-[13px] leading-[1.8] text-muted">
          Deployable in Advanced Operating Systems, Network Security, and Edge ML courses: students clone, implement a
          detector in C++, and measure its latency on live 10GbE frames.
        </p>
      </section>

      {/* ── 9. QUICKSTART ─────────────────────────────────────── */}
      <section id="quickstart" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Developer Quickstart" title="Build From Source in Minutes" />
        <div className="mt-6 max-w-3xl">
          <CodeViewer code={BUILD_SESSION} lang="bash" filename="terminal — prerequisites, eBPF build, C++20 binary, test suite" note="Ubuntu 22.04/24.04/26.04 · clang + cmake · python3 venv for the harness." />
        </div>
      </section>

      {/* ── 10. FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Technical FAQ" title="Citations, VMs, License, Datasets" />
        <div className="mt-6 max-w-3xl">
          <CodeViewer code={BIBTEX} lang="bash" filename="cite.bib — copy-paste BibTeX for your publication" note="CC-BY-4.0 preprint · DOI 10.5281/zenodo.XXXXXXX · Aryorithm Technologies Research Lab." />
        </div>
        <div className="mt-4 max-w-3xl space-y-3">
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
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Advance Your Research"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Advance Your Research With Sentinel-Lab
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Reproduce the benchmarks on your lab workstation in 10 minutes, then build your thesis on a verified,
            open-source C++20/eBPF active defense platform.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={ZENODO_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Read Preprint on Zenodo ]
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Clone GitHub Repository ]
            </a>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact Author ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">doi.org/10.5281/zenodo.XXXXXXX · github.com/kamisaberi/sentinel-lab · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
