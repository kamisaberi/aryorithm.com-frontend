import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { DIRECTORY, GROUP_COLORS, MEMBER_GROUPS } from "@/data/team";

export function generateStaticParams() {
  return DIRECTORY.filter((m) => !m.aliasOf).map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const m = DIRECTORY.find((x) => x.slug === params.slug);
  if (!m || m.aliasOf) return { title: "Team Member | Aryorithm" };
  return {
    title: `${m.name} — ${m.title} | Aryorithm`,
    description: `${m.name}, ${m.title} at Aryorithm Technologies. ${m.bio[0].slice(0, 140)}…`,
  };
}

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export default function MemberProfilePage({ params }: { params: { slug: string } }) {
  const m = DIRECTORY.find((x) => x.slug === params.slug);
  if (!m || m.aliasOf) notFound();
  const color = GROUP_COLORS[m.group];
  const groupLabel = MEMBER_GROUPS.find((g) => g.slug === m.group)?.label ?? m.group;
  const canonical = DIRECTORY.filter((x) => !x.aliasOf);
  const idx = canonical.findIndex((x) => x.slug === m.slug);
  const prev = canonical[(idx - 1 + canonical.length) % canonical.length];
  const next = canonical[(idx + 1) % canonical.length];

  return (
    <>
      <section id="member-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Team", to: "/team" }, { label: m.name }]} />
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md font-display text-[24px] font-bold"
              style={{ backgroundColor: `${color}18`, color }}
              aria-hidden="true"
            >
              {initials(m.name)}
            </div>
            <div className="min-w-0">
              <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
                <span style={{ color }}>[</span> {m.tier} <span style={{ color }}>]</span>
              </span>
              <h1 className="mt-4 font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">{m.name}</h1>
              <p className="mt-2 font-mono text-[13px]" style={{ color }}>{m.title}</p>
              <p className="mt-2 font-mono text-[11px] text-muted">{m.education}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a href={`mailto:${m.email}`} className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] text-ink transition-colors hover:border-cyan/60 hover:text-cyan">
                  [ {m.email} ]
                </a>
                {m.github && (
                  <a href={m.github} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] text-ink transition-colors hover:border-cyan/60 hover:text-cyan">
                    [ GitHub ]
                  </a>
                )}
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] text-ink transition-colors hover:border-cyan/60 hover:text-cyan">
                    [ LinkedIn ]
                  </a>
                )}
                {m.orcid && (
                  <a href={m.orcid} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] text-ink transition-colors hover:border-cyan/60 hover:text-cyan">
                    [ ORCID ]
                  </a>
                )}
                {m.facebook && (
                  <a href={m.facebook} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] text-ink transition-colors hover:border-cyan/60 hover:text-cyan">
                    [ Facebook ]
                  </a>
                )}
                {m.pgp && (
                  <span className="rounded-md border border-kernel/50 px-4 py-2 font-mono text-[11px] text-kernel">
                    ◆ PGP Key Verified
                  </span>
                )}
                <span className="rounded-md border border-hairline px-4 py-2 font-mono text-[11px] text-muted">
                  in {groupLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="member-bio" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-md border border-hairline bg-panel p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Biography"}</p>
            <div className="mt-4 space-y-4 text-[14.5px] leading-[1.85] text-muted">
              {m.bio.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-5 font-mono text-[11px]"><span className="text-muted">{m.metric[0]}: </span><span className="tabular" style={{ color }}>{m.metric[1]}</span></p>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Focus Areas</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.badges.map((b) => (
                  <span key={b} className="rounded border border-hairline px-2 py-1 font-mono text-[10px] text-muted">{b}</span>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Directory</p>
              <div className="mt-3 space-y-2">
                <Link href="/team" className="block text-[13px] text-muted transition-colors hover:text-cyan">← Full directory</Link>
                <Link href={`/team/${prev.slug}`} className="block text-[13px] text-muted transition-colors hover:text-cyan">← {prev.name}</Link>
                <Link href={`/team/${next.slug}`} className="block text-[13px] text-muted transition-colors hover:text-cyan">{next.name} →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
