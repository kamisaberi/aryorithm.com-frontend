export const FAQ_CATEGORIES = [
  { id: "arch", label: "Architecture & Performance" },
  { id: "silicon", label: "Machine Learning & Silicon Runtime" },
  { id: "learning", label: "Continual Learning & Safety" },
  { id: "attest", label: "Hardware Attestation & Virtualization" },
];

export interface Faq {
  id: string;
  cat: string;
  q: string;
  lead: string;
  paras: string[];
  compare?: [string, string][];
  link: { label: string; to: string; section?: string };
}

export const FAQS: Faq[] = [
  {
    id: "faq-ebpf", cat: "arch",
    q: "Why use eBPF/XDP instead of Suricata or Snort?",
    lead: "Because both of those tools make their decision after the kernel has already built a socket buffer for the packet, and that ordering is what costs the milliseconds.",
    paras: [
      "Suricata and Snort attach at AF_PACKET or NFQUEUE, which means the kernel has already allocated an sk_buff, traversed the network stack, and copied the frame into userspace before inspection begins. That work costs 5–15 ms per packet under load — before a single rule is evaluated.",
      "Blackbox Core attaches at the XDP hook inside the NIC driver. The verified eBPF program hashes the 5-tuple against blocked_ip_map and evaluates compiled constraint rules before any sk_buff exists. A malicious match returns XDP_DROP in 0.84 µs.",
      "This is not a marginal optimisation. It is a different interception depth: the packet is destroyed while it is still raw DMA memory owned by the driver, so volumetric floods are absorbed at the cheapest point in the system rather than the most expensive one.",
      "Signature engines still have a role — which is why Blackbox Sentinel ships IDS/IPS as module 04_ids_ips. But signatures execute after the kernel verdict path has already guaranteed the worst case.",
    ],
    compare: [["libpcap/AF_PACKET", "5.0–15.0ms after sk_buff"], ["NFQUEUE", "8.0–15.0ms after sk_buff"], ["Aryorithm xdp_filter.o", "0.84µs before sk_buff"]],
    link: { label: "See the six-stage fast path", to: "/technology/blackbox", section: "fast-path" },
  },
  {
    id: "faq-linerate", cat: "arch",
    q: "What happens under a volumetric flood — does inspection collapse?",
    lead: "No, because the drop decision is the cheapest path through the system, not the most expensive one.",
    paras: [
      "Under a 14 Mpps SYN flood, the XDP program performs one hash lookup per frame and returns XDP_DROP for matches — no allocation, no ring handoff, no userspace wake. Benign frames continue through the AF_XDP descriptor ring at 1.25M EPS while attack traffic is absorbed at the driver.",
      "Backpressure is explicit: if the userspace ring fills, the producer applies backpressure rather than dropping silently, and every drop is counted in the kernel map so the operator sees exactly what was shed and why.",
      "The measured result on a Xeon D-1747NTE is sustained 1.25M EPS inspection with zero enforcement lapse during flood — published with full methodology in the AF_XDP benchmark paper.",
    ],
    link: { label: "Throughput benchmarks", to: "/insights", section: "publications" },
  },
  {
    id: "faq-zerocopy", cat: "silicon",
    q: "How does xInfer achieve zero-copy inference across 15 platforms?",
    lead: "By using each vendor's own physical memory primitive instead of a portable abstraction layer that would force a copy at every boundary.",
    paras: [
      "Every accelerator vendor exposes a different zero-copy primitive: CUDA unified memory on NVIDIA, ov::Tensor pointer wrapping on Intel, DMA-BUF import on Rockchip, rpcmem on Qualcomm, driver-owned DMA pools on Hailo, on-chip SRAM on Lattice. A portable runtime that abstracted over all of them would copy at each boundary — defeating the purpose.",
      "libxinfer instead resolves the backend at load time via dlopen and maps the caller's DMA buffer with the vendor-native primitive. The feature vector is consumed in place; per-inference cost is a descriptor push, not a data transfer.",
      "The measured spread — 12.4 µs on TensorRT to 44.3 µs on Lattice sensAI — reflects silicon capability, not runtime overhead. The copy count is zero on all fifteen.",
      "The trade-off is engineering surface: fifteen memory strategies must be qualified per release. The silicon matrix documents each one with its DMA chain and worst-case budget.",
    ],
    compare: [["TensorRT", "12.4µs Unified/pinned"], ["Apple CoreML", "14.8µs Unified RAM"], ["OpenVINO", "18.2µs Direct pointer"], ["Rockchip RKNN", "24.1µs DMA-BUF"], ["Lattice sensAI", "44.3µs On-chip SRAM"]],
    link: { label: "Inspect all 15 memory strategies", to: "/technology/xinfer", section: "silicon-matrix" },
  },
  {
    id: "faq-quantisation", cat: "silicon",
    q: "Does int8 quantisation cost detection accuracy?",
    lead: "Measurably, but far less than the latency it buys — and we gate promotion on recall rather than on accuracy.",
    paras: [
      "Across the Sentinel-Lab harness, int8 quantisation costs roughly 0.0003 accuracy relative to fp16 while cutting p99 inference latency by over 30% (18.2 µs → 12.4 µs on the measured pair). The recall delta is smaller still, because quantisation noise distributes across the embedding rather than concentrating on the attack manifold.",
      "Promotion is gated on recall at a fixed false-positive envelope, not on headline accuracy — a candidate that trades attack recall for ambient precision is rejected even if its accuracy improves.",
      "Every artefact ships with its calibration report, so the operator sees the exact measured trade before approving deployment.",
    ],
    link: { label: "How artefacts are compiled", to: "/technology/forge", section: "learning-pipeline" },
  },
  {
    id: "faq-offline-learning", cat: "learning",
    q: "How does xinfer-forge adapt models without internet access?",
    lead: "It learns from the site's own ambient traffic using self-supervision, so it never needs labelled data or an external service.",
    paras: [
      "Step one masks 30% of every 32-dim NetFlow vector and trains an autoencoder to reconstruct it — learning the plant's real traffic topology with zero labels. Step two applies InfoNCE contrastive loss to separate ambient normal telemetry from anomalies in embedding space.",
      "Step three is the non-negotiable regression gate: the candidate is replayed against 18 immutable historical attacks and must detect all of them at a 1.00 rate. A single miss purges the candidate and retains the incumbent.",
      "The entire pipeline runs on the site's own Forge instance. No traffic, label, or gradient ever requires an internet route.",
      "Adaptation cadence is operator-controlled: nightly, weekly, or frozen for the life of the deployment in the most sensitive enclaves.",
    ],
    compare: [["Labels", "0 self-supervised MAE"], ["Raw egress", "0B feature only"], ["Golden detection", "1.00 required non-negotiable"], ["On miss", "purge incumbent retained"]],
    link: { label: "Run the safety gate", to: "/technology/forge", section: "safety-gate" },
  },
  {
    id: "faq-egress", cat: "learning",
    q: "If learning happens locally, what — if anything — ever leaves the site?",
    lead: "Optionally, quantised feature vectors that the local model found genuinely ambiguous. Never packets, payloads or PII. And you can disable even that.",
    paras: [
      "The ForgeBridge gate exports only vectors inside the 0.40–0.60 uncertainty band or above the 0.75 novelty threshold — roughly 3 of every 8 sampled vectors in the reference trace. Each export is a 1.8 KB quantised float array, not a packet, and carries no payload bytes.",
      "The uplink is disabled by default in sovereign configurations and can be severed entirely without losing detection capability — the local model continues enforcing with its current weights indefinitely.",
      "Every export is logged with its vector ID, uncertainty score and destination, so the operator audits exactly what left and why.",
    ],
    link: { label: "The selective uplink gate", to: "/platform/nexus", section: "nexus-capabilities" },
  },
  {
    id: "faq-virtualised", cat: "attest",
    q: "Can Blackbox Sentinel run in virtualized environments like VMware or KVM?",
    lead: "Yes — Model V-Edge is a byte-identical hardened image for vSphere, KVM and Proxmox. What changes is the strength of the identity it can prove, and the system tells you which tier it achieved.",
    paras: [
      "V-Edge runs the identical enforcement path — XDP-equivalent virtio datapath, the same 26 modules, the same 30 dissectors. Policy artefacts are portable between hardware and virtual nodes.",
      "Identity degrades gracefully: where a physical TPM exists it is used (Tier 1); in a virtual estate the engine binds to the hypervisor vTPM via swtpm (Tier 2); where neither exists it derives a composite DMI hash explicitly marked degraded (Tier 3).",
      "The Nexus command center displays the achieved tier per node — never silently. A V-Edge node on a properly configured host with vTPM passthrough achieves Tier 2, which satisfies most enterprise compliance postures.",
      "Throughput also differs: expect AVX-512 CPU inference rather than GPU/NPU acceleration unless vGPU passthrough is configured.",
      "For the strongest trust posture in regulated mandate estates, we recommend S-1000 or S-5000 hardware with discrete TPM 2.0.",
    ],
    compare: [["Tier1 Physical TPM", "/dev/tpmrm0 hardware root"], ["Tier2 vTPM/swtpm", "hypervisor-bound"], ["Tier3 DMI composite", "product_uuid degraded"]],
    link: { label: "The three-tier identity engine", to: "/technology/blackbox", section: "kernel-deep-dives" },
  },
  {
    id: "faq-tpm-fail", cat: "attest",
    q: "What happens if a node fails attestation mid-deployment?",
    lead: "It is denied fleet admission and quarantined. It does not stop enforcing locally, and it is never silently trusted.",
    paras: [
      "On PCR mismatch or signature failure, Nexus refuses the node's verdict stream, marks it quarantined in the command center, and raises a RollbackGuard-class alert. The node continues enforcing its last known-good policy locally — isolation from the fleet never disables local protection.",
      "Re-admission requires a fresh attestation quote against the golden measurement set plus operator approval. Repeated failures escalate to a field-service workflow: measured boot audit, firmware re-flash, and TPM re-provisioning.",
      "The design principle is explicit: fail closed on trust, fail open on protection. A node we cannot verify is a node we do not listen to — but it still defends its own wire.",
    ],
    link: { label: "Attestation validator", to: "/platform/nexus", section: "nexus-capabilities" },
  },
];
