import fs from "node:fs";
import path from "node:path";

export const DOCS_ROOT = path.join(process.cwd(), "docs", "xinfer-essential");

export const SECTIONS: { slug: string; label: string }[] = [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "architecture", label: "Architecture" },
  { slug: "silicon-backends", label: "Silicon Backends" },
  { slug: "memory-management", label: "Memory Management" },
  { slug: "plugin-development", label: "Plugin Development" },
  { slug: "model-hub", label: "Model Hub" },
  { slug: "api-reference", label: "API Reference" },
  { slug: "tutorials", label: "Tutorials" },
  { slug: "benchmarking", label: "Benchmarking" },
  { slug: "troubleshooting", label: "Troubleshooting" },
];

export interface DocEntry {
  section: string;
  file: string;
  slug: string[];
  title: string;
}

function titleOf(fullPath: string, fallback: string): string {
  try {
    const text = fs.readFileSync(fullPath, "utf8");
    const m = text.match(/^#\s+(.+)$/m);
    if (m) return m[1].trim();
  } catch {
    /* unreadable — fall through */
  }
  return fallback;
}

function prettyFileName(file: string): string {
  return file
    .replace(/\.md$/, "")
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** All doc pages in manifest order (index first, then section by section). */
export function allDocs(): DocEntry[] {
  const entries: DocEntry[] = [];
  const indexPath = path.join(DOCS_ROOT, "index.md");
  if (fs.existsSync(indexPath)) {
    entries.push({ section: "", file: "index.md", slug: [], title: titleOf(indexPath, "Documentation Home") });
  }
  for (const sec of SECTIONS) {
    const dir = path.join(DOCS_ROOT, sec.slug);
    let files: string[] = [];
    try {
      files = fs
        .readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".md"))
        .sort();
    } catch {
      continue;
    }
    for (const file of files) {
      const rel = `${sec.slug}/${file}`;
      // Flatten standard-plugins/ one level so URLs stay readable.
      const slug = rel.replace(/\.md$/, "").split("/");
      entries.push({
        section: sec.slug,
        file: rel,
        slug,
        title: titleOf(path.join(DOCS_ROOT, rel), prettyFileName(file)),
      });
    }
  }
  return entries;
}

/** Read one doc file; returns null for missing files or path escapes. */
export function readDoc(slug: string[]): { title: string; body: string } | null {
  const candidates = [
    [...slug.slice(0, -1), `${slug[slug.length - 1]}.md`].join("/"),
    [...slug, "index.md"].join("/"),
  ];
  for (const rel of candidates) {
    const full = path.normalize(path.join(DOCS_ROOT, rel));
    if (!full.startsWith(path.normalize(DOCS_ROOT) + path.sep)) return null;
    try {
      const raw = fs.readFileSync(full, "utf8");
      const titleMatch = raw.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : slug[slug.length - 1];
      // Drop the H1 — the page hero already shows the manifest title.
      const body = raw.replace(/^#\s+.+$/m, "").trim();
      return { title, body };
    } catch {
      continue;
    }
  }
  return null;
}

export function sectionLabel(slug: string): string {
  return SECTIONS.find((s) => s.slug === slug)?.label ?? slug;
}
