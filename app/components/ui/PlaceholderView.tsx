import Card from "./Card";
import Badge from "./Badge";

interface PlaceholderViewProps {
  title: string;
  description: string;
  icon: string;
  stats?: { label: string; value: string }[];
}

export default function PlaceholderView({ title, description, icon, stats }: PlaceholderViewProps) {
  return (
    <div className="space-y-6">
      <div className="admin-card flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-md bg-cyan/[0.08] text-3xl text-cyan" aria-hidden="true">
          {icon}
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 max-w-md text-[13px] text-muted">{description}</p>
        <div className="mt-4">
          <Badge variant="cyan">Module Active</Badge>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{stat.label}</p>
              <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{stat.value}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
