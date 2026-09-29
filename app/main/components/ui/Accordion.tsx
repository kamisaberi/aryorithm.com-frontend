"use client";

import { useState } from "react";

export default function Accordion({
  id,
  title,
  badge,
  color = "#00E5FF",
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  badge?: string;
  color?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-md border transition-colors"
      style={{ borderColor: open ? `${color}88` : undefined, boxShadow: open ? `0 0 34px -12px ${color}` : undefined }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <span className="font-mono text-[11px] text-muted">{badge}</span>
        <span className="flex-1">
          <span className="block text-[14.5px] font-medium text-ink">{title}</span>
        </span>
        <span
          className="font-mono text-[16px] text-muted transition-transform"
          style={{ transform: open ? "rotate(45deg)" : undefined, color: open ? color : undefined }}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      {open && (
        <div id={`${id}-body`} className="rise-in border-t border-hairline bg-void/45 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
