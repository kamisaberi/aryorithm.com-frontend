import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import EbpfChallenge from "@/components/simulations/EbpfChallenge";
import { LEADERS, TEAM_MEMBERS, ROLES } from "@/data/team";

export const metadata: Metadata = {
  title: "Leadership, Architects & Careers | Aryorithm",
  description: "Systems & kernel architects: Linux contributors, compiler engineers, cryptographers, SCADA veterans. Take the eBPF challenge.",
};

export default function TeamPage() {
  return (
    <>
      <section id="team-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Team & Careers" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Systems &amp; Kernel Architects <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Engineered by Low-Latency Specialists.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Our engineering guild spans Linux kernel contributors, compiler engineers, hardware cryptographers, and
            industrial SCADA protocol veterans.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/team#ebpf-challenge" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Take The eBPF Challenge ]
            </Link>
            <Link href="/team#careers" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ View Open Roles ]
            </Link>
          </div>
          <div className="mt-8 grid max-w-4xl gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The Guild</p>
              <ul className="mt-3 space-y-1.5 font-mono text-[11.5px] text-muted">
                {[["Upstream Linux kernel contributors", "6"], ["Compiler/codegen", "5"], ["Hardware cryptographers", "3"], ["SCADA & ICS veterans", "7"], ["Published researchers", "9"], ["Engineers with no production C++", "0"]].map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2"><span>{k}</span><span className="tabular text-ink">{v}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-5">
              <StatStrip items={[["Lab", "Amsterdam"], ["Guild", "31 engineers"], ["Remote", "EU/NATO"]]} />
              <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-muted">
                Individual names and photographs are withheld by policy. Cleared customers receive full named CVs under
                NDA through the procurement desk.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="leadership" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Leadership"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Architects, Not Managers.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {LEADERS.map((l) => (
            <article key={l.id} className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: l.color }}>{l.role} · {l.focus}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {l.badges.map((b) => (
                  <span key={b} className="rounded border border-hairline px-2 py-1 font-mono text-[9.5px] text-muted">{b}</span>
                ))}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">{l.bio}</p>
              <p className="mt-3 font-mono text-[11px]"><span className="text-muted">{l.metric[0]}: </span><span className="tabular" style={{ color: l.color }}>{l.metric[1]}</span></p>
            </article>
          ))}
        </div>
      </section>

      <section id="team-members" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Engineering Guild"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">The Specialists.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          A selection of the engineers who build and maintain the Aryorithm sovereign defense stack. Names shown with
          consent; full roster available under NDA.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM_MEMBERS.map((m) => (
            <article key={m.id} className="rounded-md border border-hairline bg-panel p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-display text-[14px] font-bold"
                  style={{ backgroundColor: m.color + "18", color: m.color }}
                >
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-display text-[14px] font-bold text-ink">{m.name}</h3>
                  <p className="font-mono text-[10px] text-muted">{m.title}</p>
                </div>
              </div>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: m.color }}>{m.team} · {m.focus}</p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{m.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.badges.map((b) => (
                  <span key={b} className="rounded border border-hairline px-1.5 py-0.5 font-mono text-[9px] text-muted">{b}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
        <EbpfChallenge />
      </section>

      <section id="careers" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Open Roles"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Build The Fast Path.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          No whiteboard trivia. If you solved the challenge above, quote EBPF-XDP-2026 and you start at the technical round.
        </p>
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
      <ClosingCTA />
    </>
  );
}
