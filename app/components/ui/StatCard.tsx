import { StatCard as StatCardType } from "@/types/admin";

interface StatCardProps {
  stat: StatCardType;
}

export default function StatCard({ stat }: StatCardProps) {
  const trendColor =
    stat.trend === "up"
      ? "text-kernel"
      : stat.trend === "down"
        ? "text-threat"
        : "text-muted";

  return (
    <div className="admin-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {stat.label}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {stat.value}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan/[0.08] text-[16px] text-cyan" aria-hidden="true">
          {stat.icon}
        </span>
      </div>
      <p className={`tabular mt-3 font-mono text-[11px] ${trendColor}`}>
        {stat.change} <span className="text-muted/60">vs last month</span>
      </p>
    </div>
  );
}
