import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";

export const metadata: Metadata = {
  title: "Blackbox Sentinel — Cyber-Physical XDR | Aryorithm",
  description:
    "Blackbox Sentinel: turnkey cyber-physical active defense with 26 native C++20 subsystems, 30 industrial dissectors, 0.84µs kernel drops and zero cloud egress.",
};

const GITHUB_URL = "https://github.com/kamisaberi/blackbox-sentinel";

const KPI_STRIP = [
  { metric: "26 Subsystems", label: "SIEM · WAF · CWPP", desc: "SCADA CPS · EDR · BAD" },
  { metric: "30 Plugins", label: "Modbus · DNP3 · S7", desc: "PROFINET · DICOM" },
  { metric: "0.84 µs", label: "In-Kernel eBPF", desc: "Wire-speed drop SLA" },
  { metric: "$0.00", label: "Zero Cloud Egress", desc: "100% air-gapped" },
];

const ATTACKS = [
  { n: "01", title: "High-Voltage Breaker Trip", body: "Altering IEC 60870-5-104 or Modbus commands to disengage protection relays in an electrical substation." },
  { n: "02", title: "Industrial Actuator Manipulation", body: "Overriding pressure or temperature safety thresholds in a petrochemical refinery using forced coil commands." },
  { n: "03", title: "Medical Device Extortion", body: "Disrupting DICOM PACS radiology archives during active clinical procedures." },
];

const FORM_FACTOR_ROWS: [string, string, string, string][] = [
  ["Deployment Target", "Substations, PLCs, Oil Rigs", "Datacenters, Enterprise DMZ", "VMware vSphere, KVM, Proxmox"],
  ["Ingress Throughput", "1.0 Gbps (line rate)", "10 / 25 / 40 Gbps (line rate)", "Depends on vCPU allocation"],
  ["Mitigation SLA", "< 1.2 µs (XDP driver drop)", "< 0.84 µs (XDP driver drop)", "< 2.5 µs (XDP SKB mode)"],
  ["Target Silicon", "Rockchip RK3588 (RKNPU2) / Intel Atom OpenVINO", "Dual Xeon / EPYC + NVIDIA L4 TensorRT", "Intel Core / Xeon vCPU (OpenVINO)"],
  ["Network Interfaces", "4x 1GbE RJ45 (bypass relay)", "4x 10GbE SFP+ (Intel X520/810)", "2x–4x virtual vNICs"],
  ["Physical Security", "Physical TPM 2.0 (/dev/tpmrm0)", "Dual physical TPM 2.0 (TSS2)", "vTPM 2.0 / DMI UUID"],
  ["Power & Temp", "Dual 24V DC (−40°C to +85°C)", "Dual redundant 110/240V AC", "Software defined"],
  ["Operating System", "Hardened Sovereign Linux 6.8", "Hardened Sovereign Linux 6.8", "OVA / QCOW2 pre-built"],
];

