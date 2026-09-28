export interface FleetRegion {
  id: string;
  name: string;
  nodes: number;
  klass: string;
}

export const FLEET_REGIONS: FleetRegion[] = [
  { id: "eu-central-substations", name: "EU-Central Substations", nodes: 1284, klass: "IEC 61850" },
  { id: "apac-manufacturing", name: "APAC Manufacturing", nodes: 1607, klass: "Modbus / S7" },
  { id: "naval-fleet-atlantic", name: "Naval Fleet Atlantic", nodes: 412, klass: "MIL-STD-1553B" },
  { id: "na-hospital-network", name: "NA Hospital Network", nodes: 938, klass: "DICOM / HL7" },
  { id: "sovereign-enclaves", name: "Sovereign Enclaves", nodes: 759, klass: "Kerberos / ZTNA" },
];

export const TOTAL_NODES = FLEET_REGIONS.reduce((a, r) => a + r.nodes, 0);

export interface VectorSample {
  id: string;
  p: number;
  novelty: number;
  label: string;
}

export const VECTOR_SAMPLES: VectorSample[] = [
  { id: "v-1", p: 0.02, novelty: 0.11, label: "Confident benign" },
  { id: "v-2", p: 0.47, novelty: 0.38, label: "Ambiguous — uncertainty band" },
  { id: "v-3", p: 0.99, novelty: 0.21, label: "Confident malicious" },
  { id: "v-4", p: 0.55, novelty: 0.44, label: "Ambiguous — uncertainty band" },
  { id: "v-5", p: 0.08, novelty: 0.82, label: "Novel — autoencoder loss high" },
  { id: "v-6", p: 0.91, novelty: 0.19, label: "Confident malicious" },
  { id: "v-7", p: 0.4, novelty: 0.29, label: "Ambiguous — band edge" },
  { id: "v-8", p: 0.73, novelty: 0.35, label: "Confident malicious" },
];

export function isExported(v: VectorSample): boolean {
  return (v.p >= 0.4 && v.p <= 0.6) || v.novelty > 0.75;
}

export interface CanaryStage {
  id: string;
  name: string;
  color: string;
  cohort: string;
  headline: string;
  rows: [string, string][];
  detail: string;
}

export const CANARY_STAGES: CanaryStage[] = [
  {
    id: "shadow", name: "Stage 1: SHADOW MODE", color: "#00E5FF", cohort: "15 nodes",
    headline: "Runs passively, 0 drops enforced, 24h baseline evaluation",
    rows: [["Enforcement", "DISABLED"], ["Duration", "24h 00m"], ["Verdict Logging", "Shadow only"], ["Drops Applied", "0"]],
    detail: "The candidate model is hot-loaded alongside the incumbent and scored against live traffic without authority to drop a single frame. Divergence between shadow and production verdicts is recorded for the full 24-hour baseline window, establishing a false-positive envelope before any enforcement authority is granted.",
  },
  {
    id: "canary", name: "Stage 2: 5% CANARY COHORT", color: "#FFB800", cohort: "250 nodes",
    headline: "Deployed to hash-selected nodes with amber status",
    rows: [["Cohort Selection", "sha256(node_uuid) % 20"], ["Cohort Size", "250 / 5,000"], ["Status Colour", "AMBER"], ["Gate", "RollbackGuard armed"]],
    detail: "A deterministic hash of each node UUID selects an unbiased 5% cohort spanning every region and protocol class. Those appliances flip to amber in the command center and begin enforcing real drops while RollbackGuard watches latency and false-positive deltas against the 95% control group.",
  },
  {
    id: "promote", name: "Stage 3: FLEET-WIDE PROMOTE", color: "#00FFA3", cohort: "4,735 nodes",
    headline: "Zero-downtime hot-reload across 5,000 appliances",
    rows: [["Reload Mode", "Atomic hot-swap"], ["Packet Loss", "0 frames"], ["Rollout Window", "2m 14s"], ["Final State", "All nodes g.420"]],
    detail: "On a clean canary gate the artefact is promoted to the remaining fleet. Each appliance double-buffers the model graph and atomically swaps the active pointer between packet batches, so enforcement never lapses and not one frame is lost during the transition.",
  },
];

export interface PcrEntry {
  pcr: string;
  role: string;
  golden: string;
  ok: boolean;
}

export const PCR_BANK: PcrEntry[] = [
  { pcr: "PCR[00]", role: "UEFI firmware code", golden: "7f3c9a41…d1e8", ok: true },
  { pcr: "PCR[01]", role: "UEFI config / DMI", golden: "b204ee78…40ac", ok: true },
  { pcr: "PCR[02]", role: "Option ROM code", golden: "19dd0c53…7bb1", ok: true },
  { pcr: "PCR[03]", role: "Option ROM config", golden: "c8a7f102…2e64", ok: true },
  { pcr: "PCR[04]", role: "Boot loader (shim)", golden: "4e91b6da…f0c7", ok: true },
  { pcr: "PCR[05]", role: "GPT partition table", golden: "aa30f79c…51d2", ok: true },
  { pcr: "PCR[06]", role: "Power state events", golden: "6b1e4f88…9a03", ok: true },
  { pcr: "PCR[07]", role: "Secure Boot policy", golden: "d07c2b95…e4f1", ok: true },
];

export const SPOOF_GOLDEN = "2f80ca19…bb47";
export const SPOOF_INDEX = 4;
