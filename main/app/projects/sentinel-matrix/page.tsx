import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";

export const metadata: Metadata = {
  title: "Sentinel-Matrix — Autonomous Cyber-Physical Range | Aryorithm",
  description:
    "sentinel-matrix: encapsulated VMware cyber-range on 10.240.0.0/24 with 7-channel OmniFlow traffic, real malware PCAP replay, live red-team adversary and closed-loop AI retraining.",
};

const GITHUB_URL = "https://github.com/kamisaberi/sentinel-matrix";

const KPI_STRIP = [
  { metric: "7 Channels", label: "Multi-Modal Wire", desc: "SCADA, video & bots" },
  { metric: "0.84 µs SLA", label: "Verified In-Kernel", desc: "Driver mitigation" },
  { metric: "< 50 ms", label: "Collective Defense", desc: "Fleet-wide fanout" },
  { metric: "10.240.0.0/24", label: "Isolated VMware", desc: "Collision-free grid" },
];

const GRID_NODES: [string, string, string][] = [
  ["matrix-nexus", "10.240.0.10", "50051 · 9443 · 9444"],
  ["matrix-forge", "10.240.0.20", "PyTorch MAE · gate · stager"],
  ["traffic-gen", "10.240.0.50", "OmniFlow 7 channels"],
  ["adversary", "10.240.0.99", "nmap · curl · mbpoll"],
  ["edge-01 (OT)", "10.240.0.101", "OpenVINO · Modbus/DNP3"],
  ["edge-02 (PACS)", "10.240.0.102", "TensorRT · DICOM/HL7"],
  ["edge-03 (REF)", "10.240.0.103", "RKNN · PROFINET/S7"],
];

const OMNIFLOW: [string, string, string, string][] = [
  ["Ch 1 · SCADA / OT", "Industrial control", "18_cps_sec", "Modbus FC03/FC05 + DNP3 · coil overrides (T0855)"],
  ["Ch 2 · Edge Vision", "Optical + thermal", "YOLOv8 / UltraFace", "30 FPS tensors · intrusions + thermal spikes"],
  ["Ch 3 · Web & API", "L7 + bot traffic", "05_waf · 10_bad", "SQLi, BOLA/IDOR · linear mouse kinematics"],
  ["Ch 4 · Identity", "Access governance", "12_itdr · 14_ato", "Kerberos abuse (T1208) · impossible travel"],
  ["Ch 5 · Host / Syscall", "Endpoint + container", "07_epp_ngav · 09_cwpp", "sys_enter breakouts · 7.95-bit entropy bufs"],
  ["Ch 6 · Med / IoT", "Specialized streams", "17_iot_sec", "DICOM/HL7 · MAVLink waypoint spoofing"],
  ["Ch 7 · NetFlow Blast", "Active-learning feed", "01_siem · 04_ids_ips", "32-dim vectors · uncertainty 0.40–0.60"],
];

const PCAP_ARSENAL: [string, string, string, string][] = [
  ["Industroyer / CrashOverride", "IEC-104 :2404", "Edge-Substation-01", "T0855 · APDU-45 breaker-trip execution"],
  ["Triton / Trisis", "TriStation :19999", "Edge-Hospital-PACS-02", "T0843 · safety-memory overwrite"],
  ["Stuxnet", "S7Comm :102", "Edge-Refinery-PLC-03", "T0831 · centrifuge frequency tamper"],
];

const ADVERSARY_MODES: [string, string, string][] = [
  ["Mode 1 · Ambient wire", "curl → :8443 · mbpoll registers 1–4 @ 2s cadence", "Baseline chatter the detectors must ignore"],
  ["Mode 2 · Recon sweep (T1046)", "nmap -sS -Pn -p 80,443,502,102,2404 10.240.0.101", "Watch ports flip open → filtered in real time"],
  ["Mode 3 · Coil override (T0855)", "mbpoll -m tcp -a 1 -r 105 -t 0 … 1", "Module 18 drops the forced write, Nexus alerted"],
  ["Mode 4 · API abuse (T1190)", "curl burst: stuffing + traversal on :8443", "WAF + bot defense kernel-block the source"],
];

