import type { PricingTier, CloudRates } from "@/types/pricing";

export const TIERS: PricingTier[] = [
  {
    id: "tier-research",
    n: "Tier 1",
    name: "Open Research",
    audience: "Academic & Community",
    price: "$0",
    priceNote: "Free & Open-Core",
    color: "#8A99AD",
    features: [
      "libxinfer.so core runtime",
      "libblackbox.so core engine",
      "Sentinel-Lab reference benchmarks",
      "Public GitHub repositories",
      "Academic community support",
    ],
    cta: "Access Sentinel-Lab",
    ctaStyle: "ghost",
    ctaTo: "/research/sentinel-lab",
  },
  {
    id: "tier-edge",
    n: "Tier 2",
    name: "Edge Appliance",
    audience: "Commercial Single-Node",
    price: "$4,800",
    priceNote: "per node / year",
    color: "#00E5FF",
    featured: true,
    features: [
      "1× Blackbox Sentinel Node (Turnkey 1U or Virtual VM)",
      "All 26 decoupled subsystem modules",
      "30 industrial OT/IT protocol plugins",
      "Local eBPF drops (< 1.0 ms)",
      "Embedded air-gapped web UI",
    ],
    cta: "Deploy Edge Node",
    ctaStyle: "solid",
    ctaTo: "/contact",
  },
  {
    id: "tier-nexus",
    n: "Tier 3",
    name: "Sentinel Nexus",
    audience: "Enterprise Multi-Site",
    price: "Custom",
    priceNote: "Enterprise Deployment",
    color: "#00FFA3",
    features: [
      "Central Nexus Orchestrator",
      "Up to 5,000 edge appliances",
      "Sub-50 ms collective defense IoC fanout",
      "Automated canary rollout",
      "CMMC / IEC 62443 reporting",
      "xinfer-forge retraining farm",
    ],
    cta: "Request Fleet Architecture",
    ctaStyle: "outline",
    ctaTo: "/contact",
  },
  {
    id: "tier-sovereign",
    n: "Tier 4",
    name: "Sovereign / Defense Enclave",
    audience: "National Infrastructure",
    price: "Classified",
    priceNote: "Custom Procurement",
    color: "#FFB800",
    features: [
      "Fully air-gapped turnkey appliances",
      "Physical TPM 2.0 tamper validation",
      "Cleared deployment engineers",
      "Custom protocol dissector engineering",
      "Source code escrow",
    ],
    cta: "Contact Defense Desk",
    ctaStyle: "ghost",
    ctaTo: "/contact",
    ctaSection: "intake-portals",
  },
];

export const CLOUD_RATES: CloudRates = {
  ingest: 2.5,
  egress: 0.09,
  retain: 0.023,
  compute: 0.12,
  node: 4800,
  siteOverhead: 1850,
};

export const ROI_VOLUME_MIN_LOG = Math.log10(10);
export const ROI_VOLUME_MAX_LOG = Math.log10(10000);

export function sliderToVolume(pos: number): number {
  return Math.pow(10, ROI_VOLUME_MIN_LOG + (pos / 100) * (ROI_VOLUME_MAX_LOG - ROI_VOLUME_MIN_LOG));
}

export function volumeToSlider(gb: number): number {
  return ((Math.log10(gb) - ROI_VOLUME_MIN_LOG) / (ROI_VOLUME_MAX_LOG - ROI_VOLUME_MIN_LOG)) * 100;
}
