import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";

export const metadata: Metadata = {
  title: "Sentinel-Stack — 6-Tier Installer | Aryorithm",
  description:
    "sentinel-stack: meta-orchestrator that resolves dependencies, compiles six C++20/eBPF tiers in order, and verifies 6/6 smoke tests.",
};

const GITHUB_URL = "https://github.com/kamisaberi/sentinel-stack";

const KPI_STRIP = [
  { metric: "6 Tiers", label: "Sequential Build", desc: "Strict dependency order" },
  { metric: "1-Click", label: "Zero-Prompt Install", desc: "Master install script" },
  { metric: "100%", label: "Automated Verification", desc: "Post-build smoke suite" },
  { metric: "0 ms", label: "Manual Configuration", desc: "Needed from operator" },
];

const PHASES: [string, string, string][] = [
  ["Phase 0 · System Validation", "00_check_system.sh", "Ubuntu 24.04/26.04 + arch probe · CPU/RAM-scaled job count · VMware/KVM/bare-metal detect · mount /sys/fs/bpf"],
  ["Phase 1 · Toolchains & Deps", "01_install_dependencies.sh", "Clang/LLVM, CMake ≥ 3.20, libelf, OpenSSL · gRPC + Protobuf dev pkgs · PEP 668 venv at /opt/sentinel-stack/venv · NumPy, PyYAML, PyTorch CPU, ONNX"],
  ["Phase 2 · Repo Sync", "02_clone_repositories.sh", "Reuse /home/kami/ trees via rsync · shallow depth-1 clones for anything missing"],
  ["Phase 3 · Topological Build", "03_build_all_tiers.sh", "Tiers 1→6 in DAG order · ldconfig after every library · web assets + CLI wrappers deployed"],
  ["Phase 4 · Systemd Daemons", "04_setup_systemd.sh", "nexus + sentinel units · CAP_NET_ADMIN/SYS_ADMIN/BPF · boot auto-start"],
  ["Phase 5 · Smoke Tests", "05_verify_installation.sh", "6/6 assertions: sonames, binaries, CLI responsiveness · production-ready verdict"],
];

const DAG: [string, string, string][] = [
  ["Step 1 · Tier 1 — xinfer-essential", "libxinfer.so → /usr/local/lib + headers → ldconfig", "Linked by Tier 2"],
  ["Step 2 · Tier 2 — blackbox-essential", "clang -O2 -target bpf → xdp_filter.o · libblackbox.so → ldconfig", "Linked by Tier 3"],
  ["Step 3 · Tier 3 — blackbox-sentinel", "Proto sync from Nexus · sentinel daemon (26 mods, 30 plugins, uplink) → /usr/local/bin/sentinel", "Isolated Python runtime"],
  ["Step 4 · Tier 4 — xinfer-forge", "PyTorch CPU pipeline → /usr/local/bin/forge-cli global wrapper", "Linked by Tier 5"],
  ["Step 5 · Tier 5 — sentinel-lab", "eBPF hooks + C++20 harness → /usr/local/bin/sentinel_lab", "Independent orchestrator"],
  ["Step 6 · Tier 6 — sentinel-nexus", "Command plane + gRPC + HTTP server → sentinel-nexus + nexus-ctl · SPA to /opt/sentinel-nexus/web/", "Done — fleet online"],
];

const SENTINEL_UNIT = `[Unit]
Description=Blackbox Sentinel - Autonomous Edge Cyber-Physical XDR (Tier 3)
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/etc/sentinel
ExecStart=/usr/local/bin/sentinel /etc/sentinel/sentinel.yaml
Restart=always
RestartSec=3s
LimitNOFILE=65536
TasksMax=4096
AmbientCapabilities=CAP_NET_ADMIN CAP_SYS_ADMIN CAP_BPF
Nice=-10
CPUSchedulingPolicy=rr
CPUSchedulingPriority=80

[Install]
WantedBy=multi-user.target`;

