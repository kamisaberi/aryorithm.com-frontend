import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";
import ForgePipeline from "@/components/simulations/ForgePipeline";
import { InfoNceVisualizer, MaeVisualizer, SafetyGate } from "@/components/simulations/ForgeSims";

export const metadata: Metadata = {
  title: "xInfer Forge — Continuous On-Device Neural Adaptation | Aryorithm",
  description:
    "xinfer-forge (forge-cli): edge-native continuous active learning with MAE + InfoNCE self-supervision, immunized by an immutable golden-attack regression gate. Zero cloud egress.",
};

const GITHUB_URL = "https://github.com/kamisaberi/xinfer-forge";

const KPI_STRIP = [
  { metric: "0.0%", label: "Human Data Labeling", desc: "Required at edge" },
  { metric: "100%", label: "Golden Attack Suite", desc: "Retention invariant" },
  { metric: "Opset 17", label: "Automated ONNX", desc: "Compiler pipeline" },
  { metric: "$0.00", label: "Cloud Retraining", desc: "Data egress cost" },
];

const CLI_SESSION = `# ----------------------------------------------------------------
# 1. AUTONOMOUS FULL CYCLE (discover -> retrain -> stage)
# ----------------------------------------------------------------
$ forge-cli auto-cycle \\
    --nexus-url http://10.240.0.10:9443 \\
    --dataset-dir /var/lib/sentinel-nexus/forge_datasets \\
    --safety-gate configs/safety/golden_attacks.yaml

[+] Connected to Sentinel Nexus at http://10.240.0.10:9443
[+] Dataset: forge_dataset_1774998000.csv (2,500 samples)
[*] Training Masked Autoencoder (epochs 50, LR 0.001, mask 30%)...
[*] Loss: 0.0412 (MAE) | 0.0189 (InfoNCE)
[*] Golden corpus: 500 historic vectors...
[+] SAFETY GATE: 100% retained (500/500 attacks identified)
[*] Compiling to ONNX Opset 17...
[+] Exported: models/network_threat_v2.onnx (1.48 MB)
[+] SHA-256: 8fa9c89b3f4618e47f5255470d9a690e7da3c6046e297893a776...
[+] STAGED: network_threat_v2.onnx now live in SHADOW_MODE!

# ----------------------------------------------------------------
# 2. MANUAL SAFETY-GATE AUDIT
# ----------------------------------------------------------------
$ forge-cli validate-safety \\
    --weights models/candidate_weights.pt \\
    --safety-gate configs/safety/golden_attacks.yaml

[*] Scanning 6 threat categories:
    [PASS] T0855 Modbus forced-coil override        (100/100)
    [PASS] T0843 Triton TriStation memory overwrite (100/100)
    [PASS] T0831 Stuxnet S7Comm frequency tamper    (100/100)
    [PASS] T1071 C2 high-entropy egress beacons     (100/100)
    [PASS] T1046 Line-rate TCP SYN sweeps           (100/100)
[+] APPROVED FOR PRODUCTION COMPILATION.

# ----------------------------------------------------------------
# 3. DIRECT ONNX EXPORT
# ----------------------------------------------------------------
$ forge-cli export-onnx \\
    --input-weights models/candidate_weights.pt \\
    --output-onnx models/network_threat_v2.onnx \\
    --opset 17 --input-dim 32`;

const TIERS: { tier: string; dir: string; proto: string; desc: string }[] = [
  { tier: "Tier 1 (xinfer)", dir: "Outbound model push", proto: "ONNX / target formats", desc: "Optimized models ready for zero-copy mapping on 15 hardware targets." },
  { tier: "Tier 2 (blackbox)", dir: "Inbound drop metrics", proto: "Kernel event telemetry", desc: "eBPF drop provenance flags become high-confidence positive training anchors." },
  { tier: "Tier 3 (sentinel)", dir: "Outbound canary push", proto: "HTTP hot-reload", desc: "Validated artifacts for zero-downtime hot-reloading at edge sites." },
  { tier: "Tier 6 (nexus)", dir: "Bidirectional sync", proto: "REST / filesystem", desc: "Reads DatasetCurator batches; stages candidates via /api/v1/ota/stage." },
  { tier: "Tier 7 (matrix)", dir: "Continuous cyber range", proto: "Docker shared volume", desc: "Retrains on simulated multi-modal traffic streams inside VMware." },
];

