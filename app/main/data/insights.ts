export const INSIGHT_CATEGORIES = [
  { id: "kernel", label: "Kernel & eBPF" },
  { id: "perf", label: "Performance" },
  { id: "ml", label: "ML Safety" },
  { id: "runtime", label: "Runtime Analysis" },
];

export const JITTER_ROWS: [string, string, string][] = [
  ["p50", "2.1 ms", "0.61 µs"],
  ["p90", "8.4 ms", "0.74 µs"],
  ["p99", "41.7 ms", "0.84 µs"],
  ["p99.9", "96.2 ms", "0.91 µs"],
  ["max observed", "120.0 ms", "1.02 µs"],
];

export interface ThroughputRow {
  cpu: string;
  mode: string;
  eps: number;
  cache: number;
  bypass: boolean;
}

export const THROUGHPUT_ROWS: ThroughputRow[] = [
  { cpu: "Xeon D-1747NTE", mode: "AF_XDP zero-copy", eps: 1250000, cache: 96.4, bypass: true },
  { cpu: "Core i9-14900K", mode: "AF_XDP zero-copy", eps: 1184000, cache: 94.1, bypass: true },
  { cpu: "Xeon D-1747NTE", mode: "AF_PACKET (copy)", eps: 412000, cache: 71.8, bypass: false },
  { cpu: "Core i9-14900K", mode: "libpcap userspace", eps: 208000, cache: 58.3, bypass: false },
];

export const MODBUS_SNIPPET = `// dissectors/modbus_tcp.cpp — function-code 0x05 constraint check.
// Runs in the verdict path; must be allocation-free and branch-cheap.

namespace aryorithm::dissect {

struct ModbusPdu {
  std::uint16_t transaction_id;
  std::uint16_t protocol_id;
  std::uint16_t length;
  std::uint8_t  unit_id;
  std::uint8_t  function_code;
  std::uint16_t address;
  std::uint16_t value;
};

constexpr std::uint8_t kForceSingleCoil = 0x05;

// Verdict for a write-coil request against the learned physical envelope.
Verdict inspect_write_coil(std::span<const std::byte> frame,
                           const ConstraintMap &envelope) noexcept {
  if (frame.size() < sizeof(ModbusPdu))
    return Verdict::malformed();

  const auto pdu = parse_be<ModbusPdu>(frame);   // byte-safe, no copy
  if (pdu.function_code != kForceSingleCoil)
    return Verdict::pass();

  // 1. Is this source authorised to write at all?
  if (!envelope.is_authorised_writer(pdu.unit_id))
    return Verdict::drop(Reason::UnauthorisedWriter);

  // 2. Is the coil inside the writable range for this unit?
  if (!envelope.coil_writable(pdu.unit_id, pdu.address))
    return Verdict::drop(Reason::AddressOutOfEnvelope);

  // 3. Would the resulting state violate a physical interlock?
  //    e.g. opening a valve while the downstream pump is de-energised.
  if (envelope.violates_interlock(pdu.unit_id, pdu.address, pdu.value))
    return Verdict::drop(Reason::InterlockViolation);

  return Verdict::pass();
}

}  // namespace aryorithm::dissect`;

export interface Publication {
  id: string;
  cat: string;
  kicker: string;
  readTime: string;
  date: string;
  title: string;
  stats: [string, string][];
  summary: string;
  body: string[];
  kind: "code" | "throughput" | "math" | "jitter";
  artefact: string;
  artefactNote: string;
}

