export default function MatrixTable({
  head,
  rows,
}: {
  head: [string, string, string];
  rows: [string, string, string][];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-hairline bg-void/70 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            <th className="px-4 py-3 font-medium">{head[0]}</th>
            <th className="px-4 py-3 font-medium">{head[1]}</th>
            <th className="px-4 py-3 font-medium text-cyan">{head[2]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="matrix-row border-b border-hairline/60 last:border-0">
              <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{r[0]}</td>
              <td className="px-4 py-3 text-[12.5px] text-muted">{r[1]}</td>
              <td className="px-4 py-3 text-[12.5px] font-medium text-ink">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