const NEXUS_UNIT = `[Unit]
Description=Sentinel Nexus - Collective Fleet Command Plane (Tier 6)
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/sentinel-nexus
ExecStart=/usr/local/bin/sentinel-nexus /opt/sentinel-nexus/configs/nexus.yaml
Restart=always
RestartSec=5s
LimitNOFILE=65536
TasksMax=4096

[Install]
WantedBy=multi-user.target`;

const QUICKSTART = `# Fresh Ubuntu 24.04 / 26.04 machine — one command does everything
git clone https://github.com/kamisaberi/sentinel-stack.git
cd sentinel-stack
chmod +x install.sh scripts/*.sh
sudo ./install.sh

# Later: update, verify, inspect
sudo make update     # pull + recompile all six tiers (incl. xdp_filter.o)
sudo make verify     # 6/6 post-install smoke tests
sudo make status     # sentinel + nexus systemd state

# Clean removal (binaries, libs, configs, caches)
sudo systemctl disable --now sentinel-nexus blackbox-sentinel
sudo rm -f /usr/local/bin/{sentinel,sentinel-nexus,nexus-ctl,sentinel_lab,forge-cli}
sudo rm -f /usr/local/lib/{libxinfer.so*,libblackbox.so*}
sudo rm -rf /etc/sentinel /opt/sentinel-nexus /opt/sentinel-stack
sudo ldconfig`;

