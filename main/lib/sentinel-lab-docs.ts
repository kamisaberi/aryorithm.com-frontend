import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "sentinel-lab"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "slab-protocol", label: "SLAB Protocol" },
  { slug: "dual-silicon-testbed", label: "Dual-Silicon Testbed" },
  { slug: "preprint-and-open-science", label: "Preprint & Open Science" },
  { slug: "evaluation-harness", label: "Evaluation Harness" },
  { slug: "comparative-benchmarks", label: "Comparative Benchmarks" },
  { slug: "university-curriculum", label: "University Curriculum" },
  { slug: "tutorials", label: "Tutorials" },
  { slug: "troubleshooting", label: "Troubleshooting" },
]);

export const DOCS_ROOT = api.root;
export const SECTIONS = api.sections;
export const allDocs = api.allDocs;
export const readDoc = api.readDoc;
export const sectionLabel = api.sectionLabel;
