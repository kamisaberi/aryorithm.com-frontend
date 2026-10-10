"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { hub, SILICON_TARGETS, type PluginItem } from "@/lib/hub";
import { prettySilicon } from "@/lib/format";
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

/** Global spotlight menu — Cmd+K / Ctrl+K (§1.2). */
export default function CommandMenu({ open, onClose }: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PluginItem[]>([]);
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
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setItems([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await hub.plugins({ q, limit: 8 });
        setItems(res.items);
        setIndex(0);
      } catch {
        setItems([]);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [query, open]);

  const rows: { group: string; rows: Row[] }[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups: { group: string; rows: Row[] }[] = [];
    if (items.length > 0) {
      groups.push({
        group: "Top Extensions",
        rows: items.map((p) => ({
          key: `ext-${p.slug}`,
          label: p.title,
          hint: `${p.category} · ${p.metrics.install_count} installs${p.author.verified ? " · ✓" : ""}`,
          href: `/plugins/${p.slug}`,
        })),
      });
      const dissectors = items.filter((p) =>
        ["industrial-ot", "energy-utilities", "healthcare-iot", "aviation-defense"].includes(p.category)
      );
      if (dissectors.length > 0) {
        groups.push({
          group: "Protocol Dissectors",
          rows: dissectors.map((p) => ({
            key: `proto-${p.slug}`,
            label: p.title,
            hint: (p.ports || []).map((x) => `Port ${x}`).join(" · ") || p.category,
            href: `/plugins/${p.slug}`,
          })),
        });
      }
    }
    if (q) {
      const silicon = SILICON_TARGETS.filter(
        (s) => s.toLowerCase().includes(q) || prettySilicon(s).toLowerCase().includes(q)
      ).map((s) => ({
        key: `sil-${s}`,
        label: prettySilicon(s),
        hint: "Filter catalog by silicon",
        href: `/explore?silicon=${encodeURIComponent(s)}`,
      }));
      if (silicon.length > 0) groups.push({ group: "Silicon Targets", rows: silicon });
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
            placeholder="Search extensions, protocols, MITRE IDs..."
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-muted">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">
              {query.trim()
                ? "No matches — try a protocol, runtime, or silicon target."
                : "Type to search the extension mesh."}
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
