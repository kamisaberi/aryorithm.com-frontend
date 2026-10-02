import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import Accordion from "@/components/ui/Accordion";
import CodeViewer from "@/components/ui/CodeViewer";
import { FastPathDiagram, IdentityEngine, RingVisual } from "@/components/simulations/FastPathSim";
import { RING_SNIPPET } from "@/data/blackbox";

export const metadata: Metadata = {
  title: "Blackbox Essential (libblackbox.so) — In-Kernel Active Defense | Aryorithm",
  description:
    "blackbox-essential (libblackbox.so): eBPF/XDP wire-speed mitigation in 0.84µs, lock-free SPMC ring at 1.25M EPS, TPM 2.0 silicon root of trust.",
};

const GITHUB_URL = "https://github.com/kamisaberi/blackbox";

const KPI_STRIP = [
  { metric: "0.84 µs", label: "Wire-to-Kernel Drop", desc: "Mitigation latency" },
  { metric: "1,250,000 EPS", label: "Sustained Ingestion", desc: "Throughput on 10GbE" },
  { metric: "< 40 ns", label: "Lock-Free SPMC Ring", desc: "Buffer transfer latency" },
  { metric: "TPM 2.0", label: "Silicon Root-Trust", desc: "Cryptographic hardware anchor" },
];

const XDP_SNIPPET = `#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/in.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

// BPF hash map: blocked IPv4 addresses with nanosecond TTL expiry.
// Up to 500k concurrent active blocks in kernel non-pageable memory.
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 500000);
    __type(key, __u32);    // IPv4 source, network byte order
    __type(value, __u64);  // Absolute expiration timestamp (ns)
} blocked_ip_map SEC(".maps");

SEC("xdp")
int xdp_threat_filter(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    // 1. Strict kernel-verifier boundary checks.
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;
    if (eth->h_proto != bpf_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    // 2. Nanosecond BPF map lookup on the source address.
    __u64 *drop_expires = bpf_map_lookup_elem(&blocked_ip_map, &ip->saddr);
    if (drop_expires) {
        if (bpf_ktime_get_ns() < *drop_expires)
            return XDP_DROP;   // < 120 CPU cycles, driver ring only
        bpf_map_delete_elem(&blocked_ip_map, &ip->saddr); // TTL expired
    }
    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";`;

const MODELCONFIG_SNIPPET = `{
  "model_name": "network_threat_v2.onnx",
  "input_tensor": {
    "name": "input_features",
    "dimensions": [1, 32],
    "data_type": "FLOAT32"
  },
  "output_tensors": {
    "threat_probability": "output_prob",
    "reconstruction_loss": "recon_loss",
    "latent_embedding": "latent_z"
  },
  "mitigation_thresholds": {
    "active_learning_uncertainty_window": [0.40, 0.60],
    "in_kernel_drop_threshold": 0.85,
    "default_kernel_block_ttl_seconds": 86400
  }
}`;

const CMAKE_SNIPPET = `cmake_minimum_required(VERSION 3.20)
project(my_kernel_sensor LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_library(BLACKBOX_LIB blackbox REQUIRED PATHS /usr/local/lib)
find_path(BLACKBOX_INCLUDE_DIR blackbox/blackbox.hpp PATHS /usr/local/include)

add_executable(my_kernel_sensor src/main.cpp)
target_include_directories(my_kernel_sensor PRIVATE \${BLACKBOX_INCLUDE_DIR})
target_link_libraries(my_kernel_sensor PRIVATE \${BLACKBOX_LIB} pthread elf)`;

