import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "xInfer Forge — Autonomous On-Device Model Adaptation & Continuous Learning Engine | Aryorithm",
  description: "Asynchronous, self-supervised learning and continuous adaptation service for edge AI appliances and air-gapped security infrastructure. Fine-tunes deep learning adapters locally without human supervision.",
};

export default function XInferForgePage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "xInfer Forge" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Self-Supervised Adaptation Engine <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            xInfer Forge
          </h1>
          <p className="mt-2 font-mono text-[13px] text-kernel">Autonomous On-Device Model Adaptation & Continuous Learning Engine</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Asynchronous, self-supervised learning and continuous adaptation service designed for edge AI appliances and
            air-gapped security infrastructure. Ingests ambient, unlabeled site telemetry, fine-tunes deep learning
            adapters locally without human supervision, verifies resulting weights against an automated anti-poisoning
            regression gate, and executes zero-downtime hot-reloads of compiled ONNX models.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/forge" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Technology ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v1.0.0"], ["Status", "Beta"], ["Data Egress", "0 B"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Executive Overview"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">The Domain Shift Problem.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Static deep learning models deployed in production environments suffer from domain shift: benign baseline
            network traffic, industrial PLC commands, and physical surroundings vary across every physical facility.
            Models trained in isolated lab environments inevitably generate false alarms or miss novel site-specific
            threat variants unless adapted locally.
          </p>
          <p>However, standard fine-tuning approaches introduce severe operational risks:</p>
          <p>
            <span className="text-ink">1. The Air-Gap Constraint:</span> Regulated facilities (such as nuclear stations,
            naval vessels, and high-security data centers) are prohibited from uploading operational data to cloud GPU
            clusters for re-training.
          </p>
          <p>
            <span className="text-ink">2. The Labeling Bottleneck:</span> Real-time edge appliances process millions of
            unlabelled events per second. Manual human labeling is impossible.
          </p>
          <p>
            <span className="text-ink">3. Adversarial Model Poisoning:</span> A slow, distributed attack can intentionally
            pollute unsupervised training data, causing models to gradually accept malicious vectors as benign.
          </p>
          <p>
            xInfer Forge resolves these structural challenges by implementing a decoupled, self-supervised adaptation
            pipeline protected by a non-negotiable <span className="text-ink">Golden Attack Regression Gate</span>.
          </p>
        </div>
      </section>

      <section id="architecture" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Architecture"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">The Continuous Adaptation Loop.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            xInfer Forge runs asynchronously as a background daemon or scheduled service, decoupled from the microsecond
            execution path of the primary defense engine:
          </p>
          <div className="rounded-md border border-hairline bg-panel p-5 font-mono text-[12.5px] leading-[1.8] text-muted">
            <p className="text-cyan">BLACKBOX SENTINEL APPLIANCE (Real-Time C++20 Defense Engine)</p>
            <p>- Captures raw network packets, logs, and video streams at wire speed.</p>
            <p>- Evaluates events via libxinfer.so using compiled network_threat_v1.onnx.</p>
            <p>- Drops malicious traffic at the kernel level via eBPF/XDP in &lt; 1 millisecond.</p>
            <p>- Appends ambient, unlabeled benign flow features into local circular storage.</p>
            <p className="mt-3 text-cyan">| 1. Ambient Telemetry (Parquet / SQLite)</p>
            <p className="mt-3 text-cyan">XINFER FORGE (Asynchronous Python/PyTorch Adaptation Service)</p>
            <p>- Step A: Ingests local ambient flow vectors (forge/collector).</p>
            <p>- Step B: Generates self-supervised training samples via Masked Autoencoding (MAE).</p>
            <p>- Step C: Fine-tunes adapter head on base checkpoint (checkpoints/base_model.pt).</p>
            <p>- Step D: Evaluates adapted model against configs/safety/golden_attacks.yaml.</p>
            <p>  * PASS: Continues to compilation.</p>
            <p>  * FAIL: Discards weights, retains v1 model, logs security alert.</p>
            <p>- Step E: Compiles PyTorch graph to ONNX (models/network_threat_v2.onnx).</p>
            <p className="mt-3 text-cyan">| 2. Hot-Reload Signal (REST API / Unix Socket)</p>
            <p className="mt-3 text-cyan">XINFER ENGINE (Atomic Hot-Swap)</p>
            <p>- libxinfer.so compiles network_threat_v2.onnx into memory in the background.</p>
            <p>- Swaps backend execution pointer atomically with zero packet loss or downtime.</p>
          </div>
        </div>
      </section>

      <section id="subsystems" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Core Subsystems"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Technical Components.</h2>
        <div className="mt-6 max-w-3xl space-y-6 text-[14.5px] leading-[1.85] text-muted">
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">1. Ambient Telemetry Collector</h3>
            <p className="mt-2">
              The collector queries local circular storage buffers populated by libblackbox.so. It pulls events that
              received low baseline anomaly scores during regular operational hours, filtering out anomalous outliers to
              build an empirical dataset of site-specific benign traffic.
            </p>
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">2. Self-Supervised Learning Engine</h3>
            <p className="mt-2">
              Because incoming production data is 100% unlabeled, xInfer Forge uses Masked Autoencoding (MAE) for
              parameter-efficient adaptation. A random subset (default: 20%) of the 32 input flow features is zero-masked.
              The neural network is trained to reconstruct the original, unmasked values using Mean Squared Error (MSE)
              loss. Over several hundred iterations on local traffic, the model learns the exact correlations and normal
              boundaries of the customer's specific network topology.
            </p>
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">3. Automated Safety and Anti-Poisoning Gate</h3>
            <p className="mt-2">
              To protect against adversarial drift and catastrophic forgetting, xInfer Forge enforces a strict, automated
              validation gate before any model is approved for deployment. The newly adapted weights are evaluated against
              an immutable test suite (configs/safety/golden_attacks.yaml) containing known attack signatures. The adapted
              model must achieve a 100% detection rate on the golden benchmark. If the model fails to flag even a single
              known attack, the adaptation is immediately aborted.
            </p>
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">4. Production ONNX Compiler</h3>
            <p className="mt-2">
              Approved PyTorch models are converted to optimized ONNX binaries via torch.onnx.export. Employs ONNX Opset
              17 with constant folding and operator simplification. Enforces explicit, standardized input tensor names
              (input) and output tensor names (scores) matching the dynamic engine bindings in libblackbox.so.
            </p>
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">5. Zero-Downtime Hot-Reload Dispatcher</h3>
            <p className="mt-2">
              Once the new ONNX model is verified and written to disk, the dispatcher issues an authenticated HTTP POST
              payload to Blackbox Sentinel. xinfer::Engine loads and optimizes the new model in RAM before performing an
              atomic pointer swap, updating the active detection model without dropping a single packet.
            </p>
          </div>
        </div>
      </section>

      <section id="requirements" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Requirements"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">System Requirements.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">Hardware</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Processor: x86_64 or ARM64 (Compatible with Intel Core, Xeon, AMD Ryzen, or NVIDIA Jetson)</li>
              <li>RAM: Minimum 4 GB available system RAM for adaptation training loops</li>
              <li>Disk: 2 GB free storage for base checkpoints, datasets, and compiled ONNX binaries</li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">Software</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Operating System: Ubuntu 22.04 / 24.04 LTS, Debian 12, or RHEL 9</li>
              <li>Python Version: Python 3.10, 3.11, or 3.12</li>
              <li>Core Frameworks: PyTorch 2.0+, ONNX, ONNX Runtime, NumPy, PyYAML, Requests</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="installation" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Installation"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Quick Start.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <div className="rounded-md border border-hairline bg-panel p-5 font-mono text-[12.5px] leading-[1.8] text-muted">
            <p className="text-cyan"># Clone the repository</p>
            <p>git clone https://github.com/kamisaberi/xinfer-forge.git</p>
            <p>cd xinfer-forge</p>
            <p className="mt-3 text-cyan"># Create a virtual environment & install dependencies</p>
            <p>python3 -m venv venv</p>
            <p>source venv/bin/activate</p>
            <p>pip install --upgrade pip</p>
            <p>pip install -r requirements.txt</p>
            <p className="mt-3 text-cyan"># Install xInfer Forge in editable mode</p>
            <p>pip install -e .</p>
            <p className="mt-3 text-cyan"># Verify CLI is accessible</p>
            <p>forge-cli --help</p>
          </div>
        </div>
      </section>

      <section id="configuration" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Configuration"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">YAML-Driven Operation.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            xInfer Forge is controlled through declarative YAML configuration files. The global configuration
            (configs/forge_config.yaml) defines appliance settings, training hyperparameters, safety thresholds, and
            export parameters.
          </p>
          <div className="rounded-md border border-hairline bg-panel p-5 font-mono text-[12.5px] leading-[1.8] text-muted">
            <p className="text-cyan">training:</p>
            <p>  device: "cpu"                  # Options: "cpu", "cuda"</p>
            <p>  input_dim: 32                  # Number of input flow features</p>
            <p>  epochs: 10                     # Number of training epochs per cycle</p>
            <p>  batch_size: 64                 # Training batch size</p>
            <p>  learning_rate: 0.002           # Optimizer learning rate</p>
            <p>  mask_ratio: 0.20               # Percentage of features masked for MAE learning</p>
            <p>  min_samples_to_train: 100      # Minimum collected samples required before triggering training</p>
            <p className="mt-3 text-cyan">safety:</p>
            <p>  golden_benchmark_path: "configs/safety/golden_attacks.yaml"</p>
            <p>  min_golden_detection_rate: 1.00 # Must detect 100% of non-negotiable attacks</p>
            <p>  max_allowed_reconstruction_drift: 0.25</p>
            <p className="mt-3 text-cyan">export:</p>
            <p>  onnx_output_name: "network_threat_v2.onnx"</p>
            <p>  opset_version: 17</p>
          </div>
        </div>
      </section>

      <section id="operation" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Operation"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Operating Instructions.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">Manual Single-Run Execution</h3>
            <div className="mt-2 rounded-md border border-hairline bg-panel p-5 font-mono text-[12.5px] leading-[1.8] text-muted">
              <p>./deploy/run_adaptation.sh</p>
              <p className="mt-2 text-cyan"># Or execute via the CLI tool:</p>
              <p>forge-cli run --config configs/forge_config.yaml</p>
            </div>
          </div>
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">Scheduled Automated Background Adaptation (Systemd)</h3>
            <p className="mt-2">
              To schedule xInfer Forge to adapt models automatically every 24 hours (e.g., at 2:00 AM during off-peak
              hours), copy the systemd unit files to your system directory, enable and start the background service, and
              view execution logs via journalctl.
            </p>
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Security Model"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Anti-Poisoning Guarantees.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Attack Vector</th>
                  <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Standard Vulnerability</th>
                  <th className="py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">xInfer Forge Defense</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-hairline/50">
                  <td className="py-3 pr-4 text-ink">Gradual Adversarial Drift</td>
                  <td className="py-3 pr-4">Attackers slowly modify traffic over 14 days to make intrusions appear normal.</td>
                  <td className="py-3">The Safety Regression Gate: Every checkpoint is validated against read-only historical attacks. If an attack is missed, adaptation is aborted.</td>
                </tr>
                <tr className="border-b border-hairline/50">
                  <td className="py-3 pr-4 text-ink">Catastrophic Forgetting</td>
                  <td className="py-3 pr-4">Adapting to a new subnet causes the model to forget generic malware patterns.</td>
                  <td className="py-3">Parameter-Efficient Tuning: The core feature representation backbone remains frozen; only adaptation adapter parameters are tuned.</td>
                </tr>
                <tr className="border-b border-hairline/50">
                  <td className="py-3 pr-4 text-ink">Telemetry Injection</td>
                  <td className="py-3 pr-4">Injected false events into the audit database pollute training datasets.</td>
                  <td className="py-3">Anomaly Filtering: Events flagged with an anomaly score &gt;0.50 by libblackbox.so are excluded from the ambient benign training pool.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-ink">Supply Chain Tampering</td>
                  <td className="py-3 pr-4">An unauthorized user attempts to replace the model file with malicious weights.</td>
                  <td className="py-3">Cryptographic Model Verification: The exported ONNX model is verified for structural integrity before libxinfer.so executes the hot-reload.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="value" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Value Proposition"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Commercial Value.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            <span className="text-ink">1. Autonomous Site-Specific Baselines:</span> Eliminates the need for professional
            services teams to manually calibrate SIEM rules during customer onboarding. The appliance adapts itself to the
            customer's network topology within 48 hours.
          </p>
          <p>
            <span className="text-ink">2. False Positive Suppression:</span> Adapting to legitimate, unusual internal
            protocols (such as proprietary industrial SCADA communications) prevents alert fatigue without weakening
            perimeter threat defenses.
          </p>
          <p>
            <span className="text-ink">3. True Sovereign Operation:</span> No telemetry, feature vectors, or internal system
            configurations ever exit the physical appliance enclosure.
          </p>
        </div>
      </section>

      <ClosingCTA />
    </>
  );
}
