"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { appliances, blueprints, hubAssets } from "@/lib/hub";
import { SDK_DOCS } from "@/data/sdkDocs";

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
}

interface Row {
  key: string;
  label: string;
  hint: string;
  href: string;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  package: "Package",
  model: "Model",
  dataset: "Dataset",
  pcap: "PCAP",
  scenario: "Scenario",
  blueprint: "Blueprint",
  appliance: "Appliance",
};

const BROWSE_ROWS: Row[] = [
  { key: "browse-package", label: "Packages", hint: "Native, Wasm & Lua", href: "/packages" },
  { key: "browse-model", label: "Models", hint: "Neural weights", href: "/models" },
  { key: "browse-dataset", label: "Datasets", hint: "SLAB research data", href: "/datasets" },
  { key: "browse-pcap", label: "PCAPs", hint: "Adversary traffic", href: "/pcaps" },
  { key: "browse-scenario", label: "Scenarios", hint: "Digital twin ranges", href: "/scenarios" },
  { key: "browse-blueprint", label: "Blueprints", hint: "Production pipelines", href: "/blueprints" },
  { key: "browse-appliance", label: "Appliances", hint: "Signed .aryopack images", href: "/appliances" },
];

/** Global spotlight menu — Cmd+K / Ctrl+K (§1.2). */
export default function CommandMenu({ open, onClose }: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setItems([]);
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const [catalog, blueprintResult, applianceResult] = await Promise.all([
        hubAssets.search({ q, limit: 30, sort: "downloads" }).catch(() => null),
        blueprints.list({ q, limit: 20, sort: "downloads" }).catch(() => null),
        appliances.list().catch(() => null),
      ]);
      if (cancelled) return;

      const rows: Row[] = [];
      const seen = new Set<string>();
      const add = (row: Row) => {
        if (seen.has(row.key)) return;
        seen.add(row.key);
        rows.push(row);
      };

      for (const item of catalog?.results ?? []) {
        add({
          key: `${item.asset_type}:${item.slug}`,
          label: item.name,
          hint: `${ASSET_TYPE_LABELS[item.asset_type] ?? item.asset_type} · v${item.version}`,
          href: `/assets/${item.asset_type}/${item.slug}`,
        });
      }

      for (const blueprint of blueprintResult?.results ?? []) {
        add({
          key: `blueprint:${blueprint.slug}`,
          label: blueprint.name,
          hint: `Blueprint · v${blueprint.version}`,
          href: `/assets/blueprint/${blueprint.slug}`,
        });
      }

      const needle = q.toLowerCase();
      for (const release of applianceResult?.releases ?? []) {
        const haystack =
          `${release.title} ${release.slug} ${release.industry} ${release.architecture}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
        add({
          key: `appliance:${release.slug}`,
          label: release.title,
          hint: `Appliance · v${release.version}`,
          href: `/assets/appliance/${release.slug}`,
        });
      }

      setItems(rows.slice(0, 12));
      setIndex(0);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, open]);

  const rows: { group: string; rows: Row[] }[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups: { group: string; rows: Row[] }[] = [];
    if (!q) {
      groups.push({ group: "Browse by asset type", rows: BROWSE_ROWS });
    } else {
      if (items.length > 0) groups.push({ group: "Assets", rows: items });
      const docs = SDK_DOCS.filter(
        (d) => d.title.toLowerCase().includes(q) || d.id.includes(q.replace(/\s+/g, "-"))
      ).map((d) => ({
        key: `doc-${d.id}`,
        label: d.title,
        hint: "Developer documentation",
        href: `/docs#${d.id}`,
      }));
      if (docs.length > 0) groups.push({ group: "Developer Documentation", rows: docs });
    }
    return groups;
  }, [items, query]);

  const flat = useMemo(() => rows.flatMap((g) => g.rows), [rows]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const row = flat[index];
      if (row) window.location.href = row.href;
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-row="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-void/80 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <div
        className="rise-in w-full max-w-xl overflow-hidden rounded-md border border-hairline bg-panel shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <span className="font-mono text-[13px] text-cyan" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search all 7 asset types…"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-muted">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">
              No matches — try a protocol, sector, or tier.
            </p>
          ) : (
            rows.map((g) => (
              <div key={g.group}>
                <p className="px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {g.group}
                </p>
                {g.rows.map((row) => {
                  const i = flat.indexOf(row);
                  return (
                    <Link
                      key={row.key}
                      href={row.href}
                      data-row={i}
                      onClick={onClose}
                      className={`flex items-center justify-between gap-3 rounded px-3 py-2 text-[13px] transition-colors ${
                        i === index ? "bg-cyan/10 text-cyan" : "text-ink hover:bg-cyan/[0.05]"
                      }`}
                    >
                      <span className="truncate">{row.label}</span>
                      <span className="shrink-0 font-mono text-[10.5px] text-muted">{row.hint}</span>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-hairline px-4 py-2.5 font-mono text-[10.5px] text-muted">
          <span>↑/↓ to navigate</span>
          <span>↵ to select</span>
          <span className="ml-auto">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
