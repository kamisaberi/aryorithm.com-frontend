import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "xinfer-forge"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "self-supervised-engine", label: "Self-Supervised Engine" },
  { slug: "safety-regression-gate", label: "Safety Regression Gate" },
  { slug: "compilation-and-staging", label: "Compilation & Staging" },
  { slug: "nexus-integration", label: "Nexus Integration" },
  { slug: "cli-reference", label: "CLI Reference" },
  { slug: "tutorials", label: "Tutorials" },
  { slug: "benchmarking", label: "Benchmarking" },
  { slug: "compliance", label: "Compliance" },
  { slug: "troubleshooting", label: "Troubleshooting" },
]);

export const DOCS_ROOT = api.root;
export const SECTIONS = api.sections;
export const allDocs = api.allDocs;
export const readDoc = api.readDoc;
export const sectionLabel = api.sectionLabel;
