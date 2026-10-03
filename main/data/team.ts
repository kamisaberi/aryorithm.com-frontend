export interface Leader {
  id: string;
  role: string;
  focus: string;
  color: string;
  badges: string[];
  bio: string;
  metric: [string, string];
}

export const LEADERS: Leader[] = [
  {
    id: "lead-systems",
    role: "Chief Systems Architect",
    focus: "Kernel & Datapath",
    color: "#00E5FF",
    badges: ["Linux kernel internals", "AF_XDP zero-copy drivers", "eBPF bytecode optimization"],
    bio: "Owns the mitigation datapath end to end: the XDP hook, the AF_XDP UMEM mapping and the lock-free ring that feeds userspace. Previously contributed driver-level networking patches upstream and maintains our verifier-compatibility test suite across kernel 5.15 through 6.11.",
    metric: ["Worst-case drop path", "0.84 µs"],
  },
  {
    id: "lead-silicon",
    role: "Head of Heterogeneous Silicon AI",
    focus: "Compilers & Quantization",
    color: "#00FFA3",
    badges: ["Low-latency compiler quantization", "OpenVINO", "TensorRT", "NPU instruction sets"],
    bio: "Responsible for one model graph executing natively on fifteen accelerators without a staging copy. Work spans int8 calibration that preserves recall, operator fusion, and hand-tuning the tensor arena so each backend addresses the appliance's own DMA-mapped memory.",
    metric: ["Silicon targets shipped", "15"],
  },
  {
    id: "lead-protocol",
    role: "Director of Cyber-Physical Protocol Engineering",
    focus: "OT & SCADA",
    color: "#FFB800",
    badges: ["SCADA reverse-engineering", "Industrial PLC limit state machines", "Hardware constraints"],
    bio: "Builds the dissectors and the physical constraint maps that decide whether a command is legitimate. Spent years on plant floors establishing what a turbine, breaker or infusion pump will actually accept, so enforcement is grounded in mechanical reality rather than packet syntax alone.",
    metric: ["Protocol dissectors", "30"],
  },
  {
    id: "lead-crypto",
    role: "Head of Cryptographic Trust & Attestation",
    focus: "Hardware Root of Trust",
    color: "#FFB800",
    badges: ["TCG specifications expert", "TPM 2.0 PCR Quote validation", "Secure boot chains"],
    bio: "Designs the identity hierarchy that lets the orchestration plane decide whether a node is worth trusting. Covers the TSS2 stack, PCR measurement policy, endorsement key handling, and the deliberate decision that a missing TPM degrades loudly instead of failing open.",
    metric: ["Identity tiers", "3 ordered"],
  },
];

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  team: string;
  focus: string;
  color: string;
  bio: string;
  badges: string[];
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-kernel-1",
    name: "V. Okafor",
    title: "Senior Kernel Engineer",
    team: "Blackbox Core",
    focus: "eBPF Verifier & XDP",
    color: "#00E5FF",
    bio: "Maintains the verifier-compatibility suite across kernel 5.15–6.11. Contributed upstream patches to the BPF subsystem and authored our internal XDP fast-path benchmarks.",
    badges: ["eBPF", "XDP", "Kernel 5.15–6.11"],
  },
  {
    id: "member-kernel-2",
    name: "L. Marchetti",
    title: "Network Datapath Engineer",
    team: "Blackbox Core",
    focus: "AF_XDP & DPDK",
    color: "#00E5FF",
    bio: "Specializes in zero-copy packet paths. Built the AF_XDP UMEM mapping layer and the lock-free ring buffer that feeds captured frames to userspace without a single allocation on the hot path.",
    badges: ["AF_XDP", "DPDK", "Zero-copy"],
  },
  {
    id: "member-compiler-1",
    name: "S. Lindqvist",
    title: "Compiler Engineer",
    team: "xInfer Engine",
    focus: "MLIR & LLVM",
    color: "#00FFA3",
    bio: "Works on the MLIR-based lowering pipeline that takes a single model graph and emits optimized code for 15 silicon backends. Focus on operator fusion and tensor arena layout.",
    badges: ["MLIR", "LLVM", "Operator fusion"],
  },
  {
    id: "member-compiler-2",
    name: "A. Petrov",
    title: "Quantization Specialist",
    team: "xInfer Engine",
    focus: "int8 Calibration",
    color: "#00FFA3",
    bio: "Owns the int8 calibration pipeline that preserves recall across all supported models. Developed the fixed-recall calibration method that lets us quantize without retraining.",
    badges: ["int8", "Calibration", "Fixed-recall"],
  },
  {
    id: "member-ics-1",
    name: "M. Al-Rashid",
    title: "ICS Protocol Engineer",
    team: "Protocol Engineering",
    focus: "Modbus & DNP3",
    color: "#FFB800",
    bio: "Reverse-engineered and built dissectors for Modbus TCP, DNP3, and IEC 61850. Spent years on plant floors mapping what industrial hardware will actually accept before a command is legitimate.",
    badges: ["Modbus", "DNP3", "IEC 61850"],
  },
  {
    id: "member-ics-2",
    name: "J. van der Berg",
    title: "SCADA Systems Engineer",
    team: "Protocol Engineering",
    focus: "S7comm & Profinet",
    color: "#FFB800",
    bio: "Expert in Siemens S7comm and Profinet protocol stacks. Builds the physical constraint maps that distinguish a legitimate PLC command from a spoofed one at the mechanical level.",
    badges: ["S7comm", "Profinet", "PLC constraints"],
  },
  {
    id: "member-crypto-1",
    name: "K. Tanaka",
    title: "Cryptographic Engineer",
    team: "Cryptographic Trust",
    focus: "TPM 2.0 & TSS2",
    color: "#FF3366",
    bio: "Implements the TSS2 stack integration and PCR measurement policy. Designed the endorsement key handling and the fail-closed behavior when a TPM is absent or compromised.",
    badges: ["TPM 2.0", "TSS2", "PCR policy"],
  },
  {
    id: "member-crypto-2",
    name: "E. Novak",
    title: "Trusted Boot Engineer",
    team: "Cryptographic Trust",
    focus: "Secure Boot & Measured Boot",
    color: "#FF3366",
    bio: "Owns the secure boot chain and measured boot implementation. Ensures every appliance proves its identity before the orchestration plane accepts a single verdict from it.",
    badges: ["Secure boot", "Measured boot", "UEFI"],
  },
  {
    id: "member-infra-1",
    name: "D. Kim",
    title: "Infrastructure Engineer",
    team: "Platform",
    focus: "Build Systems & CI",
    color: "#00E5FF",
    bio: "Maintains the air-gapped build infrastructure and CI pipeline. Ensures every binary is reproducible, signed, and verifiable before it reaches a customer appliance.",
    badges: ["CI/CD", "Reproducible builds", "Air-gapped"],
  },
  {
    id: "member-infra-2",
    name: "R. Silva",
    title: "Site Reliability Engineer",
    team: "Platform",
    focus: "Appliance Fleet",
    color: "#00FFA3",
    bio: "Runs the fleet monitoring and OTA canary pipeline. Manages the shadow → 5% cohort → fleet promote rollout that keeps 2,000+ appliances in the field current without downtime.",
    badges: ["Fleet ops", "OTA", "Canary deploys"],
  },
];