const MAKEFILE_SESSION = `# ============================================================
# 1. GRID LIFECYCLE & CORE OPS
# ============================================================
make init               # shared folders, certs, host lib bundle
make build              # all images: Nexus, Sentinel, Forge, Adversary
sudo make up            # launch the 8-node mesh in background
sudo make down          # graceful stop + dismantle
sudo make restart       # full clean restart
make status             # container health + IP bindings
make logs               # stream logs from all containers

# ============================================================
# 2. OBSERVABILITY
# ============================================================
make tui                # split-panel terminal UI (nodes + MITRE + XAI)
make adversary-logs     # live red-team node output

# ============================================================
# 3. LIVE ADVERSARY (10.240.0.99)
# ============================================================
make live-nmap          # TCP SYN discovery sweep (T1046)
make live-scada         # Modbus FC05 coil override (T0855)
make live-api           # high-velocity HTTP abuse (T1190)

# ============================================================
# 4. HISTORICAL PCAP REPLAY
# ============================================================
make download-pcaps     # genuine captures: Nozomi, CISA, universities
make attack-real-triton # Nozomi TRITON / Trisis capture
make attack-real-modbus # Univ. Illinois Modbus SCADA capture
make attack-real-s7     # Siemens S7Comm memory capture
make attack-real-dnp3   # Univ. Illinois DNP3 substation capture
make attack-real-iec104 # IEC 60870-5-104 telecontrol capture

# ============================================================
# 5. OFFLINE GENERATION (zero-network)
# ============================================================
make generate-pcaps     # local binary captures, no internet
make attack-industroyer # IEC-104 breaker-trip replay
make attack-triton      # TriStation safety override
make attack-stuxnet     # S7Comm frequency tamper

# ============================================================
# 6. CHAOS ENGINEERING
# ============================================================
make chaos-latency      # SLA breach (>1000us) -> rollback proof
make chaos-sever        # sever Node 01 -> 0ms disconnect proof`;