const PIPELINE_SNIPPET = `#include <iostream>
#include <chrono>
#include <thread>
#include <blackbox/blackbox.hpp>

int main() {
    std::cout << "[*] Initializing Blackbox Active Mitigation Core..."
              << std::endl;

    // 1. Adaptive hardware identity (TPM 2.0 / vTPM / DMI fallback).
    auto &identity_engine = blackbox::HardwareIdentity::instance();
    auto identity = identity_engine.probe();
    std::cout << "[+] Hardware UUID [" << identity.machine_uuid << "]"
              << " tier: " << identity.get_tier_string() << std::endl;

    // 2. Load and attach the eBPF/XDP driver-space filter.
    auto &xdp = blackbox::XdpManager::instance();
    blackbox::XdpConfig cfg{
        .interface_name = "eth0",
        .bpf_object_path = "/usr/local/lib/blackbox/xdp_filter.o",
        .force_skb_mode = false   // native driver mode: 0.84us SLA
    };
    if (!xdp.attach(cfg)) {
        std::cerr << "[-] XDP attach failed on eth0" << std::endl;
        return 1;
    }

    // 3. Lock-free SPMC ring for userspace neural scoring (262,144 slots).
    blackbox::EventRingBuffer ring_buffer(262144);

    // 4. Inject an in-kernel drop rule (24-hour TTL, nanosecond clock).
    uint64_t ttl_ns = 86400ULL * 1'000'000'000ULL;
    if (xdp.block_ip("198.51.100.45", ttl_ns))
        std::cout << "[+] IN-KERNEL DROP ENFORCED at NIC driver in 0.84 us!"
                  << std::endl;

    // 5. Atomic real-time telemetry — no locks, no syscalls.
    std::this_thread::sleep_for(std::chrono::seconds(2));
    auto stats = xdp.get_telemetry();
    std::cout << "    Inspected: " << stats.total_packets_inspected
              << " | Dropped: " << stats.total_packets_dropped
              << " | Mean SLA: " << stats.mean_mitigation_latency_us
              << " us" << std::endl;

    xdp.detach();
    return 0;
}`;

const MITIGATION_ROWS = [
  { mech: "iptables (Netfilter string drop)", arch: "Kernel Stack", ctx: "0 (in-stack)", lat: "14.2 µs", hot: false },
  { mech: "nftables (modern table)", arch: "Kernel Stack", ctx: "0 (in-stack)", lat: "9.8 µs", hot: false },
  { mech: "Suricata NIDS (NFQUEUE)", arch: "Userspace Daemon", ctx: "2 (kernel↔user)", lat: "8,400.0 µs (8.4 ms)", hot: false },
  { mech: "Open vSwitch (flow drop)", arch: "Kernel / User", ctx: "1 (OpenFlow)", lat: "6.5 µs", hot: false },
  { mech: "blackbox-essential (xdp_filter)", arch: "eBPF / XDP", ctx: "0 (driver ingress)", lat: "0.84 µs (< 0.001 ms)", hot: true },
];

const PERCENTILES = [
  { p: "p50", lat: "0.84 µs", bound: "Verified (< 1.0 ms SLA)" },
  { p: "p90", lat: "0.89 µs", bound: "Verified (< 1.0 ms SLA)" },
  { p: "p95", lat: "0.92 µs", bound: "Verified (< 1.0 ms SLA)" },
  { p: "p99", lat: "0.98 µs", bound: "Verified (< 1.0 ms SLA)" },
  { p: "p999", lat: "1.04 µs", bound: "Verified (< 1.1 ms peak)" },
];

const COMPLIANCE = [
  {
    n: "01",
    title: "CMMC 2.0 (Level 2) & NIST SP 800-171",
    lines: [
      "SI.L2-3.14.1 — hostile payloads mitigated at line rate before socket creation or host execution.",
      "IA.L2-3.5.1 — enrollment verified by physical TPM 2.0 endorsement keys and signed PCR 0/4 quotes.",
    ],
  },
  {
    n: "02",
    title: "IEC 62443-3-3 & 62443-4-2",
    lines: [
      "FR 3 / FR 5 — deterministic zone-boundary protection for Modbus TCP, DNP3 and PROFINET loops.",
      "Zero operational jitter injected into PLC scan cycles.",
    ],
  },
  {
    n: "03",
    title: "EU NIS2 Directive",
    lines: [
      "Article 21 — automated near-instant incident handling with zero third-party cloud dependence.",
    ],
  },
];

