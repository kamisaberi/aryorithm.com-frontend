import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "blackbox-sentinel"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "subsystems-26", label: "26 Subsystems" },
  { slug: "plugins-30", label: "30 Plugins" },
  { slug: "nexus-uplink", label: "Nexus Uplink" },
  { slug: "web-command-center", label: "Web Command Center" },
  { slug: "licensing-and-entitlements", label: "Licensing & Entitlements" },
  { slug: "configuration-reference", label: "Configuration Reference" },
  { slug: "tutorials", label: "Tutorials" },
  { slug: "compliance", label: "Compliance" },
  { slug: "troubleshooting", label: "Troubleshooting" },
]);

export const DOCS_ROOT = api.root;
export const SECTIONS = api.sections;
export const allDocs = api.allDocs;
export const readDoc = api.readDoc;
export const sectionLabel = api.sectionLabel;