export interface DirectoryMember {
  slug: string;
  name: string;
  title: string;
  group: "leadership" | "kernel" | "systems" | "strategy";
  tier: string;
  education: string;
  email: string;
  github?: string;
  pgp?: boolean;
  badges: string[];
  bio: string[];
  metric: [string, string];
}

export const MEMBER_GROUPS = [
  { slug: "leadership", label: "Leadership" },
  { slug: "kernel", label: "Kernel & Silicon" },
  { slug: "systems", label: "Systems & AI" },
  { slug: "strategy", label: "Compliance & Strategy" },
] as const;

export const GROUP_COLORS: Record<string, string> = {
  leadership: "#00E5FF",
  kernel: "#00FFA3",
  systems: "#FFB800",
  strategy: "#FF3366",
};

export const DIRECTORY: DirectoryMember[] = [
  {
    slug: "maarten-van-den-berg",
    name: "Maarten van den Berg",
    title: "Chief Executive Officer (CEO)",
    group: "leadership",
    tier: "Executive Leadership",
    education: "M.Sc. Computer Engineering (TU Delft), MBA (INSEAD)",
    email: "maarten.vandenberg@aryorithm.com",
    badges: ["Enterprise OT sales", "Public procurement", "Dual-use deployment"],
    bio: [
      "Maarten van den Berg brings over 18 years of leadership experience scaling enterprise infrastructure and industrial cybersecurity companies across Europe and North America. Prior to co-founding Aryorithm, he served as VP of Enterprise Sales at a leading European OT security firm, driving regional adoption across energy grids, maritime ports, and manufacturing conglomerates.",
      "At Aryorithm, Maarten leads corporate strategy, investor relations, and government defense partnerships — establishing autonomous active defense as the sovereign security standard for European critical infrastructure under the EU NIS2 Directive, working directly with national cyber agencies, utility boards, and defense accelerators.",
    ],
    metric: ["Leadership experience", "18+ yrs"],
  },
  {
    slug: "kamran-saberifard",
    name: "Kamran Saberifard",
    title: "Chief Technology Officer (CTO) & Chief Systems Architect",
    group: "leadership",
    tier: "Executive Leadership",
    education: "B.Sc. Software Engineering, Systems Architect",
    email: "kamran.saberifard@aryorithm.com",
    github: "https://github.com/kamisaberi",
    pgp: true,
    badges: ["libblackbox.so", "libxinfer.so", "eBPF/XDP", "SPMC rings", "SLAB protocol"],
    bio: [
      "Kamran Saberifard is the creator and chief architect of the Aryorithm six-tier active defense ecosystem. After years investigating the latency barriers of userspace detection engines and cloud SIEM lakes, he engineered libblackbox.so — pioneering driver-level Linux eBPF/XDP hooks for deterministic wire-speed mitigation in 0.84 microseconds.",
      "As CTO, Kamran directs research and systems engineering across all architectural tiers: the universal C++20 libxinfer.so runtime on 15 silicon backends, the lock-free SPMC EventRingBuffer at 1.25M EPS, the SLAB binary wire protocol, and the Sentinel Nexus collective defense grid — keeping every codebase sovereign, air-gapped, and deterministic.",
    ],
    metric: ["Worst-case drop path", "0.84 µs"],
  },
  {
    slug: "annika-lindqvist",
    name: "Annika Lindqvist",
    title: "Chief Financial Officer (CFO) & Head of Corporate Development",
    group: "leadership",
    tier: "Executive Leadership",
    education: "M.Sc. Finance & Economics (Hanken, Helsinki)",
    email: "annika.lindqvist@aryorithm.com",
    badges: ["Deep-tech venture finance", "Horizon Europe", "IP structures"],
    bio: [
      "Annika Lindqvist oversees global financial operations, capital allocation, and corporate governance. With 14+ years in deep-tech venture finance — including Investment Director at a Nordic fund for industrial automation and dual-use software — she has structured dozens of enterprise licensing deals and cross-border IP holdings between the Netherlands and the Baltics.",
      "At Aryorithm, Annika runs fiscal strategy, subsidiary expansion, and European startup-regulatory compliance, balancing hardware appliance CapEx against high-margin cloud SaaS subscriptions and defense procurement escrows.",
    ],
    metric: ["Deep-tech finance", "14+ yrs"],
  },
  {
    slug: "henrik-de-vries",
    name: "Dr. Henrik de Vries",
    title: "Chief Information Security Officer (CISO) & VP of Trust",
    group: "leadership",
    tier: "Executive Leadership",
    education: "Ph.D. Information Security (Royal Holloway), CISSP, CISM",
    email: "henrik.devries@aryorithm.com",
    pgp: true,
    badges: ["SCADA defense", "Zero-trust", "IEC 62443", "CMMC 2.0"],
    bio: [
      "Dr. Henrik de Vries has spent two decades defending national critical infrastructure against nation-state cyber warfare. As CSO of a major Northern European transmission system operator, he protected high-voltage substations and cross-border interconnects, and has advised European task forces on SCADA vulnerability management and incident containment.",
      "At Aryorithm, Henrik directs internal security, sovereign cryptographic key governance, and certification audits — holding every appliance and cloud service to IEC 62443-3-3/4-2, CMMC 2.0 Level 2, and NIST SP 800-171 — and serves as executive liaison to customer CISOs.",
    ],
    metric: ["Critical-infrastructure defense", "20+ yrs"],
  },
  {
    slug: "elena-rostova",
    name: "Dr. Elena Rostova",
    title: "VP of Engineering & Distributed Systems",
    group: "kernel",
    tier: "Core Systems & Deep-Tech Engineering",
    education: "Ph.D. Distributed Systems & Concurrency (ETH Zürich)",
    email: "elena.rostova@aryorithm.com",
    badges: ["Lock-free IPC", "HFT execution engines", "Formal verification"],
    bio: [
      "Dr. Elena Rostova leads core software engineering — CI, testing, and production stabilization of all native C++20 codebases. She previously led a high-frequency trading execution engine team in Amsterdam, optimizing lock-free queues, zero-copy sockets, and core pinning under sub-microsecond SLAs.",
      "Elena owns the Sentinel Nexus Command Plane architecture, scaling collective defense broadcasts to 5,000 edge nodes within 50 milliseconds. Her research spans formal verification of concurrent structures and consensus under hostile networks.",
    ],
    metric: ["Collective fanout", "< 50 ms"],
  },
  {
    slug: "lukas-weber",
    name: "Lukas Weber",
    title: "Head of Linux Kernel & eBPF/XDP Engineering",
    group: "kernel",
    tier: "Core Systems & Deep-Tech Engineering",
    education: "M.Sc. Computer Science (Karlsruhe Institute of Technology)",
    email: "lukas.weber@aryorithm.com",
    badges: ["Linux kernel contributor", "AF_XDP", "BPF CO-RE", "10/40GbE"],
    bio: [
      "Lukas Weber is a Linux kernel contributor and low-level networking specialist leading Aryorithm's eBPF/XDP research group, with senior systems experience across edge networking and virtualization infrastructure.",
      "At Aryorithm, Lukas owns the performance, portability, and safety of xdp_filter.o — including CO-RE via vmlinux.h and BTF — so in-kernel threat filters run reliably across enterprise distributions, RT-PREEMPT kernels, and hypervisor vNICs without host header compilation.",
    ],
    metric: ["Verifier suite", "kernel 5.15–6.11"],
  },
  {
    slug: "tariq-al-mansoor",
    name: "Dr. Tariq Al-Mansoor",
    title: "Head of AI Silicon Compilation & Acceleration",
    group: "kernel",
    tier: "Core Systems & Deep-Tech Engineering",
    education: "Ph.D. Computer Architecture (Imperial College London)",
    email: "tariq.almansoor@aryorithm.com",
    badges: ["INT8/FP8 quantization", "Tensor graphs", "OpenVINO", "TensorRT"],
    bio: [
      "Dr. Tariq Al-Mansoor directs heterogeneous hardware inference, with a background in semiconductor research labs and edge AI vendors and publications on quantization, memory-mapped tensor graphs, and compiler optimizations.",
      "Tariq oversees all 15 silicon backends in libxinfer.so — the unified pointer-mapping engine running neural threat detection natively on OpenVINO NPUs, TensorRT CUDA cores, RKNPU2 engines, and Hailo-8 accelerators with no heap allocation or managed dependencies.",
    ],
    metric: ["Silicon backends", "15"],
  },
  {
    slug: "bram-visser",
    name: "Bram Visser",
    title: "Principal Cyber-Physical (SCADA/ICS) Security Architect",
    group: "kernel",
    tier: "Core Systems & Deep-Tech Engineering",
    education: "B.Sc. Industrial Automation (TU Eindhoven), GICSP",
    email: "bram.visser@aryorithm.com",
    badges: ["Modbus", "DNP3", "PROFINET", "S7Comm", "18_cps_sec"],
    bio: [
      "Bram Visser is an authority on industrial protocols, PLC firmware, and SCADA process safety, with 16 years of field engineering across refineries, offshore platforms, and water utilities — from Stuxnet-style tampering to Industroyer trip commands.",
      "At Aryorithm, Bram leads Subsystem 18 (18_cps_sec) and the 30 industrial protocol plugins, building semantic dissectors that translate mechanical safety envelopes — temperature, pressure, velocity limits — into deterministic in-kernel drop policies.",
    ],
    metric: ["Field engineering", "16 yrs"],
  },
  {
    slug: "sofia-kallas",
    name: "Sofia Kallas",
    title: "Lead Cryptographer & Hardware Silicon Trust Architect",
    group: "kernel",
    tier: "Core Systems & Deep-Tech Engineering",
    education: "M.Sc. Applied Cryptography (University of Tartu)",
    email: "sofia.kallas@aryorithm.com",
    badges: ["TPM 2.0", "TSS2", "Secure boot", "Side-channel resistance"],
    bio: [
      "Sofia Kallas directs Aryorithm's hardware root-of-trust program, with a background in secure elements, PKI, and sovereign e-identity systems from Estonia's digital government ecosystem.",
      "Sofia designed the Adaptive 3-Tier Hardware Identity Engine in libblackbox.so — TCG TSS2 quote verification, endorsement-key binding, and anti-tamper mechanisms guaranteeing no virtual appliance or edge device can be cloned or spoofed across the defense grid.",
    ],
    metric: ["Identity tiers", "3 ordered"],
  },
  {
    slug: "arto-korhonen",
    name: "Arto Korhonen",
    title: "Lead Cloud & SaaS Architect (Backend)",
    group: "systems",
    tier: "Platform & Software Development",
    education: "M.Sc. Software Engineering (Aalto University)",
    email: "arto.korhonen@aryorithm.com",
    badges: ["FastAPI", "Multi-tenancy", "SSE telemetry", "Go"],
    bio: [
      "Arto Korhonen leads cloud platform engineering for app.aryorithm.com and the SaaS sync backend, with a background in real-time telecom backbones built in Helsinki.",
      "Arto architected the multi-tenant REST route tables, JWT middleware, and SSE telemetry multiplexer connecting Nexus to cloud customers — millions of daily fleet events at sub-10ms UI push latency with strict tenant isolation.",
    ],
    metric: ["UI push latency", "< 10 ms"],
  },
  {
    slug: "chantal-dubois",
    name: "Chantal Dubois",
    title: "Lead Frontend Architect & Design Systems Engineer",
    group: "systems",
    tier: "Platform & Software Development",
    education: "B.A. Visual Design & B.Sc. Computer Science (ULB)",
    email: "chantal.dubois@aryorithm.com",
    badges: ["Zero-CDN SPA", "Canvas rendering", "High-density dataviz"],
    bio: [
      "Chantal Dubois directs frontend architecture and UX across the air-gapped embedded command centers and the cloud SaaS app, previously a senior UI/UX engineer at an enterprise observability platform.",
      "Chantal built the Radial Topology Canvas and the real-time MITRE heatmap in Sentinel Nexus, enforcing the strict zero-CDN architecture — instantaneous rendering and microsecond telemetry with no third-party fonts or trackers.",
    ],
    metric: ["External requests", "0"],
  },
  {
    slug: "mateo-rossi",
    name: "Dr. Mateo Rossi",
    title: "Lead Machine Learning Scientist (Continual AI & Forge)",
    group: "systems",
    tier: "Platform & Software Development",
    education: "Ph.D. Machine Learning (Politecnico di Milano)",
    email: "mateo.rossi@aryorithm.com",
    badges: ["Self-supervised learning", "InfoNCE", "MAE", "Adversarial robustness"],
    bio: [
      "Dr. Mateo Rossi leads continual representation learning research, with an academic background in self-supervised learning, information theory, and adversarial robustness.",
      "Mateo engineered the xinfer-forge adaptation pipeline — the 32-dimensional MAE masking strategy and InfoNCE loss letting edge appliances adapt to site drift autonomously — and designed the Golden Attack Regression Safety Gate, proving local fine-tuning cannot be poisoned.",
    ],
    metric: ["Adaptation cycle", "< 20 s CPU"],
  },
  {
    slug: "niels-meijer",
    name: "Niels Meijer",
    title: "Senior Security Verification & Chaos Engineering Lead",
    group: "systems",
    tier: "Platform & Software Development",
    education: "M.Sc. Software Security (University of Amsterdam)",
    email: "niels.meijer@aryorithm.com",
    badges: ["Red-teaming", "OmniFlow", "PCAP replay", "Chaos harnesses"],
    bio: [
      "Niels Meijer leads red-teaming, adversary emulation, and resilience verification, with a background in offensive security and automated exploitation.",
      "Niels built the sentinel-matrix mesh and the OmniFlow traffic engine — the live adversary container, authentic Industroyer/Triton/Stuxnet PCAP streaming, and the chaos harnesses that continuously stress-test automated rollback circuits at wire speed.",
    ],
    metric: ["Replay fidelity", "byte-for-byte"],
  },
  {
    slug: "ingrid-holmberg",
    name: "Ingrid Holmberg",
    title: "VP of Product Management (Critical Infrastructure & Defense)",
    group: "strategy",
    tier: "Product, Compliance & Commercial Strategy",
    education: "M.Sc. Industrial Systems (KTH Stockholm)",
    email: "ingrid.holmberg@aryorithm.com",
    badges: ["Industrial robotics", "Pilot evaluations", "OT workflows"],
    bio: [
      "Ingrid Holmberg leads product strategy across Aryorithm's commercial offerings, previously a principal PM at an industrial robotics and automation manufacturer translating factory-floor requirements into software specs.",
      "Ingrid bridges customer engineering with kernel architects — managing the S-1000/S-5000 appliance lifecycle, municipal utility pilots, and ensuring features serve substation engineers and plant managers directly.",
    ],
    metric: ["Pilot-to-live", "10 days"],
  },
  {
    slug: "sarah-van-leeuwen",
    name: "Dr. Sarah van Leeuwen",
    title: "Head of Global Regulatory Compliance & Certification",
    group: "strategy",
    tier: "Product, Compliance & Commercial Strategy",
    education: "LL.M. Technology Law, Ph.D. Cyber Law & Policy (Leiden)",
    email: "sarah.vanleeuwen@aryorithm.com",
    badges: ["NIS2", "DORA", "CRA", "C3PAO liaison"],
    bio: [
      "Dr. Sarah van Leeuwen directs international cybersecurity compliance and government policy engagement, previously advising on EU cybersecurity legislation across NIS2, DORA, and the Cyber Resilience Act.",
      "At Aryorithm, Sarah designed the automated audit engines (CmmcAuditEngine.cpp, ScadaAuditEngine.cpp), oversees certified evidence packages, liaises with C3PAOs, and helps customers convert verified telemetry into lower insurance premiums and clean statutory reporting.",
    ],
    metric: ["Frameworks covered", "NIS2·DORA·CRA"],
  },
  {
    slug: "marcus-vance",
    name: "Marcus Vance",
    title: "VP of Strategic Partnerships & Industrial Integrations",
    group: "strategy",
    tier: "Product, Compliance & Commercial Strategy",
    education: "B.Sc. Electrical Engineering (Purdue), Executive Fellow (Cambridge)",
    email: "marcus.vance@aryorithm.com",
    badges: ["Intel", "NVIDIA", "Siemens", "ABB", "Schneider"],
    bio: [
      "Marcus Vance leads alliances, silicon partner programs, and integrator channels, with 20 years of enterprise tech sales connecting startups with global hardware leaders across North America, the Nordics, and the Middle East.",
      "Marcus runs engagements with Intel (OpenVINO/Liftoff), NVIDIA (Inception/Jetson), and industrial OEMs — embedding the runtime into third-party industrial PCs and building regional partnerships with defense and infrastructure contractors.",
    ],
    metric: ["Alliance experience", "20 yrs"],
  },
];

