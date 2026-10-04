import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";

export const metadata: Metadata = {
  title: "Privacy Policy | Aryorithm",
  description: "How Aryorithm Technologies handles personal data across a fully static, air-gapped-first web presence.",
};

export default function PrivacyPage() {
  return (
    <>
      <section id="privacy-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Legal" }, { label: "Privacy Policy" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Legal &amp; Sovereignty <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Privacy Policy.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            This site is fully static. It sets no tracking cookies, runs no third-party analytics,
            and cannot receive form submissions directly — procurement and disclosure flows
            hand off to out-of-band encrypted mail.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            ["No tracking", "No cross-site trackers, no fingerprinting scripts, no external CDN in appliance UI."],
            ["Contact data only", "If you email poc@aryorithm.com, procurement@aryorithm.com, or security@aryorithm.com, we use your message solely to respond."],
            ["No sale of data", "Personal data is never sold, rented, or shared with ad networks."],
            ["Retention", "Correspondence is retained only as long as needed for procurement, support, or legal compliance."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-hairline bg-panel p-5">
              <h2 className="font-display text-[15px] font-bold text-ink">{t}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
            [ Contact The Data Controller ]
          </Link>
          <Link href="/trust" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
            [ Verify Our Trust Posture ]
          </Link>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
