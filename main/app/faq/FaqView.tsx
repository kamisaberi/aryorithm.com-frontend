"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { FAQ_CATEGORIES, FAQS } from "@/data/faq";

export default function FaqView() {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>("faq-ebpf");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      const okC = cat === "all" || f.cat === cat;
      const okQ = !q || `${f.q} ${f.lead} ${f.paras.join(" ")}`.toLowerCase().includes(q);
      return okC && okQ;
    });
  }, [cat, query]);

  const grouped = FAQ_CATEGORIES.map((c) => ({ cat: c, items: filtered.filter((f) => f.cat === c.id) })).filter((g) => g.items.length > 0);
  const catColor = (id: string) => ({ arch: "#00E5FF", silicon: "#00FFA3", learning: "#FFB800", attest: "#FF3366" })[id] ?? "#00E5FF";

  return (
    <>
      <section id="faq-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Research" }, { label: "Architectural FAQ" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Deep-Tech Architectural Q&amp;A <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            The Questions Engineers Actually Ask.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Answers written at the level of the person evaluating this for a substation, not at the level of a
            procurement summary. Where a trade-off exists, it is stated plainly.
          </p>
        </div>
      </section>

      <section id="faq-accordion" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <input
            id="faq-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="min-w-[200px] flex-1 rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink placeholder:text-muted/40"
          />
          {[{ id: "all", label: `All ${FAQS.length}` }, ...FAQ_CATEGORIES.map((c) => ({ id: c.id, label: `${c.label} (${FAQS.filter((f) => f.cat === c.id).length})` }))].map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-md border px-3 py-2 font-mono text-[11px] ${cat === c.id ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <p role="status" className="mt-3 font-mono text-[11px] text-muted">
          {filtered.length} questions listed{query.trim() && <> · matching &quot;{query.trim()}&quot;</>}
        </p>

        <div className="mt-6 space-y-8">
          {grouped.map((g) => (
            <div key={g.cat.id}>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: catColor(g.cat.id) }}>
                {"// "}{g.cat.label}
              </h2>
              <div className="mt-3 space-y-3">
                {g.items.map((f) => {
                  const open = openId === f.id;
                  const color = catColor(f.cat);
                  return (
                    <article key={f.id} id={f.id} className="scroll-mt-24 rounded-md border border-hairline bg-panel" style={open ? { borderColor: `${color}88`, boxShadow: `0 0 34px -12px ${color}` } : undefined}>
                      <button type="button" onClick={() => setOpenId(open ? null : f.id)} aria-expanded={open} className="block w-full px-5 py-4 text-left">
                        <span className="block font-display text-[15px] font-bold text-ink">{f.q}</span>
                        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-muted">{f.lead}</span>
                      </button>
                      {open && (
                        <div className="rise-in space-y-3 border-t border-hairline bg-void/45 px-5 py-4">
                          {f.paras.map((p) => (
                            <p key={p.slice(0, 32)} className="text-[13px] leading-[1.8] text-muted">{p}</p>
                          ))}
                          {f.compare && (
                            <dl className="grid gap-1.5 font-mono text-[11px] sm:grid-cols-2">
                              {f.compare.map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2 rounded border border-hairline px-3 py-2">
                                  <dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          <Link href={f.link.section ? `${f.link.to}#${f.link.section}` : f.link.to} className="inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">
                            [ {f.link.label} → ]
                          </Link>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-md border border-hairline bg-panel p-6 text-center">
          <h2 className="font-display text-[19px] font-bold text-ink">Not Answered Here?</h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-muted">
            These answers are written by the engineers who own the code. Ask anything else directly.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/contact#intake-portals" className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">[ Ask A Field Architect ]</Link>
            <Link href="/insights" className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">[ Read The Long-Form Papers ]</Link>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
