import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";
import NexusTerminal from "@/components/simulations/NexusTerminal";
import TopologyCanvas from "@/components/simulations/TopologyCanvas";

export const metadata: Metadata = {
  title: "Sentinel Nexus — Fleet Command Plane | Aryorithm",
  description:
    "Sentinel Nexus: C++20 fleet command plane coordinating 5,000 edge appliances with sub-50ms collective immunity, canary OTA, XAI aggregation and 4-tier topology.",
};

const GITHUB_URL = "https://github.com/kamisaberi/sentinel-nexus";

const KPI_STRIP = [
  { metric: "< 50 ms", label: "Collective Defense", desc: "Fleet-wide fanout" },
  { metric: "5,000 Nodes", label: "Maximum Coordinated", desc: "Edge appliances" },
  { metric: "< 80 ns", label: "Real-Time XAI Field", desc: "Attribution latency" },
  { metric: "100%", label: "Air-Gapped Sovereign", desc: "Zero-CDN architecture" },
];

const TIMELINE: [string, string][] = [
  ["T + 0.00 µs", "Exploit packet hits Edge Node 01 physical interface."],
  ["T + 0.84 µs", "Node 01 eBPF/XDP filter drops packet; local BPF map updated."],
  ["T + 2.10 ms", "Node 01 emits ThreatIndicator over persistent gRPC stream."],
  ["T + 4.50 ms", "IocBroadcaster records threat in GlobalThreatCache + MITRE aggregator."],
  ["T + 6.20 ms", "FleetDefenseRule (RULE-EBPF-xxxx) generated with ephemeral TTL."],
  ["T + 12.4 ms", "Parallel dispatch across active gRPC streams to Nodes 02–5000."],
  ["T + 38.4 ms", "Hospital PACS + Refinery PLC nodes receive the rule."],
  ["T + 38.9 ms", "Nodes call bpf_map_update_elem() on local blocked_ip_map."],
];

const CLI_SESSION = `# ----------------------------------------------------------------
# 1. FLEET INSPECTION
# ----------------------------------------------------------------
$ nexus-ctl fleet list
NODE ID         SITE                    STATUS    CPU %    DROPS    SLA
NODE-8fa901     PowerGrid-North-01      ONLINE    14.2%    48       0.84 us
NODE-c34b12     Metro-General-Hospital  ONLINE    18.7%    35       0.79 us
NODE-77e190     Coastal-Refinery-ZoneB  ONLINE    11.5%    29       0.88 us

# ----------------------------------------------------------------
# 2. COLLECTIVE DEFENSE INJECTION
# ----------------------------------------------------------------
$ nexus-ctl threat drop 198.51.100.45
[+] eBPF drop rule for 198.51.100.45 across 3 appliances in 38.4ms.

# ----------------------------------------------------------------
# 3. COMPLIANCE AUDITING
# ----------------------------------------------------------------
$ nexus-ctl report cmmc
[PASS] AC.L2-3.1.1 Authorized access control & node identity
[PASS] IA.L2-3.5.1 Hardware auth rooted in TPM 2.0
[PASS] SI.L2-3.14.1 Sub-millisecond mitigation SLA (< 1000 us)
Compliance Score: 100.0% (all controls satisfied)

$ nexus-ctl report scada
[PASS] FR 3 System integrity & SCADA constraint validation
[PASS] FR 5 Segmentation & micro-zone boundary protection

# ----------------------------------------------------------------
# 4. MODEL OTA LIFECYCLE
# ----------------------------------------------------------------
$ nexus-ctl ota status     # current rollout stage
$ nexus-ctl ota stage      # candidate weights -> SHADOW_MODE
$ nexus-ctl ota advance    # Shadow -> 5% canary -> fleet-wide
$ nexus-ctl ota rollback   # immediate emergency rollback`;