export interface Role {
  id: string;
  title: string;
  team: string;
  location: string;
  must: string[];
  nice: string[];
}

export const ROLES: Role[] = [
  { id: "role-kernel", title: "Senior Kernel Datapath Engineer", team: "Blackbox Core", location: "Amsterdam / Remote EU", must: ["C, 5+ yrs systems", "eBPF / XDP in production", "AF_XDP or DPDK experience"], nice: ["Upstream kernel patches", "NIC driver work"] },
  { id: "role-compiler", title: "Compiler & Quantization Engineer", team: "xInfer Engine", location: "Amsterdam / Remote EU", must: ["C++20, 5+ yrs", "MLIR / LLVM or TVM", "int8 calibration at fixed recall"], nice: ["NPU instruction sets", "CUDA kernel authoring"] },
  { id: "role-ics", title: "Industrial Protocol Engineer (ICS/OT)", team: "Protocol Engineering", location: "Amsterdam / field travel", must: ["Modbus, DNP3, IEC 61850 or S7comm", "Binary protocol reverse-engineering", "Plant-floor experience"], nice: ["Safety instrumented systems", "IEC 62443 assessment"] },
  { id: "role-crypto", title: "Attestation & Trusted Computing Engineer", team: "Cryptographic Trust", location: "Amsterdam / Remote EU", must: ["TPM 2.0 / TCG TSS2", "Secure boot & measured boot", "C or Rust"], nice: ["FIPS 140-3 submissions", "HSM integration"] },
];

