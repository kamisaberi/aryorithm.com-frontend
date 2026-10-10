"use client";

import { PACKAGE_SECTOR_OPTIONS, PACKAGE_TIER_OPTIONS, prettyPackageTier } from "@/data/packages";

export interface ActiveFilters {
  sector: string;
  tier: string;
}

interface FilterRailProps {
  active: ActiveFilters;
  onChange: (next: ActiveFilters) => void;
}

function Group({
  title,
  options,
  active,
  pretty,
  onPick,
}: {
  title: string;
  options: readonly string[];
  active: string;
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
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const identity = (v: string) => v;

/** Sticky left-hand filter rail — sector + execution tier. Single-select per group. */
export default function FilterRail({ active, onChange }: FilterRailProps) {
  const set = (key: keyof ActiveFilters) => (v: string) => onChange({ ...active, [key]: v });
  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-panel">
      <div className="border-b border-hairline bg-void/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Sidebar Filters
      </div>
      <Group
        title="Operational Sector"
        options={PACKAGE_SECTOR_OPTIONS}
        active={active.sector}
        pretty={identity}
        onPick={set("sector")}
      />
      <Group
        title="Execution Tier"
        options={PACKAGE_TIER_OPTIONS.map((t) => t.value)}
        active={active.tier}
        pretty={prettyPackageTier}
        onPick={set("tier")}
      />
    </div>
  );
}
