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
    id: "member-web-1",
    name: "F. Behboudi",
    title: "Full-Stack Developer",
    team: "Web Applications",
    focus: "Portal & APIs",
    color: "#7C6CFF",
    bio: "Full-stack developer working across the web platform, from backend services to the interfaces that consume them. Builds licensing and dashboard features end to end.",
    badges: ["Next.js", "APIs", "Full-stack"],
  },
  {
    id: "member-web-2",
    name: "A. Kholousi",
    title: "Frontend Developer",
    team: "Web Applications",
    focus: "Responsive Interfaces",
    color: "#7C6CFF",
    bio: "Front-end developer building responsive, user-friendly web interfaces across the marketing site and customer portal.",
    badges: ["Next.js", "Responsive UI"],
  },
  {
    id: "member-web-3",
    name: "A. Saffar Hamidi",
    title: "Frontend Developer",
    team: "Web Applications",
    focus: "Design Systems",
    color: "#7C6CFF",
    bio: "Front-end developer focused on the shared frontend shell: design tokens, layout components, and telemetry visualizations.",
    badges: ["Design systems", "Performance"],
  },
  {
    id: "member-web-4",
    name: "P. Dokht Mohammadi",
    title: "Backend Developer",
    team: "Web Applications",
    focus: "APIs & Services",
    color: "#7C6CFF",
    bio: "JavaScript developer specializing in Next.js frontends and Express.js backends. Works on the services behind the web platform.",
    badges: ["Express.js", "REST APIs"],
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
  group: "leadership" | "kernel" | "systems" | "strategy" | "web";
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
  { slug: "web", label: "Web Applications" },
  { slug: "strategy", label: "Compliance & Strategy" },
] as const;

export const GROUP_COLORS: Record<string, string> = {
  leadership: "#00E5FF",
  kernel: "#00FFA3",
  systems: "#FFB800",
  web: "#7C6CFF",
  strategy: "#FF3366",
};

