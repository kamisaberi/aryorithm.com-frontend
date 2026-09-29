"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PLATFORMS, SILICON_CLASSES } from "@/data/xinfer";

const FASTEST = Math.min(...PLATFORMS.map((p) => p.latency));
const SLOWEST = Math.max(...PLATFORMS.map((p) => p.latency));
const RANKED = [...PLATFORMS].sort((a, b) => a.latency - b.latency);

function DmaDiagram({ stages, color }: { stages: string[]; color: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => (s + 1) % (stages.length + 1)), 900);
    return () => window.clearInterval(id);
  }, [stages.length]);
  return (
    <div>
      {stages.map((s, i) => (
        <div key={s}>
          <div
            className="rounded border px-3 py-2 font-mono text-[11px]"
            style={step > i ? { borderColor: `${color}88`, color } : { borderColor: "#1A2232", color: "#8A99AD" }}
          >
            {i + 1}. {s}
          </div>
          {i < stages.length - 1 && <div className="mx-auto h-3 w-px" style={{ background: step > i ? color : "#1A2232" }} />}
        </div>
      ))}
      <p className="mt-2 font-mono text-[10px] text-muted">memcpy count: 0 · buffer ownership retained by caller</p>
    </div>
  );
}

export default function XinferSections() {
  const [klass, setKlass] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLATFORMS.filter((p) => {
      const okK = klass === "all" || p.klass === klass;
      const okQ = !q || `${p.vendor} ${p.name} ${p.artifacts.join(" ")} ${p.memory} ${p.accel}`.toLowerCase().includes(q);
      return okK && okQ;
    });
  }, [klass, query]);

  const drawer = openId ? PLATFORMS.find((p) => p.id === openId) : null;
  const klassColor = (id: string) => SILICON_CLASSES.find((c) => c.id === id)?.color ?? "#00E5FF";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="silicon-matrix" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// 15-Platform Silicon Matrix"}</p>
      <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Every Backend. Zero Copies.</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        <input
          id="silicon-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendors, artifacts, memory…"
          className="min-w-[220px] flex-1 rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink placeholder:text-muted/40"
        />
        {[{ id: "all", label: "All 15" }, ...SILICON_CLASSES.map((c) => ({ id: c.id, label: c.label }))].map((c) => (
          <button key={c.id} type="button" onClick={() => setKlass(c.id)} className={`rounded-md border px-3 py-2 font-mono text-[11px] ${klass === c.id ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <p role="status" className="mt-3 font-mono text-[11px] text-muted">{filtered.length} of 15 platforms listed</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const color = klassColor(p.klass);
          const rank = RANKED.findIndex((r) => r.id === p.id) + 1;
          return (
            <button key={p.id} type="button" onClick={() => setOpenId(p.id)} className="rounded-md border border-hairline bg-panel px-4 py-4 text-left transition-colors hover:border-cyan/50">
              <p className="flex justify-between font-mono text-[10px] text-muted"><span>{p.n}</span><span style={{ color }}>{p.vendor}</span></p>
              <p className="mt-1 font-display text-[15px] font-bold text-ink">{p.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.artifacts.map((a) => (
                  <span key={a} className="rounded border border-hairline px-1.5 py-0.5 font-mono text-[9.5px] text-muted">{a}</span>
                ))}
              </div>
              <p className="mt-2 font-mono text-[10.5px]" style={{ color }}>{p.memory}</p>
              <p className="tabular mt-2 font-mono text-[11px] text-ink">MAE bench {p.latency.toFixed(1)} µs · rank {rank}/15</p>
              <div className="mt-1.5 h-1.5 rounded bg-hairline">
                <div className="h-full rounded" style={{ width: `${((SLOWEST - p.latency) / (SLOWEST - FASTEST)) * 82 + 18}%`, background: color }} />
              </div>
            </button>
          );
        })}
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="silicon-drawer-title">
          <button type="button" aria-label="Close platform detail" onClick={() => setOpenId(null)} className="absolute inset-0 bg-void/70" />
          <aside className="rise-in relative max-h-full w-full max-w-[470px] overflow-y-auto border-l border-hairline bg-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{drawer.n} · {drawer.vendor}</p>
            <h3 id="silicon-drawer-title" className="mt-1 font-display text-[20px] font-bold text-ink">{drawer.name}</h3>
            <p className="mt-2 font-mono text-[11px] text-cyan">{drawer.backend}</p>
            <p className="mt-1 font-mono text-[11px] text-muted">{drawer.accel}</p>
            <div className="mt-4">
              <DmaDiagram stages={drawer.dma} color={klassColor(drawer.klass)} />
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{drawer.note}</p>
            <p className="tabular mt-4 font-mono text-[26px] text-kernel">{drawer.latency.toFixed(1)} µs</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10.5px]">
              {[["Model", "MAE 32-dim NetFlow"], ["Batch", "1 (online)"], ["Precision", "int8/fp16"], ["Fleet Rank", `${RANKED.findIndex((r) => r.id === drawer.id) + 1} of 15`]].map(([k, v]) => (
                <div key={k} className="rounded border border-hairline px-3 py-2"><dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-3 font-mono text-[10px] text-muted">Sentinel-Lab measurement · p99 single-vector inference.</p>
            <Link href="/technology/forge" onClick={() => setOpenId(null)} className="mt-4 block rounded-md bg-cyan px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void">
              [ Compile Artifacts In xInfer Forge ]
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