export const BUGGY_CODE = `// xdp_parse.c — candidate exercise. Compiles, but the verifier rejects it.

SEC("xdp")
int parse_encap(struct xdp_md *ctx) {
  void *data     = (void *)(long)ctx->data;
  void *data_end = (void *)(long)ctx->data_end;

  // Strip a 4-byte encapsulation header.
  if (bpf_xdp_adjust_head(ctx, 4))
    return XDP_DROP;

  // BUG 1: data / data_end are stale. adjust_head invalidated them.
  struct iphdr *ip = data + sizeof(struct ethhdr);

  // BUG 2: unaligned 32-bit read straight off a packet pointer with
  //        no re-validated bounds check. Verifier: "invalid access to
  //        packet, off=+18 size=4" / unaligned access.
  __u32 saddr = *(__u32 *)&ip->saddr;

  __u64 *hits = bpf_map_lookup_elem(&blocked_ip_map, &saddr);
  return hits ? XDP_DROP : XDP_PASS;
}`;

export const FIXED_CODE = `// xdp_parse.c — patched. Verifier-clean at kernel 5.15 → 6.11.

SEC("xdp")
int parse_encap(struct xdp_md *ctx) {
  // Strip the encapsulation header FIRST, then read the pointers.
  if (bpf_xdp_adjust_head(ctx, 4))
    return XDP_DROP;

  // FIX 1: re-load both pointers after every adjust_head call.
  void *data     = (void *)(long)ctx->data;
  void *data_end = (void *)(long)ctx->data_end;

  struct ethhdr *eth = data;
  if ((void *)(eth + 1) > data_end)
    return XDP_PASS;

  struct iphdr *ip = (void *)(eth + 1);

  // FIX 2: bounds-check the header before touching any field, so the
  //        verifier can prove the access is in-range.
  if ((void *)(ip + 1) > data_end)
    return XDP_PASS;

  // FIX 3: byte-safe load. Never assume 4-byte alignment on a
  //        packet pointer — copy into a local first.
  __u32 saddr;
  __builtin_memcpy(&saddr, &ip->saddr, sizeof(saddr));

  __u64 *hits = bpf_map_lookup_elem(&blocked_ip_map, &saddr);
  return hits ? XDP_DROP : XDP_PASS;
}`;

