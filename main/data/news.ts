export interface NewsItem {
  slug: string;
  date: string;
  category: string;
  color: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  readTime: string;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    slug: "blackbox-sentinel-s5000-ga",
    date: "2026-09-15",
    category: "Product Release",
    color: "#00E5FF",
    title: "Blackbox Sentinel S-5000 Now Generally Available",
    excerpt: "The S-5000 appliance ships with the full 26-subsystem matrix, 30 industrial protocol dissectors, and xInfer Engine v4.2 with 15 silicon backends. Field deployment in 10 business days.",
    body: "After 18 months of field testing across 12 critical infrastructure sites, the S-5000 is now generally available. It carries the full Blackbox Core eBPF/XDP fast-path, the xInfer Engine with all 15 silicon backends enabled, and the Sentinel Nexus orchestration plane integration.\n\nThe S-5000 is the first appliance to ship with the complete physical constraint mapping engine pre-loaded for Modbus TCP, DNP3, IEC 61850, S7comm, and Profinet. This means operators get out-of-the-box protection against protocol spoofing attacks that violate mechanical reality — not just packet syntax.\n\nField deployment follows the standard 10-business-day timeline: hardware shipping, air-gapped installation, protocol dissector configuration, and operator training. The appliance is available in three form factors: rack-mount 2U, DIN-rail, and a ruggedized variant for substation environments.",
    author: "Aryorithm Product Team",
    readTime: "4 min read",
  },
  {
    slug: "ics-protocol-spoofing-campaign",
    date: "2026-08-22",
    category: "Threat Advisory",
    color: "#FF3366",
    title: "ICS/OT Protocol Spoofing Campaign Targeting European Grid Operators",
    excerpt: "A sophisticated spoofing campaign is targeting Modbus TCP and DNP3 infrastructure. Aryorithm appliances with physical constraint mapping are blocking these at the XDP layer in under 1 microsecond.",
    body: "Our threat research team has identified a campaign using crafted Modbus and DNP3 frames that pass traditional deep packet inspection. The distinguishing factor: they violate physical constraint maps — commanding turbine governors to states that are mechanically impossible.\n\nBlackbox Sentinel's physical constraint engine catches these at the kernel level. The XDP hook inspects each frame against the constraint map before the packet reaches the TCP/IP stack, dropping invalid commands in 0.84 microseconds — well before any actuator can respond.\n\nThis campaign is notable for its sophistication: the attackers have clearly studied industrial protocol specifications and are crafting frames that would pass any syntax-based inspection. The only defense is physical constraint validation — checking whether the commanded state is mechanically possible for the target equipment.\n\nWe recommend all operators ensure their appliances are running firmware 4.2.1 or later, which includes the updated constraint maps for this campaign.",
    author: "Aryorithm Threat Research",
    readTime: "6 min read",
  },
  {
    slug: "sentinel-lab-v2-4-slab-protocol",
    date: "2026-07-08",
    category: "Research",
    color: "#00FFA3",
    title: "Sentinel-Lab v2.4 Released with SLAB Protocol Benchmark",
    excerpt: "The open research tier now includes the SLAB wire protocol specification, a zero-allocation binary frame format designed for air-gapped environments. Full benchmark harness included.",
    body: "Sentinel-Lab v2.4 introduces the SLAB (Synchronous Lightweight Air-gapped Binary) wire protocol — a zero-allocation binary frame specification for environments where every allocation is a liability.\n\nThe release includes a full benchmark harness, reference implementations in C and Rust, and conformance test vectors. SLAB is designed for air-gapped environments where traditional serialization frameworks (Protobuf, FlatBuffers) introduce unacceptable overhead.\n\nKey design properties:\n\nZero-allocation: SLAB frames are fixed-size and stack-allocated. No heap, no malloc, no garbage collection.\n\nDeterministic: Every frame has a known, fixed size. No variable-length encoding, no compression, no surprises.\n\nAir-gapped: No external dependencies, no code generation, no schema registry. The specification is a single 40-page document.\n\nThe benchmark harness shows SLAB achieving 2.3M frames/second on a single core, compared to 340K for Protobuf and 890K for FlatBuffers on the same hardware.",
    author: "Aryorithm Research",
    readTime: "5 min read",
  },
  {
    slug: "series-b-sovereign-defense-expansion",
    date: "2026-06-14",
    category: "Company",
    color: "#FFB800",
    title: "Aryorithm Technologies Closes Series B for Sovereign Defense Expansion",
    excerpt: "Funding will expand the Amsterdam lab, grow the Protocol Engineering team, and accelerate the xInfer silicon matrix from 15 to 22 targets by end of 2027.",
    body: "The Series B round enables three priorities: expanding the Amsterdam lab with a dedicated ICS/OT test bed, growing the Protocol Engineering team by 8 engineers, and accelerating the xInfer silicon matrix roadmap from 15 to 22 targets by Q4 2027.\n\nThe Amsterdam lab expansion will include a full substation test environment with real turbine governors, protective relays, and breaker control systems. This allows the Protocol Engineering team to validate physical constraint maps against actual hardware rather than simulators.\n\nThe xInfer silicon matrix expansion will add support for additional NPU architectures, FPGA backends, and emerging accelerators. The goal is to maintain the single-model-graph, zero-copy architecture across all 22 targets.\n\nThis round values Aryorithm at $340M, with participation from existing investors and two new strategic partners in the defense industrial base.",
    author: "Aryorithm Executive Team",
    readTime: "3 min read",
  },
  {
    slug: "iec-62443-3-3-sl2-certification",
    date: "2026-05-03",
    category: "Compliance",
    color: "#00E5FF",
    title: "Aryorithm Achieves IEC 62443-3-3 SL2 Certification",
    excerpt: "The full Blackbox Sentinel product line has achieved Security Level 2 certification under IEC 62443-3-3, covering all 26 subsystems and the Nexus orchestration plane.",
    body: "After a 9-month assessment, the full Blackbox Sentinel product line — including all 26 subsystems, the Nexus orchestration plane, and the xInfer Forge learning pipeline — has achieved IEC 62443-3-3 Security Level 2 certification.\n\nThis covers development processes, product architecture, and field deployment procedures. The certification confirms that Aryorithm's security development lifecycle meets the requirements for industrial control system security.\n\nThe assessment included:\n\nSource code review across all 26 subsystems\n\nBuild pipeline and reproducible build verification\n\nVulnerability management and incident response procedures\n\nField deployment and OTA update security\n\nPhysical security of the Amsterdam lab and build infrastructure\n\nThis certification is available to customers through the Customer Enclave Portal under the compliance documentation section.",
    author: "Aryorithm Compliance Team",
    readTime: "4 min read",
  },
  {
    slug: "open-source-ebpf-verifier-suite",
    date: "2026-03-18",
    category: "Engineering",
    color: "#00FFA3",
    title: "Open-Sourcing the eBPF Verifier Compatibility Suite",
    excerpt: "We are open-sourcing our internal eBPF verifier-compatibility test suite that validates BPF programs across kernel 5.15 through 6.11. Available on the Sentinel-Lab repository.",
    body: "Our internal verifier-compatibility suite has been running in CI for 3 years, validating every BPF program we ship across kernel versions 5.15 through 6.11. We are open-sourcing it because the ecosystem needs a shared conformance baseline.\n\nThe suite includes 2,400+ test cases covering verifier behavior, map types, helper functions, and program types. Each test case includes:\n\nThe BPF C source code\n\nThe expected verifier output (pass or specific error message)\n\nThe kernel versions it applies to\n\nThe verifier flags required\n\nThis suite has caught real bugs: verifier behavior changes between kernel versions, helper function signature changes, and map type restrictions that differ across distributions.\n\nThe suite is available under Apache-2.0 on the Sentinel-Lab repository. We welcome contributions from the community — particularly for kernel versions we don't yet cover.",
    author: "Aryorithm Blackbox Core Team",
    readTime: "5 min read",
  },
];

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return NEWS_ITEMS.find((item) => item.slug === slug);
}