export const PUBLICATIONS: Publication[] = [
  {
    id: "pub-modbus", cat: "kernel", kicker: "Exploit Post-Mortem", readTime: "14 min", date: "2026-09-04",
    title: "Dissecting the Modbus Function Code 0x05 Exploit: How eBPF Kernel Drops Prevent PLC Valve Manipulation in Under 1 Microsecond.",
    stats: [["Function code", "0x05"], ["Drop latency", "0.84µs"], ["PCAP vector", "included"]],
    summary: "A single 12-byte Modbus/TCP request can command a coil to change state — and with it, a valve, a breaker, or a pump. This post-mortem replays the exact force-single-coil frame, shows which constraint it violates, and measures the kernel drop that stops it before a socket buffer exists.",
    body: [
      "The exploit is structurally trivial: a Modbus/TCP ADU with function code 0x05 addressed at a coil outside the writable envelope for that unit. What makes it dangerous is not sophistication but authority — the frame arrives over an already-authenticated TCP session from a compromised engineering workstation, so perimeter identity checks pass it without question.",
      "Blackbox Sentinel's 18_cps_sec constraint map answers a different question: not who sent the frame, but whether the commanded state is physically permissible. The dissector extracts unit, address and value without allocation, checks the authorised-writer table, the writable coil range, and the interlock matrix — and returns a drop verdict when any of the three fails.",
      "Measured end to end, the verdict executes as an XDP_DROP 0.84 µs after frame ingress. The cloud SIEM in the same test indexed the flow 41.6 seconds later — after the valve would already have moved.",
    ],
    kind: "code", artefact: "Download Exploit Vector (.pcap)", artefactNote: "ga001_modbus_fc05.pcap · 18 KB · 42 frames · sha256:e31b7c94…1947",
  },
  {
    id: "pub-afxdp", cat: "perf", kicker: "Performance Engineering", readTime: "19 min", date: "2026-08-21",
    title: "Pushing 1.25 Million Packets/sec with AF_XDP and Zero-Copy DMA-BUF Across Intel Xeon and Core i9-14900K.",
    stats: [["Peak", "1.25M EPS"], ["Cache hit", "96.4%"], ["Copies", "0"]],
    summary: "Throughput at these rates is not a CPU frequency problem — it is a memory hierarchy problem. This paper isolates the copy, the cache miss, and the allocator from the packet path and shows why AF_XDP zero-copy sustains line rate where libpcap collapses.",
    body: [
      "The baseline is sobering: a libpcap userspace tap on a Core i9-14900K tops out at 208,000 EPS with a 58.3% L3 cache hit rate. Every frame is copied from the ring into userspace, touched by the allocator, and evicted from cache before inference ever sees it.",
      "Switching the same hardware to AF_XDP zero-copy raises throughput to 1,184,000 EPS at 94.1% cache residency. Moving to the Xeon D-1747NTE with DMA-BUF descriptor passing reaches 1,250,000 EPS at 96.4% — the frame is never copied, never allocated, and never leaves the cache line it arrived in.",
      "The lesson generalises: at a million packets per second, the memcpy is the benchmark. Remove it and commodity silicon keeps up; keep it and no CPU saves you.",
    ],
    kind: "throughput", artefact: "Download Benchmark Data (.csv)", artefactNote: "afxdp_throughput_2026-08.csv · 4 platforms × 6 runs · reproducible with sentinel-lab",
  },
  {
    id: "pub-poisoning", cat: "ml", kicker: "Whitepaper", readTime: "23 min", date: "2026-07-30",
    title: "Adversarial Model Poisoning at the Edge: Formalizing the Golden Attack Regression Safety Gate.",
    stats: [["Required rate", "1.00"], ["Suite", "18 attacks"], ["On miss", "Purge"]],
    summary: "Continual learning on ambient traffic creates an attack surface: drift the baseline and the model learns to tolerate the attacker. This whitepaper formalises the non-negotiable regression gate that makes poisoning uneconomical.",
    body: [
      "The threat model assumes the adversary can inject arbitrary ambient traffic over months — slow enough to look like concept drift, targeted enough to widen the model's tolerance around a specific exploit primitive. Self-supervised MAE training alone cannot distinguish this from legitimate change.",
      "The defence is a golden attack suite: 18 immutable historical attack vectors, release-signed and read-only, that every candidate must detect at a 1.00 rate before promotion. Missing even one aborts adaptation, purges the candidate, and retains the incumbent — poisoning effort is discarded wholesale.",
      "Appendix B proves the bound: any poisoned candidate that evades at least one golden attack is purged with probability 1, so the attacker's expected return on months of drift injection is zero.",
    ],
    kind: "math", artefact: "Download Whitepaper (PDF)", artefactNote: "adversarial_poisoning_edge.pdf · 23 pp · formal proofs in appendix B",
  },
  {
    id: "pub-jvm", cat: "runtime", kicker: "Comparative Analysis", readTime: "16 min", date: "2026-07-08",
    title: "Eliminating JVM Garbage Collection Pauses in SIEM Engines: A Comparative Memory Analysis.",
    stats: [["JVM p99", "41.7ms"], ["C++20 p99", "0.84µs"], ["Ratio", "49,643×"]],
    summary: "The argument against managed runtimes in the enforcement path is not aesthetic — it is arithmetic. A single 40 ms GC pause is fifty thousand times the mitigation budget. This analysis measures both paths over a 72-hour soak.",
    body: [
      "Over 72 hours under identical replay load, the JVM-based pipeline (G1GC and ZGC configurations) showed a p99 event-to-verdict latency of 41.7 ms and a worst observed pause of 120 ms. The native C++20 path measured p99 at 0.84 µs with a worst case of 1.02 µs.",
      "The ratio — 49,643× at p99 — is not a tuning gap. No collector configuration closes it, because the pause is structural: a tracing collector must periodically stop the world, and the world in this case is a turbine governor that does not wait.",
      "This is why no managed language, interpreter or JIT exists anywhere in the Aryorithm enforcement path. Worst-case latency is engineered and measured, not averaged and hoped for.",
    ],
    kind: "jitter", artefact: "Download Latency Distributions (.csv)", artefactNote: "jvm_vs_native_jitter.csv · 72h soak · G1GC, ZGC and native traces",
  },
];
