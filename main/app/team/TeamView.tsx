"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageSidebar from "@/components/layout/PageSidebar";
import EbpfChallenge from "@/components/simulations/EbpfChallenge";
import { DIRECTORY, GROUP_COLORS, MEMBER_GROUPS, ROLES } from "@/data/team";

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function MemberCard({ m }: { m: (typeof DIRECTORY)[number] }) {
  const color = GROUP_COLORS[m.group];
  return (
    <Link
      href={`/team/${m.aliasOf ?? m.slug}`}
      className="group rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/50"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md font-display text-[14px] font-bold"
          style={{ backgroundColor: `${color}18`, color }}
          aria-hidden="true"
        >
          {initials(m.name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-[14px] font-bold text-ink group-hover:text-cyan">{m.name}</h3>
          <p className="truncate font-mono text-[10px] text-muted">{m.title}</p>
        </div>
      </div>
      <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color }}>{m.tier}</p>
      <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted">{m.bio[0]}</p>
      <p className="mt-3 font-mono text-[11px] text-cyan">View profile →</p>
    </Link>
  );
}

export default function TeamView() {
  const [filter, setFilter] = useState("all");
  const counts = useMemo(() => {
    // "All" counts real people only — group aliases (e.g. the Kernel card
    // pointing at the canonical profile) are counted in their own tab.
    const m: Record<string, number> = { all: DIRECTORY.filter((d) => !d.aliasOf).length };
    for (const g of MEMBER_GROUPS) m[g.slug] = DIRECTORY.filter((d) => d.group === g.slug).length;
    return m;
  }, []);
  const exec = DIRECTORY.filter((d) => ["adel-bozorg-bashar", "kamran-saberifard"].includes(d.slug));

  return (
    <>
      <section id="team-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Team & Leadership" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Organizational Directory <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Led by Operators. Built by Specialists.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Deep-tech cybersecurity, kernel systems, and artificial intelligence — from the C-suite to the silicon lab.
            Every profile below loads from the team directory.
          </p>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Team filters">
            {[{ slug: "all", label: "All" }, ...MEMBER_GROUPS].map((g) => (
              <button
                key={g.slug}
                type="button"
                role="tab"
                aria-selected={filter === g.slug}
                onClick={() => setFilter(g.slug)}
                className={`rounded-md border px-3 py-2 font-mono text-[11px] transition-colors ${filter === g.slug ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
              >
                {g.label} ({counts[g.slug] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="executive-board" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Executive Board"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">CEO & CTO.</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {exec.map((m) => {
            const color = GROUP_COLORS[m.group];
            return (
              <Link key={m.slug} href={`/team/${m.slug}`} className="group rounded-md border border-hairline bg-panel p-6 transition-colors hover:border-cyan/50 sm:p-8">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md font-display text-[18px] font-bold"
                    style={{ backgroundColor: `${color}18`, color }}
                    aria-hidden="true"
                  >
                    {initials(m.name)}
                  </div>
                  <div>
                    <h3 className="font-display text-[19px] font-bold text-ink group-hover:text-cyan">{m.name}</h3>
                    <p className="font-mono text-[11px] text-muted">{m.title}</p>
                  </div>
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color }}>{m.education}</p>
                <p className="mt-3 line-clamp-4 text-[13.5px] leading-[1.8] text-muted">{m.bio[0]}</p>
                <p className="mt-3 font-mono text-[11px]"><span className="text-muted">{m.metric[0]}: </span><span className="tabular" style={{ color }}>{m.metric[1]}</span></p>
                <p className="mt-3 font-mono text-[11px] text-cyan">View full profile →</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="directory" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Full Directory"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">
              {filter === "all" ? "Everyone." : MEMBER_GROUPS.find((g) => g.slug === filter)?.label ?? ""}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {DIRECTORY.filter((d) => (filter === "all" ? !d.aliasOf : d.group === filter)).map((m) => (
                <MemberCard key={m.slug} m={m} />
              ))}
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "Directory",
                items: [
                  { label: "Executive Board", href: "#executive-board" },
                  { label: "Full Directory", href: "#directory" },
                  { label: "eBPF Challenge", href: "#ebpf-challenge" },
                  { label: "Open Roles", href: "#careers" },
                ],
              },
            ]}
            cta={{ label: "Contact Systems Team", href: "/contact" }}
          />
        </div>
      </section>

      <section id="ebpf-challenge" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-6 lg:px-8">
        <EbpfChallenge />
      </section>

      <section id="careers" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Open Roles"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Build The Fast Path.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <article key={r.id} className="rounded-md border border-hairline bg-panel p-6">
              <h3 className="font-display text-[16px] font-bold text-ink">{r.title}</h3>
              <p className="mt-1 font-mono text-[10.5px] text-muted">{r.team} · {r.location}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-kernel">Must</p>
              <ul className="mt-1 space-y-1 text-[12.5px] text-muted">{r.must.map((m) => <li key={m}>✓ {m}</li>)}</ul>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-telemetry">Nice</p>
              <ul className="mt-1 space-y-1 text-[12.5px] text-muted">{r.nice.map((m) => <li key={m}>· {m}</li>)}</ul>
              <a href={`mailto:careers@aryorithm.com?subject=${encodeURIComponent(`${r.title} — application`)}`} className="mt-4 block rounded-md border border-cyan/60 px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10">
                [ Apply — {r.title} ]
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
