"use client";

import { useState } from "react";
import type { EcoTier } from "@/data/home";

export default function EcoTiers({ tiers }: { tiers: EcoTier[] }) {
  const [openId, setOpenId] = useState<string | null>("tier-orchestration");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tiers.map((t) => {
        const open = openId === t.id;
        return (
          <article
            key={t.id}
            className="rounded-md border border-hairline bg-panel"
            style={open ? { borderColor: `${t.color}88`, boxShadow: `0 0 34px -12px ${t.color}` } : undefined}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : t.id)}
              aria-expanded={open}
              aria-controls={`${t.id}-panel`}
              className="block w-full px-5 py-5 text-left"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: t.color }}>
                {t.tier} · {t.product}
              </p>
              <h3 className="mt-2 font-display text-[18px] font-bold text-ink">{t.name}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{t.summary}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                {t.stats.map(([k, v]) => (
                  <div key={k} className="rounded border border-hairline bg-void/60 px-2 py-2">
                    <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">{k}</dt>
                    <dd className="tabular mt-0.5 font-mono text-[11px] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </button>
            {open && (
              <div id={`${t.id}-panel`} className="rise-in border-t border-hairline bg-void/45 px-5 py-4">
                <ol className="list-decimal space-y-2 pl-5 text-[12.5px] leading-relaxed text-muted">
                  {t.detail.map((d) => (
                    <li key={d.slice(0, 24)}>{d}</li>
                  ))}
                </ol>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
