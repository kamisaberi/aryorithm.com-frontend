import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "sentinel-stack"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "installation-phases", label: "Installation Phases" },
  { slug: "dependency-management", label: "Dependency Management" },
  { slug: "compilation-dag-tiers", label: "Compilation DAG Tiers" },
  { slug: "systemd-daemonization", label: "systemd Daemonization" },
  { slug: "verification-and-smoke-tests", label: "Verification & Smoke Tests" },
  { slug: "bridge-to-sentinel-matrix", label: "Bridge to Sentinel-Matrix" },
  { slug: "configuration-and-customization", label: "Configuration & Customization" },
  { slug: "operations-and-makefile", label: "Operations & Makefile" },
  { slug: "troubleshooting", label: "Troubleshooting" },
]);

export const DOCS_ROOT = api.root;
export const SECTIONS = api.sections;
export const allDocs = api.allDocs;
export const readDoc = api.readDoc;
export const sectionLabel = api.sectionLabel;
