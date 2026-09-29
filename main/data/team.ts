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
