"use client";

import { useState } from "react";
import Link from "next/link";
import { PILLARS } from "@/data/about";

export default function AboutPillars() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PILLARS.map((p) => {
        const open = openId === p.id;
        return (
          <article
            key={p.id}
            className="rounded-md border border-hairline bg-panel"
            style={open ? { borderColor: `${p.color}99`, boxShadow: `0 0 34px -12px ${p.color}` } : undefined}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : p.id)}
              aria-expanded={open}
              aria-controls={`${p.id}-body`}
              className="block w-full px-5 py-5 text-left"
            >
              <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                <span>{p.n}</span>
                <span className="text-[18px]" style={{ transform: open ? "rotate(45deg)" : undefined, color: open ? p.color : undefined }} aria-hidden="true">+</span>
              </p>
              <h3 className="mt-2 font-display text-[17px] font-bold text-ink">{p.name}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{p.claim}</p>
              {!open && <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-cyan">Expand for the engineering rationale +</p>}
            </button>
            {open && (
              <div id={`${p.id}-body`} className="rise-in border-t border-hairline bg-void/45 px-5 py-4">
                <p className="text-[13px] leading-relaxed text-muted">{p.detail}</p>
                <dl className="mt-3 grid gap-2">
                  {p.proof.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 font-mono text-[10.5px]">
                      <dt className="text-muted">{k}</dt>
                      <dd style={{ color: p.color }}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link href={p.link.section ? `${p.link.to}#${p.link.section}` : p.link.to} className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">
                  [ {p.link.label} → ]
                </Link>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