export const DIRECTORY: DirectoryMember[] = [
  {
    slug: "adel-bozorg-bashar",
    name: "Adel Bozorg Bashar",
    title: "Chief Executive Officer (CEO) & Co-Founder",
    group: "leadership",
    tier: "Executive Leadership",
    education: "Business Process Automation & Management",
    email: "adel.bozorgbashar@aryorithm.com",
    github: "https://github.com/adelbozorgbashar",
    badges: ["BPM automation", "Bizagi & UiPath", "Business growth"],
    bio: [
      "Mohammad Jafar (Adel) Bozorg Bashar is a business process automation specialist with over 10 years of experience architecting automated organizational workflows — with hands-on expertise in Bizagi BPMS, UiPath RPA, and n8n, and a recent focus on AI agents that accelerate process effectiveness.",
      "As CEO and co-founder, Adel sets corporate strategy and growth — previously a BPM and automation consultant for over 20 companies across telecommunications, banking, and manufacturing, author of a book on modeling processes with BPMN in Bizagi, and former CEO of an IT and engineering educational institute.",
    ],
    metric: ["Automation consulting", "20+ companies"],
  },
  {
    slug: "kamran-saberifard",
    name: "Kamran Saberifard",
    title: "Chief Technology Officer (CTO), Co-Founder & Kernel Lead",
    group: "leadership",
    tier: "Executive Leadership",
    education: "B.S. Mathematics, Sistan and Baluchestan (2004)",
    email: "kamran.saberifard@aryorithm.com",
    github: "https://github.com/kamisaberi",
    badges: ["High-performance ML", "xTorch (C++)", "libblackbox.so", "libxinfer.so", "eBPF/XDP", "Computer vision"],
    bio: [
      "Kamran Saberifard is an independent researcher, principal AI scientist, and senior programmer with 24 years of experience architecting high-performance machine learning systems — including building the xTorch deep-learning library from the ground up in C++.",
      "As CTO, co-founder, and currently the sole engineer behind the Kernel & Silicon track, Kamran leads research and development across computer vision, generative AI, and recommender systems — and built the six-tier active defense ecosystem: libblackbox.so with driver-level eBPF/XDP mitigation, the universal C++20 libxinfer.so runtime on 15 silicon backends, and the Sentinel Nexus collective defense grid.",
    ],
    metric: ["Engineering experience", "24 yrs"],
  },
  {
    slug: "maedeh-pouresmaeil",
    name: "Maedeh Pouresmaeil",
    title: "Chief Financial Officer (CFO) & Co-Founder",
    group: "leadership",
    tier: "Executive Leadership",
    education: "B.A. English Language (Azad University, Iran)",
    email: "maedeh.pouresmaeil@aryorithm.com",
    badges: ["Corporate finance", "Capital management", "Budgeting & forecasting"],
    bio: [
      "Maedeh Pouresmaeil is a senior finance professional with more than 13 years of experience across corporate finance, strategic planning, and capital management — having served as Chief Financial Officer and Head of Finance within international organizations.",
      "As CFO and co-founder, Maedeh runs financial analysis, budgeting and forecasting, and cash-flow oversight in support of executive decision-making — working fluently across Persian and English, with professional German and foundational French.",
    ],
    metric: ["Finance leadership", "13+ yrs"],
  },
  {
    slug: "sara-seraji",
    name: "Sara Seraji",
    title: "Chief Marketing Officer (CMO) & Co-Founder",
    group: "leadership",
    tier: "Executive Leadership",
    education: "B.Sc. Software Engineering",
    email: "sara.seraji@aryorithm.com",
    badges: ["Management & teamwork", "Software engineering", "Technology programs"],
    bio: [
      "Sara Seraji holds a Bachelor's degree in Software Engineering and brings about 10 years of experience as an office manager — with seasoned practice in management, teamwork, and running technology-related programs.",
      "As CMO and co-founder, Sara leads marketing and growth — continuously deepening her programming and artificial intelligence skills and collaborating across engineering to carry Aryorithm's story to customers and partners.",
    ],
    metric: ["Management experience", "10 yrs"],
  },
  {
    slug: "amirhosein-parsapour",
    name: "Amirhosein Parsapour",
    title: "Data Scientist (Deep Learning & Analytics)",
    group: "systems",
    tier: "Platform & Software Development",
    education: "Computer Engineering, Azad University of Lahijan",
    email: "amirhosein.parsapour@aryorithm.com",
    badges: ["PyTorch", "Deep learning", "NumPy & Pandas", "Data pipelines"],
    bio: [
      "Amirhosein Parsapour is an AI developer and data analyst with 5 years of experience in intelligent systems, specializing in deep learning and data science with an advanced Python stack — large-scale manipulation with NumPy and Pandas and neural network architectures built in PyTorch.",
      "At Aryorithm, Amirhosein owns the end-to-end telemetry data pipeline, from acquisition and structured storage in SQLite to the deep-learning models that separate ambient network behavior from genuine attack patterns.",
    ],
    metric: ["Intelligent systems", "5 yrs"],
  },
  {
    slug: "mehran-saadat",
    name: "Mehran Saadat",
    title: "AI Engineer (Data Pipelines & Analysis)",
    group: "systems",
    tier: "Platform & Software Development",
    education: "Computer Engineering, Azad University of Lahijan",
    email: "mehran.saadat@aryorithm.com",
    badges: ["Python", "PyTorch", "Web scraping", "SQLite"],
    bio: [
      "Mehran Saadat is a Python developer, artificial intelligence engineer, and data analyst with more than 5 years of hands-on Python experience, specializing in deep learning and data analysis — from numerical computing with NumPy to neural network architectures in PyTorch.",
      "At Aryorithm, Mehran builds complete telemetry pipelines, from collection across fleet sources to structured storage and analysis — turning raw appliance data into the datasets our detection models learn from.",
    ],
    metric: ["Python experience", "5+ yrs"],
  },
  {
    slug: "sobhan-nikpour",
    name: "Sobhan Nikpour",
    title: "Lead Data Analyst (Quantitative Research)",
    group: "systems",
    tier: "Platform & Software Development",
    education: "Data Analytics & Quantitative Research",
    email: "sobhan.nikpour@aryorithm.com",
    github: "https://github.com/SbhnNP",
    badges: ["On-chain analytics", "ETL pipelines", "Quantitative modeling"],
    bio: [
      "Sobhan Nikpour is a data analyst and quantitative researcher with over 5 years of experience in analytics and protocol research. He specializes in large-scale data analysis, ETL pipeline development, and quantitative modeling — highly proficient in Python and its libraries like NumPy and Pandas, SQL, and data visualization tools.",
      "At Aryorithm, Sobhan leads threat-data research: engineering analytics pipelines and dashboards that translate complex fleet telemetry into actionable insights, with interests spanning data modeling, behavior analysis, and real-time intelligence.",
    ],
    metric: ["Analytics experience", "5+ yrs"],
  },
  {
    slug: "paria-ranji",
    name: "Paria Ranji",
    title: "Analytics Engineer",
    group: "systems",
    tier: "Platform & Software Development",
    education: "Data Analytics & Python Engineering",
    email: "paria.ranji@aryorithm.com",
    github: "https://github.com/parrnn",
    badges: ["SQL dashboards", "API integration", "Process automation"],
    bio: [
      "Paria Ranji is a data analyst and Python developer with expertise in Python, SQL, NumPy, Pandas, web scraping, API integration, and process automation — having designed analytical dashboards that extract and visualize complex data and built monitoring systems that enhance efficiency.",
      "At Aryorithm, Paria builds the analytical dashboards and automated monitoring behind fleet operations, and is currently expanding into machine learning and deep learning for anomaly detection.",
    ],
    metric: ["Monitoring systems", "real-time"],
  },
  {
    slug: "farzin-behboudi",
    name: "Farzin Behboudi",
    title: "Full-Stack Developer (Web Applications)",
    group: "web",
    tier: "Platform & Software Development",
    education: "Full-Stack Web Development",
    email: "farzin.behboudi@aryorithm.com",
    badges: ["Next.js", "APIs & services", "Portal & dashboard", "Performance tuning"],
    bio: [
      "Farzin Behboudi is a full-stack developer working across the Aryorithm web platform — from backend services and APIs to the interfaces that consume them. He focuses on clean service boundaries, reliable data flow, and responsive user experiences.",
      "At Aryorithm, Farzin builds features end to end: subscription and licensing workflows, dashboard views, and the integration points between the portal frontend and the services behind it — keeping every release fast, tested, and self-hosted.",
    ],
    metric: ["Stack coverage", "frontend→backend"],
  },
  {
    slug: "abolfazl-kholousi",
    name: "Abolfazl Kholousi",
    title: "Frontend Developer (Web Applications)",
    group: "web",
    tier: "Platform & Software Development",
    education: "Frontend Web Development",
    email: "abolfazl.kholousi@aryorithm.com",
    github: "https://github.com/Abol-khls",
    badges: ["Responsive interfaces", "Next.js", "Scalable frontends"],
    bio: [
      "Abolfazl Kholousi is a front-end developer passionate about building responsive and user-friendly web interfaces. He has participated in projects in this field and enjoys creating efficient, scalable solutions that blend design and functionality.",
      "At Aryorithm, Abolfazl turns ideas into seamless digital experiences across the marketing site and customer portal — always exploring modern web technologies to enhance everyday interactions online.",
    ],
    metric: ["Interfaces shipped", "responsive-first"],
  },
  {
    slug: "arshia-saffar-hamidi",
    name: "Arshia Saffar Hamidi",
    title: "Frontend Developer (Web Applications)",
    group: "web",
    tier: "Platform & Software Development",
    education: "Frontend Web Development",
    email: "arshia.saffarhamidi@aryorithm.com",
    badges: ["Responsive interfaces", "Design systems", "Web performance"],
    bio: [
      "Arshia Saffar Hamidi is a front-end developer passionate about building responsive and user-friendly web interfaces. He has participated in projects in this field and enjoys creating efficient, scalable solutions that blend design and functionality.",
      "At Aryorithm, Arshia works on the shared frontend shell — design tokens, layout components, and telemetry visualizations — helping keep every page fast, accessible, and free of third-party dependencies.",
    ],
    metric: ["Design-system coverage", "site-wide"],
  },
  {
    slug: "parsa-dokht-mohammadi",
    name: "Parsa Dokht Mohammadi",
    title: "Backend Developer (Web Applications)",
    group: "web",
    tier: "Platform & Software Development",
    education: "Backend Web Development",
    email: "parsa.dokhtmohammadi@aryorithm.com",
    github: "https://github.com/ParsaDokhtMohammadi",
    badges: ["Next.js", "Express.js", "REST APIs", "Performance optimization"],
    bio: [
      "Parsa Dokht Mohammadi is a full-stack JavaScript developer specializing in Next.js for frontend development and Express.js for backend systems. Passionate about building responsive, user-friendly web applications, Parsa focuses on creating efficient, scalable solutions that bridge design and functionality.",
      "At Aryorithm, Parsa works on the backend services behind the web platform — exploring modern web technologies and performance optimization to make the web faster, smarter, and more accessible.",
    ],
    metric: ["Stack", "Next.js + Express"],
  },
  {
    slug: "vida-entezar",
    name: "Vida Entezar",
    title: "Head of Content Strategy & Growth",
    group: "strategy",
    tier: "Product, Compliance & Commercial Strategy",
    education: "Content Marketing & Strategy",
    email: "vida.entezar@aryorithm.com",
    badges: ["SEO", "Content systems", "Growth analytics"],
    bio: [
      "Vida Entezar is a content marketer and strategist with experience in SEO, data-driven content planning, and performance analysis — building scalable content systems that align user intent, business objectives, and measurable KPIs.",
      "At Aryorithm, Vida owns the content strategy behind docs, insights, and announcements — applying data and AI-powered enrichment to optimize content effectiveness, improve user experience, and support sustainable growth across digital channels.",
    ],
    metric: ["Content-KPI alignment", "data-driven"],
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