const COMPLIANCE = [
  {
    n: "01", title: "CMMC 2.0 L2 & NIST SP 800-171",
    lines: [
      "SI.L2-3.14.1 — log proof of 0.84µs driver-ring drops before socket creation.",
      "IA.L2-3.5.1 — TPM 2.0 endorsement keys + signed PCR 0/4 quotes.",
    ],
  },
  {
    n: "02", title: "IEC 62443-3-3 & 62443-4-2",
    lines: [
      "FR 5 — line-rate SIS/BPCS inspection with zero operational jitter.",
      "FR 6 — tamper-evident logs binding drops to XAI deviations.",
    ],
  },
  {
    n: "03", title: "EU NIS2 Directive",
    lines: [
      "Article 21 — sovereign on-premise handling, verified sub-ms, $0 egress.",
    ],
  },
];

const FAQS = [
  {
    id: "nexus-faq-scale",
    badge: "Q.01",
    title: "How does Nexus scale to 5,000 appliances?",
    body: "Three optimizations: gRPC HTTP/2 multiplexing over long-lived pipelined connections (no per-message handshake), lock-free state with read-heavy shared_mutex lookups and atomic metrics, and decoupled pinned thread pools so packet intake, persistence, and browser streaming never block each other.",
  },
  {
    id: "nexus-faq-restart",
    badge: "Q.02",
    title: "What happens if Nexus loses power or restarts?",
    body: "Identities, drop counts, and compliance history journal continuously to data/nexus_state.json. On boot Nexus restores every known appliance and resumes heartbeat evaluation — no manual re-enrollment.",
  },
  {
    id: "nexus-faq-saas",
    badge: "Q.03",
    title: "Can Nexus run in cloud while appliances stay on-premise?",
    body: "Yes, via the SaaSConnector: Nexus runs managed (app.aryorithm.com) while appliances dial out over encrypted mTLS, streaming only anonymized telemetry. Local sub-microsecond dropping never depends on the cloud path.",
  },
  {
    id: "nexus-faq-fp",
    badge: "Q.04",
    title: "How are false positives contained grid-wide?",
    body: "Unblocking an IP — via Web UI or nexus-ctl — broadcasts an emergency purge frame (emergency_purge: true). Every appliance evicts the entry from blocked_ip_map in under 50ms.",
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

export default function SentinelNexusPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Sentinel Nexus" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 6 Command Plane", "Distributed Collective Defense", "Sub-50ms Fleet Fanout", "Zero-CDN Air-Gapped SPA"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Synchronized Fleet Active Defense. 5,000 Edge Appliances. Sub-50ms Global Immunity.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">sentinel-nexus — enterprise fleet command plane & collective defense grid</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The native C++20 command plane for the Blackbox Sentinel ecosystem. Telemetry from 5,000 appliances across
            substations, hospitals, plants, and vessels becomes one sovereign Collective Defense Grid — eBPF drop rules
            propagating fleet-wide in under 50 milliseconds.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View on GitHub ]
            </a>
            <Link href="#collective-defense" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore Collective Defense Architecture ]
            </Link>
            <Link href="#operations-cli" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Technical Runbook ]
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
            <SectionHead kicker="// The Enterprise Fleet Dilemma" title="Fragmented Sensors vs. Cloud Latency" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Multi-Site Cloud Bottleneck</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Plant A zero-day → cloud lake ingest (15–60s) → SOC ticket (15 min) → Plants B & C still exposed{" "}
                  <span className="text-threat">[ Sister sites fall before rules propagate ]</span>
                </p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Nexus Collective Grid</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Plant A drops in-kernel → ThreatIndicator → sub-50ms gRPC broadcast → Plants B & C inject eBPF map{" "}
                  <span className="text-kernel">[ Immune enterprise-wide in &lt; 50ms ]</span>
                </p>
              </div>
            </div>
            <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
              <p>
                <span className="text-ink">Isolated edge islands</span> let one probed substation become the rehearsal for
                attacks on every sister facility. <span className="text-ink">Cloud backhaul</span> burns WAN bandwidth,
                breaks sovereignty (NIS2, GDPR, HIPAA), and hands automated scripts whole networks while analysts wait.
              </p>
              <p>
                Nexus is the synthesis: sub-microsecond execution stays at the edge; sub-50ms intelligence synchronizes
                across the enterprise.
              </p>
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Fleet Dilemma", href: "#dilemma" },
                  { label: "Command Core", href: "#command-core" },
                  { label: "Collective Defense", href: "#collective-defense" },
                  { label: "Forge Pipeline", href: "#forge-pipeline" },
                  { label: "Canary OTA", href: "#canary-ota" },
                  { label: "XAI Aggregator", href: "#xai-aggregator" },
                  { label: "Asset Topology", href: "#asset-topology" },
                  { label: "Command Center", href: "#command-center" },
                  { label: "Operations CLI", href: "#operations-cli" },
                  { label: "Compliance", href: "#compliance" },
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
            cta={{ label: "View on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. COMMAND CORE ───────────────────────────────────── */}
      <section id="command-core" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Distributed Architecture" title="One Core, Three Planes, Six State Engines" />
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {[
            ["gRPC Multi-Service · :50051", "FleetService heartbeats · TelemetryService vectors · IntelligenceService IoCs · ModelOtaService canary", "mTLS streams from 5,000 appliances"],
            ["Embedded HTTP Router · :9443", "Fleet & group controllers · Threat & XAI controllers · OTA binary serving · CMMC/IEC audits", "Browser + ForgeBridge surface"],
            ["SSE Streamer · :9444", "Telemetry push · sub-10ms drop alerts · node-state + topology events", "Real-time browser firehose"],
          ].map(([t, d, f]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[11px] text-cyan">{t}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{d}</p>
              <p className="mt-2 font-mono text-[10.5px] text-kernel">{f}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["NodeRegistry — live health matrix", "GlobalThreatCache — MITRE taxonomy", "IocBroadcaster — parallel dispatcher", "CanaryOrchestrator — staged progression", "RollbackGuard — sub-ms SLA monitor", "StateDatabase — JSON audit journal"].map((s) => (
            <div key={s} className="rounded border border-hairline bg-void/60 px-4 py-3 font-mono text-[11.5px] text-muted">{s}</div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl font-mono text-[11.5px] leading-[1.9] text-muted">
          Below the engines: ForgeBridge vector buffer → DatasetCurator CSV sets → ForgeTrigger retraining daemon.
        </p>
      </section>

      {/* ── 4. COLLECTIVE DEFENSE ───────────────────────────────── */}
      <section id="collective-defense" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Collective Defense Engine" title="Attacked Once, Immune Everywhere" />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[640px] border-collapse bg-panel text-left">
            <tbody className="font-mono text-[11.5px]">
              {TIMELINE.map(([t, d], i) => (
                <tr key={t} className={`border-b border-hairline/60 last:border-0 ${i === TIMELINE.length - 1 ? "bg-kernel/[0.06]" : ""}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-cyan">{t}</td>
                  <td className="px-4 py-2.5 text-muted">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[11.5px] text-kernel">RESULT — attacker IP blocked grid-wide in 38.9 ms (&lt; 50.0 ms SLA)</p>
        <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
          <h3 className="font-display text-[15px] font-bold text-ink">Originator suppression — no egress loops</h3>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-[1.8] text-muted">
            IocBroadcaster tracks the reporting node and fans out to everyone <span className="text-ink">except</span> Node #01 —
            it already dropped locally. No redundant loops, no local race conditions, less bus bandwidth.
          </p>
        </div>
      </section>

      {/* ── 5. FORGE PIPELINE ─────────────────────────────────── */}
      <section id="forge-pipeline" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Active Learning Pipeline" title="Uncertainty In, Curated Datasets Out" />
        <div className="mt-6 rounded-md border border-hairline bg-panel p-5 font-mono text-[11.5px] leading-[2] text-muted">
          <p><span className="text-cyan">Edge filter</span> — only vectors in the uncertainty band [0.40 ≤ p ≤ 0.60] or high recon-loss leave the appliance</p>
          <p><span className="text-cyan">StreamCandidateVectors</span> → VectorIngestQueue (200k) → flush at 1,000 → candidate_batch_*.bin</p>
          <p><span className="text-cyan">DatasetCurator</span> — forge_dataset_1774998000.csv · 2,500 vectors · 520 uncertain · 84 kernel drops · 32 features</p>
          <p><span className="text-cyan">ForgeTrigger</span> — launches the xinfer-forge adaptation cycle on the curated set</p>
        </div>
        <p className="mt-4 max-w-3xl text-[13px] leading-[1.8] text-muted">
          Gigabytes of redundant benign traffic never cross the WAN — the learning loop runs on uncertainty alone.
        </p>
      </section>

      {/* ── 6. CANARY OTA ─────────────────────────────────────── */}
      <section id="canary-ota" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Staged Rollouts + RollbackGuard" title="Shadow → 5% → Fleet. Purge on Breach." />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-cyan/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">Stage 1 · Shadow mode</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">HTTP pull, SHA-256 verified, passive scoring beside stable v1 — zero drops enforced. 24h stability check.</p>
          </div>
          <div className="rounded-md border border-telemetry/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-telemetry">Stage 2 · 5% canary cohort</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">Deterministic 5% hash cohort enforces real drops while RollbackGuard watches latency. 48h validation.</p>
          </div>
          <div className="rounded-md border border-kernel/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Stage 3 · Fleet-wide promote</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">100% of appliances auto-pull with zero-downtime hot-reload.</p>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-threat/40 bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">RollbackGuard trip wires</p>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-[1.8] text-muted">
            Mean mitigation latency above 1,000µs <span className="text-ink">or</span> a 5× drop surge (false-positive cascade) →
            candidate purged, fleet reverted to stable in milliseconds, zero downtime maintained.
          </p>
        </div>
      </section>

      {/* ── 7. XAI ────────────────────────────────────────────── */}
      <section id="xai-aggregator" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// XAI Attribution Aggregator" title="MRD Vectors Auditors Can Read" />
        <div className="mt-6 max-w-3xl rounded-md border border-hairline bg-void/70 p-5 font-mono text-[11.5px] leading-[1.9]">
          <p className="text-muted">Target <span className="text-threat">198.51.100.45</span> · T0855 Unauthorized Command · 0.84µs XDP_DROP · conf 0.992</p>
          <p className="mt-2 text-ink">#1 [54.2%] SCADA_Function_Code <span className="text-muted">— obs 0x05 force-coil · base 0x03 read-only · valve-manipulation attempt</span></p>
          <p className="text-ink">#2 [28.1%] Forward_Packet_Rate <span className="text-muted">— obs 184.2 Hz · base 18.4 Hz · 10× injection velocity</span></p>
          <p className="text-ink">#3 [14.8%] SCADA_Register_Address <span className="text-muted">— obs 105 cooling-valve · base 0–100 sensor zone · restricted actuation</span></p>
        </div>
        <p className="mt-3 max-w-3xl text-[13px] leading-[1.8] text-muted">Streamed to Web UI, terminal TUI, and compliance exports in real time.</p>
      </section>

      {/* ── 8. TOPOLOGY ───────────────────────────────────────── */}
      <section id="asset-topology" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// 4-Tier Asset Topology" title="Tenant → Nexus → Node → Sensor" />
        <div className="mt-6 grid gap-3 font-mono text-[11.5px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["LEVEL 0 · Tenant", "EuroGrid Energy Group", "Account scope + RBAC"],
            ["LEVEL 1 · Nexus", "NEXUS-AMSTERDAM-01 · NEXUS-HELSINKI-02", "Regional hubs"],
            ["LEVEL 2 · Appliances", "NODE-8fa901 (0.84µs) · NODE-c34b12 (0.79µs)", "OpenVINO / TensorRT"],
            ["LEVEL 3 · Sensors", "PLC-…-UNIT1 · COIL-105 · CAM-CH01", "Deterministic asset IDs"],
          ].map(([t, d, f]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-4">
              <p className="text-cyan">{t}</p>
              <p className="mt-2 leading-relaxed text-ink">{d}</p>
              <p className="mt-1 text-muted">{f}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {[
            ["Nexus down 30s", "OFFLINE gray — children UNREACHABLE, no false site alarms."],
            ["Appliance silent", "ONLINE → OFFLINE red — its sensors go SILENT orange."],
            ["Sensor quiet", "Parent stays ONLINE — asset flagged FAULT_NO_DATA amber."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-4">
              <p className="font-mono text-[11px] text-kernel">{t}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. COMMAND CENTER ─────────────────────────────────── */}
      <section id="command-center" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Air-Gapped Command Center" title=":9443 REST · :9444 SSE · Zero CDN" />
        <div className="mt-6">
          <TopologyCanvas />
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-hairline bg-void/70">
          <div className="min-w-[680px] p-5 font-mono text-[11.5px] leading-[1.9]">
            <p className="text-cyan">NEXUS [Central Europe] [3/3 ONLINE] [eBPF 0.84µs] [AIR-GAP: VERIFIED]</p>
            <p className="mt-2 text-muted">FLEET — 3 online · 1,482 kernel drops · 12 curated batches · model v2.4 FLEET_WIDE · egress $0.00</p>
            <p className="mt-2 text-muted">MITRE — [T0855 ×14] [T1071 ×6] [T1190 ×22] [T1110 ×8]</p>
            <p className="mt-2 text-ink">XAI 198.51.100.45 · T0855 · 0.84µs <span className="text-muted">— FC 0x05 vs 0x03 · 184.2Hz vs 18.4Hz · Reg 105 vs 0–100</span></p>
          </div>
        </div>
      </section>

      {/* ── 10. CLI ───────────────────────────────────────────── */}
      <section id="operations-cli" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Operations CLI" title="nexus-ctl Runbook + Live Sandbox" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <CodeViewer code={CLI_SESSION} lang="bash" filename="runbook — fleet, threat, compliance, OTA lifecycle" note="fleet list · threat drop (38.4ms fanout) · report cmmc/scada · ota status/stage/advance/rollback." />
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Try it — interactive sandbox</p>
            <NexusTerminal />
          </div>
        </div>
      </section>

      {/* ── 11. COMPLIANCE ────────────────────────────────────── */}
      <section id="compliance" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Automated Compliance Auditing" title="CMMC · NIST · IEC 62443 · NIS2" />
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

      {/* ── 12. FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Technical FAQ" title="Scale, Restarts, SaaS, False Positives" />
        <div className="mt-6 max-w-3xl space-y-3">
          {FAQS.map((f, i) => (
            <Accordion key={f.id} id={f.id} badge={f.badge} title={f.title} defaultOpen={i === 0}>
              <p className="text-[13px] leading-[1.85] text-muted">{f.body}</p>
            </Accordion>
          ))}
        </div>
      </section>

      {/* ── 13. CTA ───────────────────────────────────────────── */}
      <section id="cta" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 pb-16 pt-4 lg:px-8">
        <div className="rounded-md border border-cyan/30 bg-panel px-6 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Orchestrate Your Grid"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Orchestrate Your Sovereign Active Defense Grid
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Unify distributed edge appliances into one autonomous collective defense grid — attacks mitigated in under
            50 milliseconds fleet-wide, with zero cloud data egress.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Clone sentinel-nexus on GitHub ]
            </a>
            <Link href="/platform/nexus" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Architecture Spec ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact Systems Team ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">github.com/kamisaberi/sentinel-nexus · aryorithm.com/platform/nexus · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
