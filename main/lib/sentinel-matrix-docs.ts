import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "sentinel-matrix"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "vmware-and-networking", label: "VMware & Networking" },
  { slug: "omniflow-traffic-engine", label: "OmniFlow Traffic Engine" },
  { slug: "real-pcap-replay", label: "Real PCAP Replay" },
  { slug: "live-adversary-node", label: "Live Adversary Node" },
  { slug: "observability-and-tui", label: "Observability & TUI" },
  { slug: "closed-loop-active-learning", label: "Closed-Loop Active Learning" },
  { slug: "chaos-and-resilience", label: "Chaos & Resilience" },
  { slug: "operations-and-makefile", label: "Operations & Makefile" },
  { slug: "tutorials", label: "Tutorials" },
  { slug: "troubleshooting", label: "Troubleshooting" },
]);

export const DOCS_ROOT = api.root;
export const SECTIONS = api.sections;
export const allDocs = api.allDocs;
export const readDoc = api.readDoc;
export const sectionLabel = api.sectionLabel;