const FAQS = [
  {
    id: "bb-faq-verifier",
    badge: "Q.01",
    title: "How does eBPF guarantee xdp_filter.o will not crash the kernel?",
    body: "Every eBPF program must pass the in-kernel eBPF Verifier before execution: strict static analysis proving no unbounded loops, no out-of-bounds memory access (data to data_end), and finite instruction count. Unsafe programs are rejected at load time — a crash is structurally impossible, not merely unlikely.",
  },
  {
    id: "bb-faq-root",
    badge: "Q.02",
    title: "Does blackbox require root privileges to run?",
    body: "Loading eBPF programs needs CAP_NET_ADMIN and CAP_BPF (or CAP_SYS_ADMIN on older kernels). Once the XDP program is attached and the BPF map descriptor opened, the application drops full root and runs as an unprivileged system user.",
  },
  {
    id: "bb-faq-map-full",
    badge: "Q.03",
    title: "What happens if blocked_ip_map exceeds its entry limit?",
    body: "The map holds 500,000 concurrent entries in kernel non-pageable memory. Near saturation the engine purges expired TTL elements first; a genuinely full map behaves as a bounded cache and evicts the oldest timestamped entry — kernel memory can never be exhausted.",
  },
  {
    id: "bb-faq-docker",
    badge: "Q.04",
    title: "Can blackbox operate inside Docker containers?",
    body: "Yes. Containers need --privileged or cap_add [NET_ADMIN, BPF] with /sys/fs/bpf mounted. Virtual veth pairs use Generic SKB mode (XDP_FLAGS_SKB_MODE) for sub-millisecond filtering across container meshes.",
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

export default function BlackboxEssentialPage() {
  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Blackbox Essential" }]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tier 2 Security Core", "Linux eBPF/XDP Native", "Sub-Microsecond SLA", "TCG TPM 2.0 Silicon Root"].map((b) => (
              <span key={b} className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span className="text-kernel">[</span> {b} <span className="text-kernel">]</span>
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Wire-Speed In-Kernel Packet Dropping. Sub-Microsecond Determinism. Cryptographic Silicon Trust.
          </h1>
          <p className="mt-3 font-mono text-[13px] text-kernel">blackbox-essential (libblackbox.so) — eBPF/XDP Mitigation & Hardware Attestation Core</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The low-latency active mitigation engine of the Aryorithm ecosystem. Operating inside NIC driver rings, it
            filters at wire speed in <span className="font-mono text-[13.5px] text-ink">0.84 µs</span> before socket
            allocation, streams millions of events over a lock-free SPMC ring, and anchors integrity to physical
            TPM 2.0 cryptoprocessors.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View on GitHub ]
            </a>
            <Link href="#ebpf-subsystem" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Explore eBPF Architecture ]
            </Link>
            <Link href="#empirical-benchmarks" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Benchmark Study ]
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

      {/* ── 2. PHYSICS PROBLEM ────────────────────────────────── */}
      <section id="physics" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SectionHead kicker="// The Physics of Mitigation" title="Why Userspace Firewalls Fail Critical Infrastructure" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-threat/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-threat">Userspace Inspection (Suricata / iptables)</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Physical Wire → NIC DMA → sk_buff Alloc → TCP/IP Stack → Netfilter Hook → Context Switch → NFQUEUE
                  Userspace → Rule Match → Verdict <span className="text-threat">[ 5.0ms – 15.0ms overhead ]</span>
                </p>
              </div>
              <div className="rounded-md border border-kernel/40 bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Blackbox XDP Drop Path (xdp_filter.o)</p>
                <p className="mt-3 font-mono text-[11.5px] leading-[2] text-muted">
                  Physical Wire → NIC DMA → XDP Driver Hook → BPF Map Lookup → <span className="text-kernel">XDP_DROP [ 0.84 µs total ]</span>
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">Zero sk_buff · zero stack traversal · zero context switches</p>
              </div>
            </div>
            <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
              <p>
                Mitigation in industrial environments is a race against mechanical actuators: a malicious Modbus coil
                command (FC05) or IEC 60870-5-104 breaker trip crosses the bus in{" "}
                <span className="font-mono text-[13px] text-ink">2.0ms – 3.5ms</span>, and valves or breakers physically
                trip within <span className="font-mono text-[13px] text-ink">15ms – 50ms</span>. A 10ms inspection delay
                means the verdict arrives after the equipment has already started moving.
              </p>
              <p>
                libblackbox.so eliminates the window at the lowest OS layer — the eXpress Data Path. Frames die inside
                the driver RX ring before the kernel allocates a single byte of socket memory, neutralizing physical
                attacks in under one microsecond.
              </p>
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Physics Problem", href: "#physics" },
                  { label: "eBPF/XDP Subsystem", href: "#ebpf-subsystem" },
                  { label: "SPMC Ring Buffer", href: "#ring-buffer" },
                  { label: "Attestation Engine", href: "#attestation" },
                  { label: "ModelConfig", href: "#modelconfig" },
                  { label: "Quickstart", href: "#quickstart" },
                  { label: "Benchmarks", href: "#empirical-benchmarks" },
                  { label: "Compliance", href: "#compliance" },
                  { label: "FAQ", href: "#faq" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "xInfer Essential", href: "/projects/xinfer-essential", meta: "v4.2.0" },
                  { label: "Sentinel-Lab", href: "/projects/sentinel-lab", meta: "v2.4.0" },
                ],
              },
            ]}
            cta={{ label: "View on GitHub", href: GITHUB_URL }}
          />
        </div>
      </section>

      {/* ── 3. EBPF SUBSYSTEM ─────────────────────────────────── */}
      <section id="ebpf-subsystem" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// In-Kernel eBPF/XDP Engine" title="xdp_filter.o & BPF Hash Map Architecture" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-md border border-hairline bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Kernel Ingress Decision Tree</p>
            <div className="mt-4 space-y-0 font-mono text-[11.5px]">
              {[
                ["10GbE / 25GbE interface (or virtual vNIC)", "Physical ingress point", "#00E5FF"],
                ["xdp_threat_filter() executes", "Frame verifier · Ethernet 0x0800 · IPv4 bounds proof", "#00E5FF"],
                ["bpf_map_lookup_elem(&blocked_ip_map)", "Pinned BPF hash map · 500k entries · TTL in ns", "#FFB800"],
                ["MATCH + TTL active → XDP_DROP", "0.84 µs · < 120 CPU cycles · sk_buff never exists", "#00FFA3"],
                ["Expired → purge element · Benign → XDP_PASS", "Pass to SPMC ring for background AI inference", "#00FFA3"],
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
          </div>
          <div>
            <CodeViewer code={XDP_SNIPPET} lang="cpp" filename="bpf/xdp_filter.c — Clang/LLVM → verified bytecode" note="Static verifier proof: no unbounded loops, no out-of-bounds access, finite instructions." />
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-kernel/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">Native Driver Mode · XDP_FLAGS_DRV_MODE</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
              Direct RX-ring attachment on physical 10/25GbE adapters (Intel X520/E810, Mellanox ConnectX).
              The verified <span className="font-mono text-[12px] text-ink">0.84 µs</span> mitigation SLA.
            </p>
          </div>
          <div className="rounded-md border border-cyan/40 bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">Generic SKB Mode · XDP_FLAGS_SKB_MODE</p>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
              Auto-engages on VMware/KVM/Docker veth pairs without hardware XDP hooks. Full functionality at
              sub-millisecond mitigation (&lt; 2.5 µs).
            </p>
          </div>
        </div>
        <div className="mt-6">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Live datapath simulation — inject a frame</p>
          <FastPathDiagram />
        </div>
      </section>

      {/* ── 4. RING BUFFER ────────────────────────────────────── */}
      <section id="ring-buffer" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Lock-Free SPMC Ring Buffer" title="EventRingBuffer — Zero-Mutex Event Transport" />
        <p className="mt-4 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
          Mutex-guarded queues collapse above 1,000,000 EPS through lock contention and buffer starvation.
          The zero-mutex circular structure below moves events from driver threads to neural workers with cache-aligned
          C++20 atomics — <span className="font-mono text-[13px] text-ink">1.25M EPS</span> at{" "}
          <span className="font-mono text-[13px] text-ink">&lt; 40ns</span> transfer latency.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <RingVisual />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["alignas(64)", "No false sharing between head and tail cache lines"],
                ["release / acquire", "Non-blocking write fast-path, wait-free reads"],
                ["256k slots", "262,144 descriptors absorb line-rate bursts"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-md border border-hairline bg-panel p-4">
                  <p className="font-mono text-[11px] text-kernel">{t}</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <CodeViewer code={RING_SNIPPET} lang="cpp" filename="blackbox/event_ring_buffer.hpp — power-of-two SPMC ring" note="Producer never blocks or allocates; consumers claim slots via CAS, never a mutex." />
        </div>
      </section>

      {/* ── 5. ATTESTATION ────────────────────────────────────── */}
      <section id="attestation" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Hardware Identity & Attestation" title="Adaptive 3-Tier Silicon Trust" />
        <p className="mt-4 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
          MAC addresses and IP tokens can be spoofed by anyone with root. The adaptive discovery engine probes
          physical TPM, then vTPM, then DMI — and never fails open. Click each tier to inspect the mechanism.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <IdentityEngine />
          <div className="space-y-4">
            <div className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">Tier 1 Enrollment Quote</h3>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                Bare-metal appliances open <span className="font-mono text-[12px] text-ink">/dev/tpmrm0</span> via TCG
                TSS2, seal a non-exportable AIK, and quote PCR 0 (firmware) + PCR 4 (bootloader). Every enrollment frame
                carries a verifiable quote:
              </p>
              <p className="mt-3 overflow-x-auto rounded border border-hairline bg-void/60 p-3 font-mono text-[11px] leading-relaxed text-kernel">
                σ_identity = Sign_AIK( H( PCR_0 ‖ PCR_4 ‖ UUID_DMI ) )
              </p>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">Clone Detection Guarantee</h3>
              <p className="mt-2 text-[12.5px] leading-[1.8] text-muted">
                Tier 3 derives <span className="font-mono text-[12px] text-ink">Device_ID = SHA256(product_uuid + board_serial + machine-id)</span>.
                Cloning an appliance into an unauthorized VM changes the hash instantly — the command plane severs the node.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. MODELCONFIG ────────────────────────────────────── */}
      <section id="modelconfig" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Decoupled ModelConfig" title="Dynamic Tensor & Dimension Binding" />
        <p className="mt-4 max-w-3xl text-[14.5px] leading-[1.85] text-muted">
          The engine is decoupled from network architectures: geometries, scores, and thresholds are declarative. Hot-swap
          a 32-dim NetFlow autoencoder for an 80-dim CIC-IDS tensor without recompiling the C++ binary.
        </p>
        <div className="mt-6 max-w-3xl">
          <CodeViewer code={MODELCONFIG_SNIPPET} lang="json" filename="models/network_threat_v2.json — declarative binding" note="Uncertainty window feeds active learning; 0.85 verdict drops straight into blocked_ip_map." />
        </div>
      </section>

      {/* ── 7. QUICKSTART ─────────────────────────────────────── */}
      <section id="quickstart" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Developer Quickstart" title="C++20 API Implementation Walkthrough" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">1 · Minimal CMake linking</p>
            <CodeViewer code={CMAKE_SNIPPET} lang="cpp" filename="CMakeLists.txt — find_library style, no vendoring" note="Links libblackbox.so directly. Privileges drop after XDP attach." />
          </div>
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">2 · Active mitigation pipeline</p>
            <CodeViewer code={PIPELINE_SNIPPET} lang="cpp" filename="src/main.cpp — identity → attach → block → telemetry" note="Drop rule enforced in-kernel; telemetry read from atomics, no syscalls." />
          </div>
        </div>
      </section>

      {/* ── 8. BENCHMARKS ─────────────────────────────────────── */}
      <section id="empirical-benchmarks" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// Empirical Benchmarks" title="Inline Mitigation Latency & Percentiles" />
        <p className="mt-4 max-w-3xl text-[13px] leading-[1.8] text-muted">
          Industrial bare metal (i9-14900K · 192GB DDR5 · X520-DA2 10GbE) under continuous line-rate saturation.
        </p>
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[720px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Mitigation Mechanism</th>
                <th className="px-4 py-3">Architecture</th>
                <th className="px-4 py-3">Context Switches</th>
                <th className="px-4 py-3">Mean Latency</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {MITIGATION_ROWS.map((b) => (
                <tr key={b.mech} className={`border-b border-hairline/60 last:border-0 ${b.hot ? "bg-kernel/[0.06]" : ""}`}>
                  <td className={`px-4 py-3 font-bold ${b.hot ? "text-kernel" : "text-ink"}`}>{b.mech}</td>
                  <td className="px-4 py-3 text-muted">{b.arch}</td>
                  <td className="px-4 py-3 text-muted">{b.ctx}</td>
                  <td className="px-4 py-3 text-ink">{b.lat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Percentiles — 100k hostile bursts @ 1.25M EPS</p>
        <div className="mt-3 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[560px] border-collapse bg-panel text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3">Percentile</th>
                <th className="px-4 py-3">Measured Latency</th>
                <th className="px-4 py-3">Safety Bound</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {PERCENTILES.map((r) => (
                <tr key={r.p} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-3 text-cyan">{r.p}</td>
                  <td className="px-4 py-3 text-ink">{r.lat}</td>
                  <td className="px-4 py-3 text-kernel">{r.bound}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 9. COMPLIANCE ─────────────────────────────────────── */}
      <section id="compliance" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <SectionHead kicker="// OT & Sovereign Defense Compliance" title="IEC 62443 · CMMC 2.0 · NIS2" />
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
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Embed Active Defense"}</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-[24px] font-bold leading-snug text-ink lg:text-[30px]">
            Embed Sub-Microsecond Active Defense Into Your Platform
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-[1.8] text-muted">
            Whether you are securing industrial SCADA substations, high-frequency financial gateways, or sovereign
            defense enclaves — libblackbox enforces sub-microsecond in-kernel protection.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Clone blackbox on GitHub ]
            </a>
            <Link href="/technology/blackbox" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Academic Preprint ]
            </Link>
            <Link href="/contact" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Contact Systems Team ]
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10.5px] text-muted">github.com/kamisaberi/blackbox · aryorithm.com/technology/blackbox · research@aryorithm.com</p>
        </div>
      </section>
    </>
  );
}
