import fs from "node:fs";
import path from "node:path";

export interface DocsSection {
  slug: string;
  label: string;
}

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

export interface DocsApi {
  root: string;
  sections: DocsSection[];
  allDocs: () => DocEntry[];
  readDoc: (slug: string[]) => { title: string; body: string; file: string } | null;
  sectionLabel: (slug: string) => string;
}

/** Bind the file-backed docs engine to one product's docs root + sections. */
export function createDocsApi(rootDir: string, sections: DocsSection[]): DocsApi {
  const root = rootDir;

  function allDocs(): DocEntry[] {
    const entries: DocEntry[] = [];
    const indexPath = path.join(root, "index.md");
    if (fs.existsSync(indexPath)) {
      entries.push({ section: "", file: "index.md", slug: [], title: titleOf(indexPath, "Documentation Home") });
    }
    for (const sec of sections) {
      const dir = path.join(root, sec.slug);
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
        const slug = rel.replace(/\.md$/, "").split("/");
        entries.push({
          section: sec.slug,
          file: rel,
          slug,
          title: titleOf(path.join(root, rel), prettyFileName(file)),
        });
      }
    }
    return entries;
  }

  function readDoc(slug: string[]): { title: string; body: string; file: string } | null {
    // Tolerate bookmarked /docs/…/*.md URLs — routes are extensionless.
    if (slug.length > 0 && slug[slug.length - 1].endsWith(".md")) {
      slug = [...slug.slice(0, -1), slug[slug.length - 1].slice(0, -3)];
    }
    if (slug.length === 0) {
      const full = path.join(root, "index.md");
      try {
        const raw = fs.readFileSync(full, "utf8");
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : "Documentation Home";
        return { title, body: raw.replace(/^#\s+.+$/m, "").trim(), file: "index.md" };
      } catch {
        return null;
      }
    }
    const candidates = [
      [...slug.slice(0, -1), `${slug[slug.length - 1]}.md`].join("/"),
      [...slug, "index.md"].join("/"),
    ];
    const base = path.normalize(root) + path.sep;
    for (const rel of candidates) {
      const full = path.normalize(path.join(root, rel));
      if (!full.startsWith(base)) return null;
      try {
        const raw = fs.readFileSync(full, "utf8");
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : slug[slug.length - 1];
        return { title, body: raw.replace(/^#\s+.+$/m, "").trim(), file: rel };
      } catch {
        continue;
      }
    }
    return null;
  }

  function sectionLabel(slug: string): string {
    return sections.find((s) => s.slug === slug)?.label ?? slug;
  }

  return { root, sections, allDocs, readDoc, sectionLabel };
}