const SUBSYSTEM_DOMAINS: { domain: string; color: string; mods: [string, string][] }[] = [
  {
    domain: "Enterprise IT / SIEM", color: "#00E5FF",
    mods: [
      ["01_siem_core", "In-memory log correlation & indexer"],
      ["02_ueba", "100k+ in-memory entity behavioral matrix"],
      ["03_ndr", "Encrypted traffic analysis via JA3/JA4 TLS"],
      ["04_ids_ips", "Signature matching with eBPF kernel drops"],
      ["15_ngfw", "Deep packet inspection & connection tracking"],
    ],
  },
  {
    domain: "Web & Application", color: "#00FFA3",
    mods: [
      ["05_waf", "API protection: SQLi, XSS, BOLA/IDOR"],
      ["10_bad", "Kinematic mouse/keystroke curve classifier"],
      ["11_rasp", "In-memory function-hook execution guard"],
    ],
  },
  {
    domain: "Host & Endpoint", color: "#FFB800",
    mods: [
      ["06_edr", "Process-tree analyzer & memory hunter"],
      ["07_epp_ngav", "Real-time file Shannon entropy calculator"],
      ["09_cwpp", "eBPF syscall breakout interceptor at sys_enter"],
      ["16_cdr", "Active macro/script stripper for PDF/DOCX"],
      ["20_fse", "UEFI/BIOS binary dissector & CVE scanner"],
    ],
  },
  {
    domain: "Identity & Access", color: "#00E5FF",
    mods: [
      ["08_nac", "802.1X dynamic VLAN quarantine controller"],
      ["12_itdr", "Active Directory abuse & Kerberoasting"],
      ["14_ato", "Impossible-travel velocity calculator"],
      ["24_ztna", "Dynamic session risk scorer (0.0–1.0)"],
    ],
  },
  {
    domain: "Industrial & IoT", color: "#FFB800",
    mods: [
      ["17_iot_sec", "DICOM PACS parser & HL7 structure verifier"],
      ["18_cps_sec", "SCADA Modbus & DNP3 physical constraint guard"],
      ["21_side_channel", "Acoustic, power & EM emission analyzer"],
    ],
  },
  {
    domain: "Forensics & Advanced", color: "#FF3366",
    mods: [
      ["13_ddos", "Line-rate SYN-cookie guard & packet shaper"],
      ["19_swg", "Sovereign outbound egress proxy"],
      ["22_dfir", "Ring-buffer PCAP carver with SHA-256"],
      ["23_ai_trism", "LLM prompt-injection & token anomaly filter"],
      ["25_fdp", "Financial transaction graph anomaly analyzer"],
      ["26_ddp", "Decoy PLCs & synthetic honeypot ports"],
    ],
  },
];

const SPOTLIGHT = [
  {
    id: "18_cps_sec",
    title: "Module 18 · cps_sec — SCADA Constraint Validator",
    body: "Beyond port-502 checks: stateful semantic dissection of Modbus TCP/DNP3 streams. Blocks FC05/FC15 writes during generation cycles, rejects register writes past physical boundaries, and flags command rates above 50Hz that induce turbine vibration or mechanical wear.",
  },
  {
    id: "09_cwpp",
    title: "Module 09 · cwpp — Container Syscall Guard",
    body: "Sits at the sys_enter tracepoint inside the kernel: intercepts container breakouts reaching for ptrace, sensitive /proc mounts, or host namespaces — terminating offenders in nanoseconds with no userspace daemon in the loop.",
  },
  {
    id: "10_bad",
    title: "Module 10 · bad — Kinematic Bot Defense",
    body: "Scores mouse acceleration vectors, touch surfaces, and keystroke jitter. Humans draw non-linear curves with micro-hesitations; scripts move in straight lines (jitter < 0.1ms) — credential stuffing dies without a single CAPTCHA.",
  },
  {
    id: "26_ddp",
    title: "Module 26 · ddp — Distributed Deception",
    body: "Binds decoy Siemens S7-300 / Modbus PLCs strictly to secondary VIPs, so production sniffers never collide. Any touch on a decoy VIP is proof of reconnaissance — an immediate high-fidelity alert.",
  },
];

const PLUGIN_COLUMNS: { heading: string; libs: string[] }[] = [
  { heading: "Industrial OT / SCADA", libs: ["libmodbus_dissector", "libdnp3_dissector", "libs7comm_dissector", "libprofinet_dissector", "libethernet_ip", "libhart_ip", "libmitsubishi_melsec", "libomron_fins"] },
  { heading: "Energy & Utilities", libs: ["libiec104_dissector", "libiec61850_goose", "libiec61850_mms", "libopc_ua_dissector", "libbacnet_building", "libmodbus_rtu_serial", "libenip_cip", "libfieldbus_h1"] },
  { heading: "Aviation & Maritime", libs: ["libmavlink_uav", "libais_maritime", "libnmea_gps", "libadsb_avionics", "libstanag_4586", "libmil_std_1553", "libcanbus_automotive"] },
  { heading: "Healthcare & Enterprise", libs: ["libdicom_pacs", "libhl7_v2", "libcef_forwarder", "libleef_forwarder", "libsyslog_rfc5424", "libkafka_producer", "libsnmp_v3_trap", "libnetflow_v9_ipfix"] },
];

