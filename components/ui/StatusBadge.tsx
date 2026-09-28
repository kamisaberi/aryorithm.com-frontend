export default function StatusBadge({
  color = "#00E5FF",
  children,
}: {
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
      <span style={{ color }}>[</span> {children} <span style={{ color }}>]</span>
    </span>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// "}{children}</span>;
}

export function StatStrip({ items, className = "" }: { items: [string, string, string?][]; className?: string }) {
  return (
    <dl
      className={`grid divide-x divide-hairline border border-hairline ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it) => (
        <div key={it[0]} className="px-3 py-3">
          <dt className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted">{it[0]}</dt>
          <dd className="tabular mt-1 font-mono text-[12px]" style={{ color: it[2] || "#F0F4F8" }}>
            {it[1]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