const FAQS = [
  {
    id: "stack-faq-offline",
    badge: "Q.01",
    title: "Can install.sh run fully offline in an air-gapped facility?",
    body: "Yes. Pre-seed /home/kami/ with the repo folders and point APT at an internal mirror — 02_clone_repositories.sh detects local trees and syncs with zero outbound requests.",
  },
  {
    id: "stack-faq-ram",
    badge: "Q.02",
    title: "What if a build step runs out of RAM?",
    body: "Phase 0 measures total memory first. Under 4 GB — common on small VMs — parallel jobs cap at make -j2 so the OOM-killer never meets the compiler.",
  },
  {
    id: "stack-faq-uninstall",
    badge: "Q.03",
    title: "How do I cleanly uninstall?",
    body: "Disable both systemd units, delete the five /usr/local/bin entrypoints, both .so families, the three config/data roots (/etc/sentinel, /opt/sentinel-nexus, /opt/sentinel-stack), then ldconfig. The quickstart panel has the exact block.",
  },
  {
    id: "stack-faq-kernel",
    badge: "Q.04",
    title: "What about future kernel updates?",
    body: "Re-run sudo make update: xdp_filter.o recompiles against the newly booted headers, libraries refresh, and both daemons restart seamlessly.",
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

export default function SentinelStackPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Sentinel-Stack" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 8 Master Orchestrator", "1-Click Zero-Prompt Install", "Topological DAG Compiler", "Ubuntu 24.04 / 26.04"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Deploy the Complete 6-Tier Active Defense Ecosystem in a Single Command.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">sentinel-stack — install.sh & master meta-orchestrator</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Build automation, dependency resolution, and deployment orchestration for the full ecosystem: toolchains,
            PEP 668 Python venvs, six native C++20/eBPF tiers in topological order, system-wide install, production
            systemd daemons — verified healthy before it returns.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View on GitHub ]
            </a>
            <Link href="#lifecycle-phases" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore 6-Phase Pipeline ]
            </Link>
            <Link href="#quickstart-runbook" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Run 1-Click Install Guide ]
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

      {/* ── 2. CHALLENGE ──────────────────────────────────────── */}
      <section id="challenge" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SectionHead kicker="// Deployment Challenge" title="Topological Compilation at Scale" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Manual Deployment Nightmare</p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-[1.8] text-muted">
                  <li>· Tier 2 fails — Tier 1 was never installed</li>
                  <li>· Tier 3 fails — xdp_filter.o was never built</li>
                  <li>· pip breaks on PEP 668 externally-managed systems</li>
                  <li>· Linker misses ldconfig; systemd misses capabilities</li>
                </ul>
                <p className="mt-2 font-mono text-[10px] text-muted">4+ hours of dependency debugging</p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Deterministic Meta-Installer</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  $ sudo ./install.sh → probe host → toolchains + venv → DAG build → ldconfig → systemd + RT caps →{" "}
                  <span className="text-kernel">6/6 smoke tests green</span>
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">Zero prompts · reproducible in minutes</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
              C++20 ABIs, eBPF bytecode, gRPC stubs, PyTorch daemons, pinned BPF filesystems, real-time capabilities —
              installed by hand, these deadlock in circles. Sentinel-stack encodes the whole topology as one deterministic
              execution graph.
            </p>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Deployment Challenge", href: "#challenge" },
                  { label: "6-Phase Lifecycle", href: "#lifecycle-phases" },
                  { label: "Dependency Engine", href: "#dependency-engine" },
                  { label: "Compilation DAG", href: "#compilation-dag" },
                  { label: "Systemd Daemons", href: "#systemd-daemons" },
                  { label: "Smoke Tests", href: "#smoke-tests" },
                  { label: "Matrix Bridge", href: "#matrix-bridge" },
                  { label: "Quickstart", href: "#quickstart-runbook" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Sentinel-Matrix", href: "/projects/sentinel-matrix", meta: "v1.0.0" },
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "Sentinel Nexus", href: "/projects/sentinel-nexus", meta: "v3.1.0" },
                ],
              },
            ]}
            cta={{ label: "View on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. PHASES ─────────────────────────────────────────── */}
      <section id="lifecycle-phases" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Installation Lifecycle" title="Phase 0 → Phase 5, No Prompts" />
        <div className="mt-6 space-y-0">
          {PHASES.map(([t, script, d], i, arr) => (
            <div key={t}>
              <div className="rounded-md border border-hairline bg-panel px-4 py-3.5">
                <p className="font-mono text-[11.5px] text-cyan">{t}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-telemetry">{script}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{d}</p>
              </div>
              {i < arr.length - 1 && <div className="mx-auto h-3 w-px bg-hairline" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. DEPENDENCY ENGINE ──────────────────────────────── */}
      <section id="dependency-engine" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Dependency Resolution" title="t64, PEP 668, Non-Interactive APT" />
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {[
            ["t64 package transition", "Ubuntu 24.04+ renamed runtimes (libprotobuf32t64…). Canonical -dev metapackages keep the installer version-agnostic across LTS and rolling releases."],
            ["PEP 668 venv", "Global pip is forbidden — everything ML lives in /opt/sentinel-stack/venv. forge-cli ships as a wrapper in /usr/local/bin with zero system pollution."],
            ["Non-interactive frontend", "DEBIAN_FRONTEND=noninteractive plus --force-confdef: kernel-header upgrades can never hang on an input prompt."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-display text-[14px] font-bold text-ink">{t}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. DAG ────────────────────────────────────────────── */}
      <section id="compilation-dag" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Topological Compilation DAG" title="xinfer → blackbox → sentinel → forge → lab → nexus" />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          Order is load-bearing: every tier consumes the previous tier&apos;s symbols and headers. Out-of-order builds
          are not retried — they are impossible by construction.
        </p>
        <div className="mt-6 space-y-0">
          {DAG.map(([t, d, f], i, arr) => (
            <div key={t}>
              <div className="rounded-md border border-hairline bg-panel px-4 py-3.5">
                <p className="font-mono text-[11.5px] text-cyan">{t}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{d}</p>
                <p className="mt-1 font-mono text-[10.5px] text-kernel">↓ {f}</p>
              </div>
              {i < arr.length - 1 && <div className="mx-auto h-3 w-px bg-hairline" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. SYSTEMD ────────────────────────────────────────── */}
      <section id="systemd-daemons" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Production Daemonization" title="Real-Time Units, Hardened Bounds" />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          No loose terminals: both daemons ship as systemd units with real-time scheduling, capability grants, and
          boot-time enablement.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <CodeViewer code={SENTINEL_UNIT} lang="ini" filename="blackbox-sentinel.service — SCHED_RR prio 80, BPF caps" note="Nice -10 · 64k FDs · restart always, 3s backoff." />
          <CodeViewer code={NEXUS_UNIT} lang="ini" filename="sentinel-nexus.service — fleet plane, 5s backoff" note="Own working dir + config root · restart always." />
        </div>
      </section>

      {/* ── 7. SMOKE TESTS ────────────────────────────────────── */}
      <section id="smoke-tests" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Verification Suite" title="6 of 6, or It Didn't Happen" />
        <div className="mt-6 max-w-3xl overflow-x-auto rounded-md border border-hairline bg-void/70">
          <div className="min-w-[560px] p-5 font-mono text-[11.5px] leading-[1.9]">
            <p className="text-cyan">SENTINEL-STACK: POST-INSTALLATION HEALTH VERIFICATION</p>
            {["Tier 1 libxinfer.so in linker cache", "Tier 2 libblackbox.so in linker cache", "Tier 3 sentinel daemon execution", "Tier 4 forge-cli responsiveness", "Tier 5 sentinel_lab execution", "Tier 6 sentinel-nexus + nexus-ctl CLI"].map((l) => (
              <p key={l} className="text-muted">[*] {l}… <span className="text-kernel">[PASS]</span></p>
            ))}
            <p className="mt-2 text-kernel">[+] 6 of 6 tiers nominal — compiled, linked, production-ready.</p>
          </div>
        </div>
      </section>

      {/* ── 8. MATRIX BRIDGE ──────────────────────────────────── */}
      <section id="matrix-bridge" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Cyber-Range Handover" title="Host Binaries → Matrix Containers" />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          The stack doubles as the range&apos;s build pipeline: <span className="font-mono text-[12.5px] text-ink">make init</span> harvests
          freshly compiled <span className="font-mono text-[12.5px] text-ink">sentinel-nexus</span>,{" "}
          <span className="font-mono text-[12.5px] text-ink">sentinel</span>, and{" "}
          <span className="font-mono text-[12.5px] text-ink">nexus-ctl</span> into{" "}
          <span className="font-mono text-[12.5px] text-ink">sentinel-matrix/shared/bin/</span>, bundling{" "}
          <span className="font-mono text-[12.5px] text-ink">libabsl_*</span>,{" "}
          <span className="font-mono text-[12.5px] text-ink">libre2.so.11</span>, and{" "}
          <span className="font-mono text-[12.5px] text-ink">libgrpc++</span> into{" "}
          <span className="font-mono text-[12.5px] text-ink">shared/lib/</span> — containers boot with zero missing .so.
        </p>
        <div className="mt-4">
          <Link href="/projects/sentinel-matrix" className="inline-block rounded-md border border-cyan/50 px-5 py-3 font-mono text-[11.5px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10">
            [ Enter the Matrix Range → ]
          </Link>
        </div>
      </section>

      {/* ── 9. QUICKSTART ─────────────────────────────────────── */}
      <section id="quickstart-runbook" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Developer Quickstart" title="Install, Update, Verify, Remove" />
        <div className="mt-6 max-w-3xl">
          <CodeViewer code={QUICKSTART} lang="bash" filename="terminal — 1-click install, Makefile ops, clean removal" note="Kernel update? sudo make update rebuilds xdp_filter.o against new headers." />
        </div>
      </section>

      {/* ── 10. FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Technical FAQ" title="Offline, OOM, Uninstall, Kernels" />
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
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Deploy the Stack"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Deploy the Complete Active Defense Stack in Seconds
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            No deadlocks, no linker roulette — six tiers built, linked, and daemonized by verified automation. This
            concludes the 8-project ecosystem: runtimes, appliances, learning, lab, command, range, and the installer
            binding them together.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Clone sentinel-stack on GitHub ]
            </a>
            <Link href="/technology/stack" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Master Documentation ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact Systems Team ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">github.com/kamisaberi/sentinel-stack · aryorithm.com/technology/stack · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