const BENCH_ROWS: [string, string, string, string][] = [
  ["Month 0 · Initial deployment", "98.4% accuracy", "98.4% accuracy", "98.4% accuracy"],
  ["Month 2 · Shift pattern drift", "88.1% accuracy", "97.9% accuracy", "98.2% accuracy"],
  ["Month 4 · New PLCs added", "74.5% accuracy", "96.8% accuracy", "98.1% accuracy"],
  ["Month 6 · Active poisoning wave", "64.2% accuracy", "48.1% (poisoned)", "98.0% (protected)"],
];

const COMPLIANCE = [
  {
    n: "01", title: "EU AI Act · Article 15",
    lines: [
      "High-risk AI robustness: resilient to adversarial examples, data poisoning, model evasion.",
      "Continuous quality management: every batch, loss curve, and gate metric logged.",
    ],
  },
  {
    n: "02", title: "NIST SP 800-218 (SSDF)",
    lines: [
      "PW.8.1 — model weights SHA-256 signed; golden evaluation suites sealed.",
    ],
  },
  {
    n: "03", title: "CMMC 2.0 L2 / NIST 800-171",
    lines: [
      "Zero cloud egress: retraining executes 100% on-premises, inside customer enclaves.",
    ],
  },
];

const FAQS = [
  {
    id: "forge-faq-cpu",
    badge: "Q.01",
    title: "CPU or GPU — what does retraining actually need?",
    body: "Forge fine-tunes compact 32-dimensional feature autoencoders, not billion-parameter LLMs. A full cycle — 50 epochs over 2,500 vectors — finishes in under 20 seconds on a standard 4-core Intel CPU. Enterprise clusters can still fan out to CUDA for millions of vectors in parallel.",
  },
  {
    id: "forge-faq-overfit",
    badge: "Q.02",
    title: "How is overfitting to one small site batch prevented?",
    body: "Two mechanisms: 30% stochastic feature masking forces generalization over missing features instead of memorization, and InfoNCE contrastive regularization constrains latent geometry so the model cannot collapse onto a narrow input subset.",
  },
  {
    id: "forge-faq-tamper",
    badge: "Q.03",
    title: "What if an adversary modifies golden_attacks.yaml on disk?",
    body: "In production the suite is signed, read-only, and hash-verified at boot against a measurement sealed in the hardware TPM 2.0. A tampered file means Forge refuses to start — the gate cannot be quietly weakened.",
  },
  {
    id: "forge-faq-airgap",
    badge: "Q.04",
    title: "How does Forge reach Nexus inside an air-gapped facility?",
    body: "It doesn't need the network at all: Forge watches /var/lib/sentinel-nexus/forge_datasets/ on the local filesystem and stages finished ONNX models over localhost REST (POST http://localhost:9443/api/v1/ota/stage).",
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

export default function XInferForgePage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "xInfer Forge" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 4 Continual Learning", "Self-Supervised MAE", "Zero Human Labeling", "Immutable Safety Gate"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Continuous On-Device Neural Adaptation. Zero Cloud Egress. Mathematically Immunized Against Poisoning.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">xinfer-forge (forge-cli) — edge-native continuous active learning daemon</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Self-supervised masked autoencoders and InfoNCE contrastive learning fine-tune threat representations on
            ambient, unlabeled site NetFlow — immunized against adversarial poisoning by an immutable golden-attack
            regression safety gate.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View on GitHub ]
            </a>
            <Link href="#safety-gate" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore Anti-Poisoning Architecture ]
            </Link>
            <Link href="#empirical-benchmarks" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Continual Learning Benchmarks ]
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

      {/* ── 2. DILEMMA ────────────────────────────────────────── */}
      <section id="dilemma" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SectionHead kicker="// The Edge AI Dilemma" title="Concept Drift vs. Adversarial Poisoning" />
            <div className="mt-6 space-y-4">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Failure Mode A · Static Deployment</p>
                <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                  Trained once in the cloud, deployed to the substation — then seasons shift, PLCs get swapped, firmware
                  updates land. False positives climb from <span className="font-mono text-[12px] text-ink">0.01% → 14.5%</span> until
                  operators disable the system entirely.
                </p>
              </div>
              <div className="rounded-md border border-telemetry/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-telemetry">Failure Mode B · Naive Continuous Learning</p>
                <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                  Retrain blindly on ambient telemetry and a patient adversary boils the frog — low-rate malicious traffic
                  over months until the network files the exploit under <span className="font-mono text-[12px] text-ink">“normal baseline”</span> and
                  stops dropping it.
                </p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">The Forge Solution · Self-Supervision + Immutable Gate</p>
                <p className="mt-2 font-mono text-[11.5px] leading-[1.9] text-muted">
                  Ambient telemetry learned self-supervised · nothing ships without 100% on a sealed zero-day suite
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted">Zero drift degradation · zero poisoning · 100% air-gapped</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
              OT traffic is non-stationary — shift changes rewrite Modbus cadence, a new MRI skews DICOM bandwidth, wind
              microgrids reshape power-flow telemetry hourly. Forge pairs unsupervised adaptation on local traffic with a
              non-negotiable regression gate, resolving the trade-off instead of picking a failure mode.
            </p>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Edge AI Dilemma", href: "#dilemma" },
                  { label: "MAE + InfoNCE Engine", href: "#mae-engine" },
                  { label: "Safety Gate", href: "#safety-gate" },
                  { label: "Staging Pipeline", href: "#staging-pipeline" },
                  { label: "forge-cli", href: "#forge-cli" },
                  { label: "Ecosystem Tiers", href: "#ecosystem-tiers" },
                  { label: "Benchmarks", href: "#empirical-benchmarks" },
                  { label: "Compliance", href: "#compliance" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "xInfer Essential", href: "/projects/xinfer-essential", meta: "v4.2.0" },
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "Blackbox Essential", href: "/projects/blackbox-essential", meta: "v2.8.3" },
                ],
              },
            ]}
            cta={{ label: "View on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. MAE ENGINE ─────────────────────────────────────── */}
      <section id="mae-engine" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Self-Supervised Representation Engine" title="Masked Autoencoders & InfoNCE" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <MaeVisualizer />
            <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">Why masking works on flow vectors</h3>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                Each epoch hides 30% of the 32 flow dimensions; the network must reconstruct them from context. On a
                nominal plant, <span className="font-mono text-[12px] text-ink">Forward_Packet_Rate</span> is a deterministic
                function of <span className="font-mono text-[12px] text-ink">Flow_Duration</span> and{" "}
                <span className="font-mono text-[12px] text-ink">SCADA_Function_Code</span> — the model learns the
                site&apos;s physical laws with zero labels.
              </p>
              <p className="mt-3 overflow-x-auto rounded border border-hairline bg-void/60 p-3 font-mono text-[11px] leading-relaxed text-kernel">
                L_MAE(θ) = mean over masked dims of (x_j − x̂_j)² · L_total = L_MAE + λ · L_InfoNCE
              </p>
            </div>
          </div>
          <div>
            <InfoNceVisualizer />
            <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">Contrastive regularization (τ = 0.07)</h3>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                InfoNCE pulls augmented views of the same session together in the 8-dim latent space while pushing
                dissimilar flows apart — nominal traffic forms a tight manifold, anomalies fall off the hyperplane.
                Drag the sliders to feel the temperature geometry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SAFETY GATE ────────────────────────────────────── */}
      <section id="safety-gate" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Golden Attack Regression Gate" title="One Miss. Weights Purged. Zero Tolerance." />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          Every candidate is replayed against the sealed <span className="font-mono text-[12.5px] text-ink">configs/safety/golden_attacks</span> corpus —
          Modbus FC05 overrides, Triton memory hacks, Industroyer breaker trips, JA4 beacons, Stuxnet tampering, SYN sweeps.
          Miss one vector and the invariant fails: weights purged, cycle aborted, CISO alerted. Try both paths live:
        </p>
        <div className="mt-6 max-w-3xl">
          <SafetyGate />
        </div>
        <p className="mt-4 max-w-3xl overflow-x-auto rounded border border-hairline bg-void/60 p-3 font-mono text-[11px] leading-relaxed text-kernel">
          S(θ*) = Π_k 1[argmax M_θ*(x*_k) = y*_k] = 1.000 — a strict conjunction over all K golden vectors
        </p>
      </section>

      {/* ── 5. STAGING PIPELINE ───────────────────────────────── */}
      <section id="staging-pipeline" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Compilation & Staging" title="PyTorch → ONNX Opset 17 → Fleet" />
        <div className="mt-6 max-w-3xl">
          <ForgePipeline />
        </div>
        <div className="mt-4 max-w-3xl rounded-md border border-hairline bg-panel p-5 font-mono text-[11.5px] leading-[2] text-muted">
          <p><span className="text-cyan">1 · Discovery</span> — forge_watcher.py spots forge_dataset_*.csv in /var/lib/sentinel-nexus/forge_datasets/</p>
          <p><span className="text-cyan">2 · Retrain + verify</span> — MAE training, then the 100% golden gate above</p>
          <p><span className="text-cyan">3 · Export</span> — torch.onnx.export → network_threat_v2.onnx, dynamic [batch, 32]</p>
          <p><span className="text-cyan">4 · Hash + stage</span> — SHA-256 → POST nexus:9443/api/v1/ota/stage</p>
          <p><span className="text-cyan">5 · Canary</span> — SHADOW_MODE → 24h metrics → CANARY_5_PCT → FLEET_WIDE hot-reload</p>
        </div>
      </section>

      {/* ── 6. CLI ────────────────────────────────────────────── */}
      <section id="forge-cli" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Developer Tooling" title="forge-cli Command Reference" />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          Full manual control over training, validation, compilation, and staging — the exact session an operator runs:
        </p>
        <div className="mt-6 max-w-4xl">
          <CodeViewer code={CLI_SESSION} lang="bash" filename="operator session — auto-cycle, audit, export" note="Real output shape: losses, 500/500 gate verdict, SHA-256, SHADOW_MODE staging." />
        </div>
      </section>

      {/* ── 7. ECOSYSTEM TIERS ────────────────────────────────── */}
      <section id="ecosystem-tiers" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Closed-Loop Integration" title="The 6-Tier Sentinel Ecosystem" />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[760px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Ecosystem Tier</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Protocol</th>
                <th className="px-4 py-3">Operational Role</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-[11.5px] text-cyan">{t.tier}</td>
                  <td className="px-4 py-3 text-ink">{t.dir}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">{t.proto}</td>
                  <td className="px-4 py-3 text-muted">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 8. BENCHMARKS ─────────────────────────────────────── */}
      <section id="empirical-benchmarks" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Empirical Benchmarks" title="6 Months of Drift + One Poisoning Wave" />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[760px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Operational Timeline</th>
                <th className="px-4 py-3">Static (No Retrain)</th>
                <th className="px-4 py-3">Naive Retrain (No Gate)</th>
                <th className="px-4 py-3 text-kernel">xInfer-Forge</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {BENCH_ROWS.map(([t, s, n, f]) => (
                <tr key={t} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 text-muted">{t}</td>
                  <td className="px-4 py-3 text-threat">{s}</td>
                  <td className="px-4 py-3 text-telemetry">{n}</td>
                  <td className="px-4 py-3 font-bold text-kernel">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-hairline bg-panel p-5">
            <p className="font-display text-[14px] font-bold text-ink">Drift, eliminated</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">Static models sank to 64.2% as the site evolved; Forge held a flat 98.0% with zero manual labeling.</p>
          </div>
          <div className="rounded-md border border-kernel/40 bg-panel p-5">
            <p className="font-display text-[14px] font-bold text-ink">Poisoning, rejected</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">5,000 poisoned vectors collapsed naive retraining to 48.1%. The gate caught the regression, purged the candidate, and production never noticed.</p>
          </div>
        </div>
      </section>

      {/* ── 9. COMPLIANCE ─────────────────────────────────────── */}
      <section id="compliance" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Sovereign Regulatory Compliance" title="EU AI Act · NIST SSDF · CMMC" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {COMPLIANCE.map((c) => (
            <div key={c.n} className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[11px] text-cyan">{c.n}</p>
              <h3 className="mt-2 font-display text-[16px] font-bold text-ink">{c.title}</h3>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-[1.8] text-muted">
                {c.lines.map((l) => (
                  <li key={l.slice(0, 24)} className="flex gap-2"><span className="text-kernel">✓</span><span>{l}</span></li>
                ))}
              </ul>
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
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Immunize Your Edge"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Immunize Your Edge Defense Against Drift & Poisoning
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Autonomous continuous learning that adapts to site infrastructure without cloud leakage — guarded by
            mathematically verified anti-poisoning gates.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Clone xinfer-forge on GitHub ]
            </a>
            <Link href="/technology/forge" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read the Safety Gate Spec ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact ML Team ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">github.com/kamisaberi/xinfer-forge · aryorithm.com/technology/forge · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
