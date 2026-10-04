import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { PGP_FINGERPRINT } from "@/data/contact";

export const metadata: Metadata = {
  title: "Security Disclosures & PGP | Aryorithm",
  description: "Responsible vulnerability disclosure process, PGP encryption, and air-gap sovereignty notice.",
};

export default function SecurityPage() {
  return (
    <>
      <section id="security-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Legal" }, { label: "Security Disclosures" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> PGP-Encrypted Disclosure <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Security Disclosures.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Encrypt all sensitive reports to <span className="text-cyan">security@aryorithm.com</span> with
            fingerprint <span className="font-mono text-[13px] text-ink">{PGP_FINGERPRINT}</span>.
            Triage within 72 hours. No bug-bounty marketing theatre — direct engineer-to-engineer handling.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact#pgp-panel" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Open PGP Key Panel ]
            </Link>
            <Link href="/trust#sbom-repository" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Air-Gap Certification ]
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["1 · Encrypt", "Encrypt to the master security key before sending. Never send exploit details in cleartext."],
            ["2 · Triage 72h", "Cleared engineers reproduce, scope blast radius, and confirm affected tiers."],
            ["3 · Coordinated fix", "Patch, regression-gate against golden_attacks.yaml, and ship via Nexus canary OTA."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <h2 className="font-display text-[15px] font-bold text-ink">{t}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
