"use client";

import { useState } from "react";
import { StatStrip } from "@/components/ui/StatusBadge";

export interface Capability {
  id: string;
  index: string;
  name: string;
  sub: string;
  color: string;
  blurb: string;
  stats: [string, string, string?][];
}

export default function CapabilityPanels({
  capabilities,
  sims,
}: {
  capabilities: Capability[];
  sims: Record<string, () => JSX.Element>;
}) {
  const [openId, setOpenId] = useState<string | null>("cap-ioc");
  return (
    <div className="space-y-4">
      {capabilities.map((cap) => {
        const open = openId === cap.id;
        const Sim = sims[cap.id];
        return (
          <article
            key={cap.id}
            className="rounded-md border border-hairline bg-panel"
            style={open ? { borderColor: `${cap.color}88`, boxShadow: `0 0 34px -12px ${cap.color}` } : undefined}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : cap.id)}
              aria-expanded={open}
              aria-controls={`${cap.id}-body`}
              className="flex w-full items-start gap-4 px-5 py-5 text-left lg:px-7"
            >
              <span className="font-mono text-[12px] text-muted">{cap.index}</span>
              <span className="flex-1">
                <span className="block font-display text-[17px] font-bold text-ink">{cap.name}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{cap.sub}</span>
                <span className="mt-2 block max-w-3xl text-[13px] leading-relaxed text-muted">{cap.blurb}</span>
              </span>
              <span className="font-mono text-[18px] text-muted" style={{ transform: open ? "rotate(45deg)" : undefined }} aria-hidden="true">+</span>
            </button>
            <div className="px-5 pb-4 lg:px-7">
              <StatStrip items={cap.stats} />
            </div>
            {open && Sim && (
              <div id={`${cap.id}-body`} className="rise-in border-t border-hairline px-5 py-5 lg:px-7">
                <Sim />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