const SENTINEL_YAML = `# ==============================================================================
# BLACKBOX SENTINEL APPLIANCE CONFIGURATION  (/etc/sentinel/sentinel.yaml)
# ==============================================================================

appliance:
  identifier: "Edge-Substation-01"
  site: "PowerGrid-North-01"
  mode: "ACTIVE_MITIGATION"          # or STAGE_SHADOW_MODE (evaluate, zero drops)
  primary_interface: "eth0"
  xdp_driver_mode: "SKB"             # DRV = physical 10GbE, SKB = virtual/VMware

nexus_uplink:
  enabled: true
  host: "10.240.0.10"
  port: 50051
  nexus_http_port: 9443
  sentinel_local_api_port: 8443
  heartbeat_interval_sec: 5
  active_model_name: "network_threat_v1.onnx"
  local_models_dir: "/etc/sentinel/models"

subsystems:
  siem_core: true
  scada_constraint_validator: true
  web_application_firewall: true
  container_syscall_guard: true
  bot_abuse_defense: true
  ransomware_entropy_guard: true

scada_policy:
  enforce_strict_function_codes: true
  allowed_modbus_functions: [1, 2, 3, 4]   # read-only baseline
  max_command_rate_hz: 50.0`;

const SYSTEMD_UNIT = `[Unit]
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

# Real-time capabilities & resources
LimitNOFILE=65536
TasksMax=4096
AmbientCapabilities=CAP_NET_ADMIN CAP_SYS_ADMIN CAP_BPF
Nice=-10
CPUSchedulingPolicy=rr
CPUSchedulingPriority=80

[Install]
WantedBy=multi-user.target`;

const COMPLIANCE = [
  {
    n: "01", title: "IEC 62443-3-3 & 62443-4-2",
    lines: [
      "FR 5 zone-boundary enforcement between SIS and BPCS safety systems.",
      "FR 3 system integrity: Modbus/DNP3/PROFINET command semantics validated.",
    ],
  },
  {
    n: "02", title: "CMMC 2.0 Level 2 & NIST SP 800-171",
    lines: [
      "SI.L2-3.14.1 — indicators mitigated in < 0.84µs with mathematical log proof.",
      "IA.L2-3.5.1 — identity anchored to TPM 2.0 endorsement keys + PCR quotes.",
    ],
  },
  {
    n: "03", title: "EU NIS2 Directive",
    lines: [
      "Article 21 — sovereign air-gapped incident handling, $0 cloud egress.",
    ],
  },
];

