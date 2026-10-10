"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

interface TerminalTab {
  id: string;
  label: string;
  command: string;
}

interface TerminalProps {
  tabs: TerminalTab[];
  title?: string;
}

/** Install terminal teaser with Edge/Fleet tab toggle + 1-click copy (§2.1A). */
export default function Terminal({ tabs, title = "hub — install" }: TerminalProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline bg-void/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-threat/70" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-telemetry/70" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-kernel/70" aria-hidden="true" />
        <span className="ml-2 font-mono text-[10.5px] text-muted">{title}</span>
        <div className="ml-auto flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-pressed={active === t.id}
              className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                active === t.id
                  ? "border-cyan/60 text-cyan"
                  : "border-hairline text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="terminal-body flex items-center gap-3 overflow-x-auto px-4 py-4">
        <span className="shrink-0 font-mono text-[13px] text-kernel" aria-hidden="true">
          $
        </span>
        <code className="whitespace-nowrap font-mono text-[13px] text-ink">{current.command}</code>
        <span className="caret font-mono text-[13px] text-cyan" aria-hidden="true">
          ▊
        </span>
        <span className="ml-auto shrink-0">
          <CopyButton text={current.command} />
        </span>
      </div>
    </div>
  );
}