export const VERIFIER_FAIL = `$ bpftool prog load xdp_parse.o /sys/fs/bpf/xdp_parse

libbpf: prog 'parse_encap': BPF program load failed: Permission denied
libbpf: prog 'parse_encap': -- BEGIN PROG LOAD LOG --

  12: (61) r2 = *(u32 *)(r1 +18)
  R1 invalid mem access 'pkt' — pointer arithmetic on stale
  packet pointer after bpf_xdp_adjust_head()

  misaligned packet access off 0+18+0 size 4
  invalid access to packet, off=+18 size=4, R1(id=0,off=18,r=14)
  R1 offset is outside of the packet

  processed 14 insns  ·  2 verifier errors
  -- END PROG LOAD LOG --
  error: failed to load object`;

export const VERIFIER_PASS = `$ bpftool prog load xdp_parse.o /sys/fs/bpf/xdp_parse

libbpf: prog 'parse_encap': relocations applied
libbpf: prog 'parse_encap': BPF program load OK

  pointer re-load after adjust_head ........ verified
  eth header bounds check .................. verified
  ip header bounds check ................... verified
  aligned 32-bit load via memcpy ........... verified

  processed 31 insns  ·  stack depth 8  ·  0 verifier errors
  prog pinned → /sys/fs/bpf/xdp_parse
  attached to enp3s0f1 in XDP_FLAGS_DRV_MODE`;
