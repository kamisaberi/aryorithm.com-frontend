export interface Project {
  slug: string;
  name: string;
  tagline: string;
  category: "Platform" | "Engine" | "Research" | "Protocol";
  color: string;
  status: string;
  version: string;
  description: string;
}

export const PROJECTS: Project[] = [
  {
    slug: "blackbox-sentinel",
    name: "Blackbox Sentinel",
    tagline: "Tier 3 Cyber-Physical XDR Appliance",
    category: "Platform",
    color: "#00E5FF",
    status: "Generally Available",
    version: "v4.2.1",
    description: "The flagship edge appliance for sovereign cyber-physical defense. Ships with 26 subsystems, 30 industrial protocol dissectors, and the full eBPF/XDP fast-path mitigation engine.",
  },
  {
    slug: "sentinel-nexus",
    name: "Sentinel Nexus",
    tagline: "Tier 6 Collective Defense Command Plane",
    category: "Platform",
    color: "#FFB800",
    status: "Generally Available",
    version: "v3.1.0",
    description: "The orchestration plane for fleet-wide collective immunity. Manages OTA canary deployments, attestation, and cross-appliance threat correlation.",
  },
  {
    slug: "xinfer-essential",
    name: "xInfer Essential",
    tagline: "Universal Zero-Copy AI Runtime (libxinfer.so)",
    category: "Engine",
    color: "#00FFA3",
    status: "Generally Available",
    version: "v4.2.0",
    description: "libxinfer.so — open-core C++20 execution engine with zero-copy DMA-mapped memory across 15 silicon targets. 11.8µs inference, 1.25M EPS, under 15 MB.",
  },
  {
    slug: "blackbox-essential",
    name: "Blackbox Essential",
    tagline: "In-Kernel Active Defense (libblackbox.so)",
    category: "Engine",
    color: "#00E5FF",
    status: "Generally Available",
    version: "v2.8.3",
    description: "libblackbox.so — wire-speed eBPF/XDP packet dropping in 0.84µs, lock-free SPMC ring at 1.25M EPS, TPM 2.0 silicon root of trust.",
  },
  {
    slug: "xinfer-forge",
    name: "xInfer Forge",
    tagline: "Air-Gapped Continual Learning Service",
    category: "Engine",
    color: "#00FFA3",
    status: "Beta",
    version: "v1.4.0",
    description: "Continual learning pipeline that operates entirely within the air-gapped enclave. Only ambiguous quantized feature vectors — never raw traffic — are eligible for model improvement.",
  },
  {
    slug: "sentinel-lab",
    name: "Sentinel-Lab",
    tagline: "Open Research & Benchmark Platform",
    category: "Research",
    color: "#00E5FF",
    status: "Open Source",
    version: "v2.4.0",
    description: "Tier 5 open research platform for reproducible evaluation of cyber-physical defense systems. Apache-2.0 licensed, free to use.",
  },
  {
    slug: "slab-protocol",
    name: "SLAB Protocol",
    tagline: "Zero-Allocation Binary Wire Protocol",
    category: "Protocol",
    color: "#FF3366",
    status: "Open Standard",
    version: "v1.0.0",
    description: "Synchronous Lightweight Air-gapped Binary wire protocol. Fixed-size frames, zero heap allocations, deterministic serialization for air-gapped environments.",
  },
  {
    slug: "sentinel-matrix",
    name: "Sentinel-Matrix",
    tagline: "Autonomous Cyber-Physical Range & Digital Twins",
    category: "Research",
    color: "#FFB800",
    status: "Generally Available",
    version: "v1.0.0",
    description: "Encapsulated VMware cyber-range on 10.240.0.0/24: 7-channel OmniFlow traffic, real malware PCAP replay, live red-team adversary, closed-loop AI retraining.",
  },
];