const FAQS = [
  {
    id: "matrix-faq-subnet",
    badge: "Q.01",
    title: "Why 10.240.0.0/24 instead of Docker defaults?",
    body: "Docker's 172.17–172.31 pools collide with VMware's VMnet1/VMnet8 adapters (Pool overlaps error). The pinned 10.240.0.0/24 block routes cleanly everywhere.",
  },
  {
    id: "matrix-faq-devel",
    badge: "Q.02",
    title: "Why ubuntu:devel instead of ubuntu:24.04?",
    body: "Host binaries built on Ubuntu 26.04 link glibc 2.43; stock 24.04 ships 2.39 and fails at startup. The devel image matches the host ABI — or use make init's harvested lib bundle.",
  },
  {
    id: "matrix-faq-raw",
    badge: "Q.03",
    title: "How do raw scans stay contained?",
    body: "The adversary carries NET_ADMIN on the dedicated sentinel-grid-net bridge only, firing at 10.240.0.101–103. Host physical adapters never see a packet.",
  },
  {
    id: "matrix-faq-wireshark",
    badge: "Q.04",
    title: "Can captures open in Wireshark?",
    body: "Yes — configs/pcaps/ and configs/pcaps/downloaded/ are standard captures (magic 0xa1b2c3d4): Modbus, IEC-104, S7Comm, and TriStation headers inspectable.",
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

export default function SentinelMatrixPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Sentinel-Matrix" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 7 Cyber-Range", "VMware-Optimized", "OmniFlow 7-Channel Engine", "Live Adversary Node"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            The Autonomous Cyber-Physical Range. Multi-Modal Traffic. Real Malware PCAPs. Live In-Kernel Drops.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">sentinel-matrix — encapsulated digital twin & cyber-range mesh</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Nexus, Forge, a live red-team adversary (10.240.0.99), and heterogeneous edge appliances looping forever on an
            isolated 10.240.0.0/24 subnet — ambient NetFlow, nmap sweeps, authentic SCADA malware replays, and
            self-improving neural hot-reloads.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View on GitHub ]
            </a>
            <Link href="#omniflow-engine" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore 7 OmniFlow Channels ]
            </Link>
            <Link href="#quickstart-runbook" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Launch VMware Range Guide ]
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

      {/* ── 2. IMPERATIVE ─────────────────────────────────────── */}
      <section id="imperative" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SectionHead kicker="// The Cyber-Range Imperative" title="Mock Scripts Can't Test Kernel Physics" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Mock Simulators</p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-[1.8] text-muted">
                  <li>· Python sleeps, static JSON — zero real packets</li>
                  <li>· No socket contention, no memory pressure</li>
                  <li>· XDP hooks, ring buffers, raw drops untestable</li>
                </ul>
                <p className="mt-2 font-mono text-[10px] text-muted">Great on paper — collapses at wire speed</p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Sentinel-Matrix Twin</p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-[1.8] text-muted">
                  <li>· Real C++20 daemons + BPF bytecode in containers</li>
                  <li>· Live handshakes, sweeps, Modbus CLI on virtual wire</li>
                  <li>· Byte-for-byte Industroyer / Triton / S7Comm replays</li>
                </ul>
                <p className="mt-2 font-mono text-[10px] text-muted">Real packets · real drops · real-time XAI</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
              Sub-microsecond defense must be validated against socket contention, SYN-scan connection freezes, and PLC
              jitter under Modbus/PROFINET inspection. Matrix runs the identical binaries, libraries, and eBPF bytecode
              as 1U hardware — encapsulated in a private, reproducible virtual network.
            </p>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Range Imperative", href: "#imperative" },
                  { label: "10.240.0.0/24 Subnet", href: "#hypervisor-subnet" },
                  { label: "OmniFlow Engine", href: "#omniflow-engine" },
                  { label: "PCAP Arsenal", href: "#pcap-arsenal" },
                  { label: "Red-Team Node", href: "#adversary-node" },
                  { label: "Observability", href: "#observability" },
                  { label: "AI Flywheel", href: "#ai-flywheel" },
                  { label: "Chaos Engineering", href: "#chaos-engineering" },
                  { label: "Runbook", href: "#quickstart-runbook" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "Sentinel Nexus", href: "/projects/sentinel-nexus", meta: "v3.1.0" },
                  { label: "xInfer Forge", href: "/projects/xinfer-forge", meta: "v1.4.0" },
                ],
              },
            ]}
            cta={{ label: "View on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. SUBNET ─────────────────────────────────────────── */}
      <section id="hypervisor-subnet" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Hypervisor Encapsulation" title="One Bridge. Seven Containers. Zero Collisions." />
        <div className="mt-6 rounded-md border border-hairline bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">VMware guest → docker bridge sentinel-grid → 10.240.0.0/24</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {GRID_NODES.map(([name, ip, ports]) => (
              <div key={name} className={`rounded border px-3 py-2.5 font-mono text-[11px] ${name === "adversary" ? "border-threat/50" : "border-hairline"}`}>
                <p className={name === "adversary" ? "text-threat" : "text-cyan"}>{name}</p>
                <p className="mt-1 text-ink">{ip}</p>
                <p className="mt-0.5 text-[10px] text-muted">{ports}</p>
              </div>
            ))}
            <div className="rounded border border-dashed border-muted/40 px-3 py-2.5 font-mono text-[11px]">
              <p className="text-muted">edge fleet expands</p>
              <p className="mt-1 text-ink">10.240.0.101 – 103…</p>
              <p className="mt-0.5 text-[10px] text-muted">OT · PACS · Refinery twins</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {[
            ["Collision-free subnet", "VMware VMnet1/VMnet8 squat on Docker's 172.16/12 ranges. The pinned 10.240.0.0/24 never overlaps."],
            ["Generic SKB mode", "vmxnet3/veth lack hardware XDP — containers attach with NET_ADMIN + BPF for sub-µs virtual drops."],
            ["ABI harvesting", "make init grafts host libabsl/libre2/libgrpc into /usr/local/lib/matrix-deps — no glibc mismatch."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-display text-[14px] font-bold text-ink">{t}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. OMNIFLOW ───────────────────────────────────────── */}
      <section id="omniflow-engine" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// OmniFlow Traffic Engine" title="7 Threads. 7 Modalities. 26 Modules Fed." />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[820px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Modality</th>
                <th className="px-4 py-3">Sentinel Target</th>
                <th className="px-4 py-3">Payload Dynamics</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {OMNIFLOW.map(([ch, mod, tgt, pay]) => (
                <tr key={ch} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-[11px] text-cyan">{ch}</td>
                  <td className="px-4 py-3 text-ink">{mod}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-kernel">{tgt}</td>
                  <td className="px-4 py-3 text-muted">{pay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. PCAP ARSENAL ───────────────────────────────────── */}
      <section id="pcap-arsenal" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Malware PCAP Replay" title="Industroyer · Triton · Stuxnet, Byte-for-Byte" />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          Offline generator for air-gapped enclaves plus a live downloader resolving Git LFS pointers from Nozomi, CISA,
          and university testbeds — streamed at microsecond-precise rates with parallel Nexus telemetry.
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {PCAP_ARSENAL.map(([name, proto, target, obj]) => (
            <div key={name} className="rounded-md border border-threat/30 bg-panel p-5">
              <p className="font-display text-[15px] font-bold text-ink">{name}</p>
              <p className="mt-1 font-mono text-[10.5px] text-telemetry">{proto}</p>
              <p className="mt-2 font-mono text-[11px] text-cyan">{target}</p>
              <p className="mt-2 text-[12px] leading-[1.8] text-muted">{obj}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. ADVERSARY ──────────────────────────────────────── */}
      <section id="adversary-node" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Live Red-Team Node" title="10.240.0.99 Fires Real Packets" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ADVERSARY_MODES.map(([t, cmd, res]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[11px] text-threat">{t}</p>
              <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-ink">{cmd}</p>
              <p className="mt-2 text-[12px] leading-[1.8] text-muted">{res}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. OBSERVABILITY ──────────────────────────────────── */}
      <section id="observability" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Dual Observability" title="TUI Density + Web Canvas" />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline bg-void/70">
          <div className="min-w-[680px] p-5 font-mono text-[11.5px] leading-[1.9]">
            <p className="text-cyan">APPLIANCES — NODE-8fa901 ONLINE 14.2% 48 drops 0.84µs · NODE-c34b12 ONLINE 18.7% 35 drops 0.79µs · NODE-77e190 ONLINE 11.5% 29 drops 0.88µs</p>
            <p className="mt-2 text-muted">MITRE — T0855 ×14 · T0843 ×3 · T0831 ×6 · T1071 ×8 · T1046 ×22</p>
            <p className="mt-2 text-ink">XAI 198.51.100.45 T0855 0.84µs <span className="text-muted">— FC 0x05 vs 0x03 · 184.2Hz vs 18.4Hz · Reg 105 vs 0–100</span></p>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-[13px] leading-[1.8] text-muted">
          <span className="text-ink">make tui</span> for the split terminal · <span className="text-ink">localhost:9443</span> for the air-gapped
          canvas — radial topology, XAI cards, and 1-click fleet quarantine purges.
        </p>
      </section>

      {/* ── 8. FLYWHEEL ───────────────────────────────────────── */}
      <section id="ai-flywheel" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Closed-Loop Retraining" title="Edge → Nexus → Forge → Canary → Edge" />
        <div className="mt-6 grid gap-3 font-mono text-[11.5px] lg:grid-cols-5">
          {[
            ["1 · Extract", "Uncertainty 0.40–0.60 vectors stream over gRPC"],
            ["2 · Curate", "forge_dataset_*.csv lands in /shared/datasets/"],
            ["3 · Adapt", "MAE 50 epochs → 100% golden gate → Opset 17"],
            ["4 · Canary", "SHADOW → 5% → FLEET_WIDE progression"],
            ["5 · Hot-reload", "SHA-256 verified, < 1ms, zero frames lost"],
          ].map(([t, d], i, arr) => (
            <div key={t} className="relative rounded-md border border-hairline bg-panel p-4">
              <p className="text-cyan">{t}</p>
              <p className="mt-2 leading-relaxed text-muted">{d}</p>
              {i < arr.length - 1 && <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-cyan lg:inline">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. CHAOS ──────────────────────────────────────────── */}
      <section id="chaos-engineering" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Chaos Engineering" title="Prove Resilience, Don't Assert It" />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-threat/40 bg-panel p-5">
            <p className="font-mono text-[11px] text-threat">$ make chaos-latency</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">Degrades inference to 1,650µs against the 1,000µs limit. RollbackGuard flags the emergency, purges the candidate, and reverts the fleet in milliseconds.</p>
          </div>
          <div className="rounded-md border border-telemetry/40 bg-panel p-5">
            <p className="font-mono text-[11px] text-telemetry">$ make chaos-sever</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">Kills Node 01 mid-stream; its SIGINT DeregistrationRequest flips the UI ONLINE → OFFLINE in 0ms — no 15s timeout.</p>
          </div>
        </div>
      </section>

      {/* ── 10. RUNBOOK ───────────────────────────────────────── */}
      <section id="quickstart-runbook" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Operations Runbook" title="One Makefile, Full Mesh Control" />
        <div className="mt-6 max-w-4xl">
          <CodeViewer code={MAKEFILE_SESSION} lang="bash" filename="Makefile — lifecycle, observability, adversary, replay, chaos" note="Lifecycle → monitoring → live attacks → historical replay → fault injection, top to bottom." />
        </div>
      </section>

      {/* ── 11. FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Technical FAQ" title="Subnets, glibc, Containment, Wireshark" />
        <div className="mt-6 max-w-3xl space-y-3">
          {FAQS.map((f, i) => (
            <Accordion key={f.id} id={f.id} badge={f.badge} title={f.title} defaultOpen={i === 0}>
              <p className="text-[13px] leading-[1.85] text-muted">{f.body}</p>
            </Accordion>
          ))}
        </div>
      </section>

      {/* ── 12. CTA ───────────────────────────────────────────── */}
      <section id="cta" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 pb-16 pt-4 lg:px-8">
        <div className="rounded-md border border-cyan/30 bg-panel px-6 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Launch Your Twin"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Launch the Full Cyber-Range Digital Twin in Minutes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Sub-microsecond in-kernel defense, live adversary tooling, and closed-loop neural adaptation — encapsulated
            in one virtual environment.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Clone sentinel-matrix on GitHub ]
            </a>
            <Link href="/technology/matrix" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Operations Manual ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact Systems Team ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">github.com/kamisaberi/sentinel-matrix · aryorithm.com/technology/matrix · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
