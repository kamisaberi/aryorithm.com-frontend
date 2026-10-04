import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";

export const metadata: Metadata = {
  title: "Terms of Service | Aryorithm",
  description: "Terms governing use of aryorithm.com, documentation, and evaluation artefacts.",
};

export default function TermsPage() {
  return (
    <>
      <section id="terms-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Legal" }, { label: "Terms of Service" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Legal &amp; Sovereignty <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Terms of Service.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Use of this site and its documentation constitutes acceptance of these terms.
            Commercial use of appliances and software is governed by a separate node license.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="space-y-4">
          {[
            ["Evaluation use", "Benchmarks, docs, and open research artefacts (Sentinel-Lab) may be used for evaluation under Apache-2.0 where marked. Verify the LICENSE file in each repository."],
            ["No warranty on preprints", "Papers, threat analyses, and insights are provided as-is for research purposes and do not constitute deployment advice."],
            ["Export control", "Appliances, eBPF artefacts, and cryptographic material may be subject to EU EAR / dual-use controls. Contact procurement@aryorithm.com before cross-border transfer."],
            ["Acceptable use", "Do not probe, disrupt, or misrepresent this site or the customer enclave. Report vulnerabilities via security@aryorithm.com per the Security Disclosures page."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <h2 className="font-display text-[15px] font-bold text-ink">{t}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
            [ See Node-Based Licensing ]
          </Link>
          <Link href="/security" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
            [ Responsible Disclosure ]
          </Link>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
