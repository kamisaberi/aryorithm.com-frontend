"use client";

import type { Facets } from "@/lib/hub";
import { prettyCategory, prettyRuntime, prettySilicon, prettyTier } from "@/lib/format";
import { CATEGORIES, RUNTIMES, SILICON_TARGETS, VERIFICATION_TIERS } from "@/lib/hub";

export interface ActiveFilters {
  category: string;
  runtime: string;
  silicon: string;
  tier: string;
}

interface FilterRailProps {
  facets: Facets | null;
  active: ActiveFilters;
  onChange: (next: ActiveFilters) => void;
}

function Group({
  title,
  options,
  active,
  counts,
  pretty,
  onPick,
}: {
  title: string;
  options: readonly string[];
  active: string;
  counts: Record<string, number> | undefined;
  pretty: (v: string) => string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="border-b border-hairline/70 px-4 py-4 last:border-0">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{title}</h3>
      <ul className="mt-2.5 space-y-1.5">
        {options.map((opt) => {
          const on = active === opt;
          return (
            <li key={opt}>
              <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] transition-colors hover:text-cyan">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onPick(on ? "all" : opt)}
                  className="h-3.5 w-3.5 shrink-0 accent-[#00E5FF]"
                />
                <span className={on ? "text-cyan" : "text-muted"}>{pretty(opt)}</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted/70">
                  {counts?.[opt] ?? 0}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Sticky left-hand faceted filter rail (§2.2A). Single-select per group. */
export default function FilterRail({ facets, active, onChange }: FilterRailProps) {
  const set = (key: keyof ActiveFilters) => (v: string) => onChange({ ...active, [key]: v });
  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-panel">
      <div className="border-b border-hairline bg-void/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Sidebar Filters
      </div>
      <Group
        title="Operational Domain"
        options={CATEGORIES}
        active={active.category}
        counts={facets?.categories}
        pretty={prettyCategory}
        onPick={set("category")}
      />
      <Group
        title="Runtime Environment"
        options={RUNTIMES}
        active={active.runtime}
        counts={facets?.runtimes}
        pretty={prettyRuntime}
        onPick={set("runtime")}
      />
      <Group
        title="Silicon Acceleration"
        options={SILICON_TARGETS}
        active={active.silicon}
        counts={facets?.silicon_targets}
        pretty={prettySilicon}
        onPick={set("silicon")}
      />
      <Group
        title="Verification Status"
        options={VERIFICATION_TIERS}
        active={active.tier}
        counts={facets?.verification_tiers}
        pretty={prettyTier}
        onPick={set("tier")}
      />
    </div>
  );
}
