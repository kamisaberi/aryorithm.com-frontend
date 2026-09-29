export interface Pillar {
  id: string;
  n: string;
  name: string;
  color: string;
  claim: string;
  detail: string;
  proof: [string, string][];
  link: { label: string; to: string; section?: string };
}

export const PILLARS: Pillar[] = [
  {
    id: "pillar-cloud", n: "01", name: "Zero Cloud Dependencies", color: "#00E5FF",
    claim: "100% operational functionality in air-gapped enclaves without WAN connectivity or external CDN scripts.",
    detail: "Every capability — capture, dissection, inference, mitigation, attestation, evidence carving and the operator interface — executes on the appliance. There is no control plane to phone home to, no model to fetch, and no third-party script in the UI. Cut the fibre and the defense posture does not change by a single microsecond.",
    proof: [["WAN required for enforcement", "No"], ["External origins loaded by UI", "0"], ["Degradation during partition", "None"]],
    link: { label: "See the local mitigation path", to: "/technology/blackbox", section: "fast-path" },
  },
  {
    id: "pillar-determinism", n: "02", name: "Deterministic Fast-Paths", color: "#00FFA3",
    claim: "Critical inspection engineered strictly in C++20 and eBPF kernel space. Zero garbage collection pauses, zero Python in the execution hot-path.",
    detail: "A sub-millisecond guarantee is incompatible with a nondeterministic runtime. A single garbage collection pause of 40 milliseconds is roughly fifty thousand times the entire mitigation budget, which is why no managed language, interpreter or JIT exists anywhere in the enforcement path. Worst-case latency is engineered and measured, not averaged and hoped for.",
    proof: [["Hot-path language", "C++20 / eBPF"], ["GC pauses", "0"], ["Worst-case drop", "0.84 µs"]],
    link: { label: "Read the kernel internals", to: "/technology/blackbox", section: "kernel-deep-dives" },
  },
  {
    id: "pillar-identity", n: "03", name: "Cryptographic Hardware Identity", color: "#FFB800",
    claim: "Zero-trust trust anchors rooted in physical TPM 2.0 cryptoprocessors rather than spoofable software certificates.",
    detail: "A certificate file can be copied; a MAC address can be set; a software token can be extracted from disk. An endorsement key sealed inside a TPM cannot leave the chip, so an appliance proves what it physically is before the orchestration plane will accept a single verdict from it. Where no TPM exists the system says so explicitly rather than silently failing open.",
    proof: [["Root of trust", "TPM 2.0 silicon"], ["Quote verification", "PCR[0–7]"], ["Fail-open behaviour", "Never"]],
    link: { label: "Inspect the attestation validator", to: "/platform/nexus", section: "nexus-capabilities" },
  },
  {
    id: "pillar-sovereignty", n: "04", name: "Data Sovereignty", color: "#FF3366",
    claim: "Enterprise site telemetry remains the exclusive, uncompromised property of the infrastructure owner.",
    detail: "Your packets are yours. No PCAP, payload or personally identifying record is transmitted off-site under any configuration. Even continual learning respects this: only ambiguous quantised feature vectors — never traffic — are eligible to move, and the operator can disable that uplink entirely without losing detection capability.",
    proof: [["Raw packet egress", "0 B"], ["Telemetry ownership", "Customer"], ["Learning uplink", "Optional"]],
    link: { label: "See the zero-egress learning gate", to: "/technology/forge", section: "learning-pipeline" },
  },
];

export const CONSEQUENCE_TIMELINE: { at: string; event: string; color: string; note: string }[] = [
  { at: "0.84 µs", event: "Aryorithm XDP_DROP", color: "#00FFA3", note: "Frame destroyed in the NIC driver" },
  { at: "~4 ms", event: "Protective relay trips", color: "#00E5FF", note: "Physical consequence begins" },
  { at: "~20 ms", event: "Turbine governor responds", color: "#00E5FF", note: "Mechanical state has changed" },
  { at: "~250 ms", event: "Breaker fully open", color: "#FFB800", note: "Grid event is now irreversible" },
  { at: "15–60 s", event: "Cloud SIEM raises alert", color: "#FF3366", note: "Forensics, not defense" },
];
