import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "sentinel-nexus"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "collective-defense", label: "Collective Defense" },
  { slug: "active-learning-pipeline", label: "Active Learning Pipeline" },
  { slug: "canary-ota-rollout", label: "Canary OTA Rollout" },
  { slug: "explainable-ai-xai", label: "Explainable AI (XAI)" },
  { slug: "hierarchical-asset-topology", label: "Hierarchical Asset Topology" },
  { slug: "web-command-center", label: "Web Command Center" },
  { slug: "operations-cli-nexus-ctl", label: "Operations CLI" },
  { slug: "rest-api-reference", label: "REST API Reference" },
  { slug: "cloud-saas-uplink", label: "Cloud SaaS Uplink" },
  { slug: "compliance-engines", label: "Compliance Engines" },
  { slug: "tutorials", label: "Tutorials" },
  { slug: "troubleshooting", label: "Troubleshooting" },
]);

export const DOCS_ROOT = api.root;
export const SECTIONS = api.sections;
export const allDocs = api.allDocs;
export const readDoc = api.readDoc;
export const sectionLabel = api.sectionLabel;