const FAQS = [
  {
    id: "sent-faq-vip",
    badge: "Q.01",
    title: "How do deception honeypots avoid port collisions?",
    body: "Module 26_ddp binds decoy PLCs and fake SSH ports exclusively to secondary Virtual IPs (VIPs). Production sniffers listen promiscuously across all traffic, so legitimate servers never see socket conflicts — while any touch on a decoy VIP proves malicious reconnaissance.",
  },
  {
    id: "sent-faq-shadow",
    badge: "Q.02",
    title: "Can Sentinel evaluate passively before enforcing?",
    body: "Yes. With mode STAGE_SHADOW_MODE in sentinel.yaml, the appliance taps mirror/SPAN ports or optical TAPs and performs full classification, dissection, and XAI attribution with zero drops and zero injections — complete audit reports with no risk to PLC loops.",
  },
  {
    id: "sent-faq-offline",
    badge: "Q.03",
    title: "What happens if the Nexus link goes down?",
    body: "Sentinels are autonomous by design: local eBPF filtering, inference, and all 26 subsystems continue without degradation. Buffered telemetry, candidate vectors, and audit logs sync automatically when connectivity returns.",
  },
  {
    id: "sent-faq-snbundle",
    badge: "Q.04",
    title: "How are air-gapped updates verified?",
    body: "Via signed sneakernet bundles (.snbundle). Local GPG keys plus TPM 2.0 registers verify the signature and SHA-256 hash before any binary is unbundled or model hot-reloaded.",
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

export default function BlackboxSentinelPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Blackbox Sentinel" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 3 Commercial Appliance", "Cyber-Physical XDR & SIEM", "26 Native Modules", "30 Industrial Plugins"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Autonomous Cyber-Physical Active Defense. 26 Decoupled Subsystems. Zero Cloud Dependencies.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">Blackbox Sentinel — sentinel daemon · turnkey cyber-physical XDR appliance</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Engineered for substations, healthcare networks, and naval vessels — combining 26 native C++20 security
            subsystems and 30 industrial dissectors with driver-level eBPF/XDP drops and heterogeneous AI inference.
            Physical sabotage stops inline, with $0 cloud data egress.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Request 14-Day Shadow Mode Evaluation ]
            </Link>
            <Link href="#subsystem-deep-dive" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ View 26 Subsystem Architecture ]
            </Link>
            <Link href="#protocol-plugins" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore Industrial Protocol Plugins ]
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
            <SectionHead kicker="// The Cyber-Physical Challenge" title="Why Cloud XDR Fails in OT" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Enterprise Cloud XDR</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Physical Machine → Python Agent → JSON Extraction → Cloud WAN → Ingestion Queue → Correlation →
                  Operator Alert <span className="text-threat">(15–60 sec)</span>
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">WAN-fragile · egress fees · latency kills actuators</p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Sentinel Autonomous Edge</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Industrial Wire → eBPF/XDP Hook → SPMC Ring → Neural Scoring → Constraint Check →{" "}
                  <span className="text-kernel">Kernel Drop &lt; 0.84 µs</span>
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">100% on-premises · hard real-time · verified audit</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {ATTACKS.map((a) => (
                <div key={a.n} className="rounded-md border border-hairline bg-panel p-5">
                  <p className="font-mono text-[11px] text-threat">{a.n}</p>
                  <h3 className="mt-2 font-display text-[14px] font-bold text-ink">{a.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{a.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
              Cloud XDR adds 15–60 seconds of detection latency, thousands in egress fees, and total failure when the WAN
              drops — while Python agents jitter PLC scan cycles. Sentinel treats the edge as a self-defending fortress:
              every packet, flow, and syscall processed locally in native C++20, mitigated before frames reach the socket buffer.
            </p>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Cyber-Physical Challenge", href: "#challenge" },
                  { label: "Form Factors", href: "#form-factors" },
                  { label: "26 Subsystems", href: "#subsystem-deep-dive" },
                  { label: "Protocol Plugins", href: "#protocol-plugins" },
                  { label: "Nexus Uplink", href: "#nexus-uplink" },
                  { label: "Command Center", href: "#command-center" },
                  { label: "Deployment", href: "#deployment" },
                  { label: "Compliance", href: "#compliance" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Sentinel Nexus", href: "/projects/sentinel-nexus", meta: "v3.1.0" },
                  { label: "xInfer Essential", href: "/projects/xinfer-essential", meta: "v4.2.0" },
                  { label: "Blackbox Essential", href: "/projects/blackbox-essential", meta: "v2.8.3" },
                ],
              },
            ]}
            cta={{ label: "Request Defense POC", href: "/contact" }}
          />
        </div>
      </section>

      {/* ── 3. FORM FACTORS ───────────────────────────────────── */}
      <section id="form-factors" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Appliance Form Factors" title="S-1000 · S-5000 · V-Edge" />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[820px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3 text-kernel">Model S-1000 (DIN-Rail)</th>
                <th className="px-4 py-3 text-cyan">Model S-5000 (1U Rackmount)</th>
                <th className="px-4 py-3 text-telemetry">Model V-Edge (Virtual VM)</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {FORM_FACTOR_ROWS.map(([spec, s1000, s5000, vedge]) => (
                <tr key={spec} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">{spec}</td>
                  <td className="px-4 py-3 text-ink">{s1000}</td>
                  <td className="px-4 py-3 text-ink">{s5000}</td>
                  <td className="px-4 py-3 text-ink">{vedge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. SUBSYSTEMS ─────────────────────────────────────── */}
      <section id="subsystem-deep-dive" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// 26 Decoupled C++20 Subsystems" title="01_siem_core → 26_ddp. Toggle Any Module." />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          No monolith: modules communicate over unified lock-free interfaces and toggle independently via{" "}
          <span className="font-mono text-[12.5px] text-ink">sentinel.yaml</span>.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {SUBSYSTEM_DOMAINS.map((d) => (
            <div key={d.domain} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: d.color }}>{d.domain}</p>
              <ul className="mt-3 space-y-2">
                {d.mods.map(([id, desc]) => (
                  <li key={id} className="flex items-baseline gap-3 border-b border-hairline/50 pb-2 last:border-0 last:pb-0">
                    <span className="shrink-0 font-mono text-[11px] text-ink">{id}</span>
                    <span className="text-[12px] text-muted">{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Mission-critical spotlight</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {SPOTLIGHT.map((s) => (
            <div key={s.id} className="rounded-md border border-cyan/25 bg-panel p-5">
              <p className="font-mono text-[11px] text-cyan">{s.title}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. PROTOCOL PLUGINS ───────────────────────────────── */}
      <section id="protocol-plugins" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// 30 Industrial Dissector Plugins" title="dlopen Parsers. Zero Linker Collisions." />
        <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-muted">
          <span className="font-mono text-[12.5px] text-ink">PluginManager::load_plugin(…/libmodbus_dissector.so)</span> — strict{" "}
          <span className="font-mono text-[12.5px] text-ink">-fvisibility=hidden</span> symbol isolation in{" "}
          <span className="font-mono text-[12.5px] text-ink">src/plugins/</span>, loaded with{" "}
          <span className="font-mono text-[12.5px] text-ink">RTLD_LAZY | RTLD_LOCAL</span>.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLUGIN_COLUMNS.map((c) => (
            <div key={c.heading} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">{c.heading}</p>
              <ul className="mt-3 space-y-1.5">
                {c.libs.map((l) => (
                  <li key={l} className="font-mono text-[11px] text-muted">· {l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. NEXUS UPLINK ───────────────────────────────────── */}
      <section id="nexus-uplink" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Collective Defense Sync" title="Attacked Once, Immune Everywhere" />
        <div className="mt-6 rounded-md border border-hairline bg-panel p-5">
          <div className="grid gap-3 font-mono text-[11.5px] lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded border border-threat/50 p-4">
              <p className="text-threat">SUBSTATION 01 STRUCK</p>
              <p className="mt-2 leading-relaxed text-muted">Exploit hits 10.240.0.101 · local eBPF drop &lt; 0.84µs · ThreatIndicator emitted over gRPC</p>
            </div>
            <div className="flex items-center justify-center text-cyan">→</div>
            <div className="rounded border border-cyan/50 p-4">
              <p className="text-cyan">NEXUS COMMAND PLANE</p>
              <p className="mt-2 leading-relaxed text-muted">MITRE cache updated · FleetDefenseRule generated · parallel fanout &lt; 50ms</p>
            </div>
            <div className="flex items-center justify-center text-cyan">→</div>
            <div className="rounded border border-kernel/50 p-4">
              <p className="text-kernel">REFINERY 03 + HOSPITAL 02</p>
              <p className="mt-2 leading-relaxed text-muted">KernelDropInjector: bpf_map_update_elem(blocked_ip_map) · attacker dead at driver ring</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {[
            ["Automated TPM Enrollment", "Boot-time attestation payload via RegisterAppliance — DMI or silicon-signed."],
            ["0 ms Graceful Disconnect", "SIGINT sends DeregistrationRequest; Nexus marks OFFLINE instantly, no 15s timeout."],
            ["Canary OTA Hot-Reload", "15s ModelOtaService poll → SHA-256 verified pull → zero-downtime reload, no packets dropped."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-display text-[14px] font-bold text-ink">{t}</p>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. COMMAND CENTER ─────────────────────────────────── */}
      <section id="command-center" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Embedded Web Command Center" title="Port 8443. Zero CDN. Fully Air-Gapped." />
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline bg-void/70">
          <div className="min-w-[680px] p-5 font-mono text-[11.5px] leading-[1.9]">
            <p className="text-cyan">BLACKBOX SENTINEL [Edge-Substation-01] [PowerGrid-North] [UPTIME 42d 14h] [eBPF: ACTIVE]</p>
            <p className="mt-3 text-muted">ACTIVE TELEMETRY:</p>
            <p className="text-ink">CPU 12.5% · MEM 240MB · NPU 48.5°C · Inspected 150,000 · Drops 42 · SLA 0.84µs</p>
            <p className="mt-3 text-muted">BLOCKED IP TABLE (blocked_ip_map):</p>
            <p className="text-ink">198.51.100.45 :502 · 23h14m · Local 18_cps <span className="text-kernel">[Unblock]</span></p>
            <p className="text-ink">203.0.113.88&nbsp;&nbsp;:443 · 18h02m · Nexus collective <span className="text-kernel">[Unblock]</span></p>
            <p className="text-ink">192.0.2.144&nbsp;&nbsp;:102 · 12h45m · Nexus collective <span className="text-kernel">[Unblock]</span></p>
            <p className="mt-3 text-muted">LIVE THREAT CONSOLE:</p>
            <p className="text-threat">[14:02:11] ALERT: Modbus FC 0x05 override blocked on Reg 105 (Turbine Cooling)</p>
            <p className="text-telemetry">[14:02:11] XAI: SCADA_FC=5 (54.2%) | Rate=184.2Hz (28.1%) | Reg=105 (14.8%)</p>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-[13px] leading-[1.8] text-muted">
          Zero external script tags, zero Google Fonts, zero CDN links — every asset lives on appliance flash. Opening the
          dashboard inside a nuclear facility or naval vessel leaks not a single DNS request.
        </p>
      </section>

      {/* ── 8. DEPLOYMENT ─────────────────────────────────────── */}
      <section id="deployment" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Deployment Blueprint" title="sentinel.yaml & Systemd in Minutes" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">1 · /etc/sentinel/sentinel.yaml</p>
            <CodeViewer code={SENTINEL_YAML} lang="yaml" filename="sentinel.yaml — appliance, uplink, subsystems, SCADA policy" note="SHADOW vs ACTIVE mode, DRV vs SKB driver, read-only Modbus baseline." />
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">2 · blackbox-sentinel.service</p>
            <CodeViewer code={SYSTEMD_UNIT} lang="ini" filename="systemd unit — real-time priority, BPF capabilities" note="SCHED_RR @ prio 80 · CAP_NET_ADMIN + CAP_BPF · restart always." />
            <div className="mt-4 rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Launch the daemon</p>
              <p className="mt-2 font-mono text-[11.5px] leading-[2] text-ink">
                $ sudo systemctl daemon-reload<br />
                $ sudo systemctl enable --now blackbox-sentinel<br />
                $ sudo systemctl status blackbox-sentinel
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. COMPLIANCE ─────────────────────────────────────── */}
      <section id="compliance" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Sovereign Regulatory Compliance" title="IEC 62443 · CMMC 2.0 · NIS2" />
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
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Deploy Active Defense"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Deploy Autonomous Active Defense on Your Industrial Edge
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Stop relying on 60-second cloud alerts to protect physical machinery. Deterministic sub-microsecond
            in-kernel defense with zero cloud data egress.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Request 14-Day Shadow Pilot ]
            </Link>
            <Link href="/products/sentinel" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ View Technical Blueprint ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact OT Security ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">aryorithm.com/contact · aryorithm.com/products/sentinel · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
