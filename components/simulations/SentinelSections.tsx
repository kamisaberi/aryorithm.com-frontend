"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FORM_FACTORS, MODULES, MODULE_CATEGORIES, PLUGIN_GROUPS, PLUGIN_TOTAL } from "@/data/sentinel";

export default function SentinelSections() {
  const [selected, setSelected] = useState("s-5000");
  const active = FORM_FACTORS.find((f) => f.id === selected) ?? FORM_FACTORS[1];

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODULES.filter((m) => {
      const okCat = cat === "all" || m.cat === cat;
      const okQ = !q || `${m.id} ${m.name} ${m.role} ${m.hook}`.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [query, cat]);

  const drawer = openId ? MODULES.find((m) => m.id === openId) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      <section id="form-factors" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Appliance Form Factors"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">One Policy Artefact. Three Targets.</h2>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {FORM_FACTORS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f.id)}
              aria-pressed={selected === f.id}
              className="rounded-md border bg-panel px-5 py-5 text-left transition-all"
              style={selected === f.id ? { borderColor: `${f.color}88`, boxShadow: `0 0 24px -8px ${f.color}` } : { borderColor: "#1A2232" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: f.color }}>
                {f.model} · {f.klass} {f.featured && "· Most Deployed"}
              </p>
              <p className="mt-2 text-[13.5px] text-muted">{f.tagline}</p>
              <dl className="mt-3 space-y-1 font-mono text-[11px]">
                {f.headline.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
                ))}
              </dl>
            </button>
          ))}
        </div>
        <div key={active.id} className="rise-in mt-4 rounded-md border border-hairline bg-panel p-6">
          <h3 className="font-display text-[18px] font-bold text-ink">{active.model} — {active.klass}</h3>
          <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {active.specs.map(([k, v]) => (
              <div key={k} className="flex flex-col border-b border-hairline/60 pb-2">
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">{k}</dt>
                <dd className="mt-1 text-[13px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="subsystem-matrix" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// 26 Decoupled Native Modules"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">The Subsystem Matrix.</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          <input
            id="module-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, hooks, roles…"
            className="min-w-[220px] flex-1 rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink placeholder:text-muted/40"
          />
          {[{ id: "all", label: "All 26" }, ...MODULE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))].map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-md border px-3 py-2 font-mono text-[11px] ${cat === c.id ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <p role="status" className="mt-3 font-mono text-[11px] text-muted">
          {filtered.length} modules listed{query.trim() && <> · matching &quot;{query.trim()}&quot;</>}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const c = MODULE_CATEGORIES.find((x) => x.id === m.cat);
            return (
              <button
                key={m.id}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpenId(m.id)}
                className="rounded-md border border-hairline bg-panel px-4 py-4 text-left transition-colors hover:border-cyan/50"
              >
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: c?.color }}>
                  {m.id} · {c?.label}
                </p>
                <p className="mt-1.5 font-display text-[15px] font-bold text-ink">{m.name}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{m.role}</p>
                <p className="tabular mt-2 font-mono text-[10px] text-muted">{m.mem}</p>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && <p className="mt-4 font-mono text-[12px] text-muted">No modules match. Clear the search or pick another category.</p>}

        {drawer && (
          <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="module-drawer-title">
            <button type="button" aria-label="Close module detail" onClick={() => setOpenId(null)} className="absolute inset-0 bg-void/70" />
            <aside className="rise-in relative max-h-full w-full max-w-[460px] overflow-y-auto border-l border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{drawer.id}</p>
              <h3 id="module-drawer-title" className="mt-1 font-display text-[20px] font-bold text-ink">{drawer.name}</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{drawer.role}</p>
              <p className="mt-3 font-mono text-[11px] text-kernel">{drawer.hook}</p>
              <div className="mt-3">
                <p className="flex justify-between font-mono text-[10px] text-muted"><span>Resident memory</span><span>{drawer.mem}</span></p>
                <div className="mt-1 h-1.5 rounded bg-hairline">
                  <div className="h-full rounded bg-cyan/70" style={{ width: `${(parseInt(drawer.mem, 10) / 204) * 100}%` }} />
                </div>
              </div>
              <div className="mt-4 rounded-md border border-hairline bg-void/60 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Isolation Contract</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted">
                  <li>Isolated C++20 process — crash never drops wire protection.</li>
                  <li>Hot-upgradeable without enforcement lapse.</li>
                  <li>Zero heap churn in the verdict path.</li>
                  <li>Policy reload is atomic between packet batches.</li>
                </ul>
              </div>
              <Link href="/platform/nexus#nexus-capabilities" onClick={() => setOpenId(null)} className="mt-5 block rounded-md bg-cyan px-4 py-2.5 text-center font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">
                [ Manage via Sentinel Nexus ]
              </Link>
            </aside>
          </div>
        )}
      </section>

      <section id="plugin-showcase" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// "}{PLUGIN_TOTAL} Commercial Industrial Plugins</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Protocol Dissector Catalogue.</h2>
        <p className="mt-3 rounded-md border border-hairline bg-void px-4 py-2.5 font-mono text-[11.5px] text-muted">
          $ nexus-ctl plugin list --loaded · <span className="text-cyan">{PLUGIN_TOTAL} dissectors available</span>
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {PLUGIN_GROUPS.map((g) => (
            <div key={g.id} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[16px] font-bold text-ink">{g.label}</h3>
              <p className="mt-1 text-[12px] text-muted">{g.note}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.plugins.map((p) => (
                  <button
                    key={p.so}
                    type="button"
                    onMouseEnter={() => setHovered(p.so)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(p.so)}
                    onBlur={() => setHovered(null)}
                    className="rounded-md border border-hairline px-2.5 py-1.5 font-mono text-[10.5px] text-muted transition-all hover:text-cyan"
                    style={hovered === p.so ? { borderColor: `${g.color}88`, boxShadow: `0 0 18px -6px ${g.color}` } : undefined}
                    title={p.so}
                  >
                    {hovered === p.so ? `dlopen("${p.so}", RTLD_LAZY)` : p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[10.5px] text-muted">
          All plugins ed25519-signed · verified before symbol resolution | RTLD_LAZY · lazy symbol binding
        </p>
      </section>
    </>
  );
}
