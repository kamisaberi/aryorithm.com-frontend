"use client";

import { useState } from "react";
import Link from "next/link";
import { StatStrip } from "@/components/ui/StatusBadge";
import { FRAMEWORKS } from "@/data/trust";

export default function TrustCrosswalks() {
  const [openId, setOpenId] = useState<string | null>("fw-cmmc");
  return (
    <div className="space-y-4">
      {FRAMEWORKS.map((f) => {
        const open = openId === f.id;
        return (
          <article key={f.id} className="rounded-md border border-hairline bg-panel" style={open ? { borderColor: `${f.color}88`, boxShadow: `0 0 34px -12px ${f.color}` } : undefined}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : f.id)}
              aria-expanded={open}
              aria-controls={`${f.id}-body`}
              className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left"
            >
              <span className="rounded border border-hairline px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: f.color }}>
                {f.short} · {f.controls.length}
              </span>
              <span className="min-w-[220px] flex-1">
                <span className="block font-display text-[15px] font-bold text-ink">{f.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-muted">{f.authority}</span>
              </span>
              <span className="font-mono text-[18px] text-muted" style={{ transform: open ? "rotate(45deg)" : undefined }} aria-hidden="true">+</span>
            </button>
            <div className="px-5 pb-4"><StatStrip items={f.stats} /></div>
            {open && (
              <div id={`${f.id}-body`} className="rise-in space-y-3 border-t border-hairline bg-void/45 px-5 py-5">
                <p className="max-w-3xl text-[13px] text-muted">{f.blurb}</p>
                {f.controls.map((c) => (
                  <ControlRow key={c.id} control={c} color={f.color} />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ControlRow({ control, color }: { control: (typeof FRAMEWORKS)[number]["controls"][number]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-hairline bg-panel">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
        <span className="rounded border border-hairline px-2 py-1 font-mono text-[9.5px] text-cyan">{control.id}</span>
        <span className="flex-1">
          <span className="block text-[13.5px] font-medium text-ink">{control.title} — {control.claim}</span>
        </span>
        <span className="font-mono text-[16px] text-muted" style={{ transform: open ? "rotate(45deg)" : undefined, color: open ? color : undefined }} aria-hidden="true">+</span>
      </button>
      {open && (
        <div className="rise-in border-t border-hairline bg-void/45 px-4 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted">{control.detail}</p>
          <p className="mt-2 font-mono text-[10.5px] text-muted">Parent control: <span className="text-ink">{control.parent}</span></p>
          <p className="mt-1 font-mono text-[10.5px]" style={{ color }}>Evidence artefact: {control.evidence}</p>
          <Link href={control.link.section ? `${control.link.to}#${control.link.section}` : control.link.to} className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">
            [ View implementing subsystem → ]
          </Link>
        </div>
      )}
    </div>
  );
}
