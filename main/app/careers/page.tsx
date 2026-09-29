import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import { ROLES } from "@/data/team";

export const metadata: Metadata = {
  title: "Careers & Open Roles | Aryorithm",
  description: "Join the Aryorithm engineering guild. Kernel, compiler, cryptography, and ICS protocol roles. No whiteboard trivia — prove your skills.",
};

const PERKS = [
  { title: "Air-Gapped Lab", desc: "Work on hardware in our Amsterdam lab with real substation equipment, not simulators." },
  { title: "No Managed Runtimes", desc: "C++20 and eBPF only. No Java, no Python in the hot path. Ever." },
  { title: "Upstream Culture", desc: "Contribute to Linux kernel, LLVM, and OSS. Paid time for upstream patches." },
  { title: "Conference Budget", desc: "€5,000/year for DEF CON, Black Hat, USENIX Security, and kernel summits." },
  { title: "Sovereign Stack", desc: "No cloud dependencies in your build or test environment. Fully air-gapped CI." },
  { title: "Equity & Bonus", desc: "Meaningful equity pool and profit-sharing tied to appliance deployments." },
];

const PROCESS = [
  { step: "01", title: "Apply", desc: "Send your CV and a note on what you've built. No cover letter fluff." },
  { step: "02", title: "Technical Screen", desc: "A 45-minute call on systems fundamentals. No algorithmic puzzles." },
  { step: "03", title: "Deep Dive", desc: "A 3-hour technical session on your area of expertise. Real code, real problems." },
  { step: "04", title: "Lab Day", desc: "Spend a day in our Amsterdam lab with the team. Hardware, code, and whiteboard." },
  { step: "05", title: "Offer", desc: "Decision within 48 hours. We respect your time and interest." },
];

export default function CareersPage() {
  return (
    <>
      <section id="careers-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Careers" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Join The Guild <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Build The Fast Path. <span className="text-cyan">Defend The Physical World.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            We are 31 engineers who chose C++20 over managed runtimes, eBPF over sidecars, and TPM-rooted identity over
            certificate files. If that sounds like your kind of constraint, we should talk.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#open-roles" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Open Roles ]
            </Link>
            <Link href="/team#ebpf-challenge" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Take The eBPF Challenge ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Open Roles", String(ROLES.length)], ["Guild Size", "31"], ["Lab", "Amsterdam"]]} />
          </div>
        </div>
      </section>

      <section id="perks" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Why Aryorithm"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What You Sign Up For.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="process" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Hiring Process"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Five Steps. No Games.</h2>
        <div className="mt-6 space-y-3">
          {PROCESS.map((s) => (
            <div key={s.step} className="flex gap-4 rounded-md border border-hairline bg-panel p-4">
              <span className="font-mono text-[13px] font-bold text-cyan">{s.step}</span>
              <div>
                <h3 className="font-display text-[14px] font-bold text-ink">{s.title}</h3>
                <p className="mt-1 text-[13px] text-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="open-roles" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Open Roles"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Current Openings.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          No whiteboard trivia. If you solved the eBPF challenge, quote EBPF-XDP-2026 and you start at the technical round.
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
