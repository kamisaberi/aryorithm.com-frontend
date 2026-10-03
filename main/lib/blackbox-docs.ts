import path from "node:path";
import { createDocsApi } from "@/lib/docs";

const api = createDocsApi(path.join(process.cwd(), "docs", "blackbox-essential"), [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "ebpf-xdp-subsystem", label: "eBPF/XDP Subsystem" },
  { slug: "spmc-ring-buffer", label: "SPMC Ring Buffer" },
  { slug: "hardware-identity-tpm", label: "Hardware Identity & TPM" },
  { slug: "af-xdp-zero-copy", label: "AF_XDP Zero-Copy" },
  { slug: "model-config", label: "ModelConfig Binding" },
  { slug: "api-reference", label: "API Reference" },
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
