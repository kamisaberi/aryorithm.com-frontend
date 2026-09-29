import type { Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { IntakePortals, PgpPanel } from "@/components/simulations/ContactPortals";

export const metadata: Metadata = {
  title: "Defense Procurement & Encrypted Inquiries | Aryorithm",
  description: "Enterprise POC, defense & government intake with CAGE/DUNS validation, hardware sizing, and PGP-encrypted disclosure.",
};

export default function ContactPage() {
  return (
    <>
      <section id="contact-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Defense Procurement" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-telemetry">[</span> Encrypted Intake &amp; Clearance <span className="text-telemetry">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Initiate <span className="text-cyan text-glow">Sovereign Enclave Deployment.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Engage field systems architects for proof-of-concept appliances, defense procurement requests, or encrypted
            vulnerability disclosure.
          </p>
          <dl className="mt-8 grid max-w-4xl gap-px overflow-hidden rounded-md border border-hairline bg-hairline/50 sm:grid-cols-3">
            {[
              ["Enterprise POC", "poc@aryorithm.com", "10 business days to site"],
              ["Defense Desk", "procurement@aryorithm.com", "Cleared engineers available"],
              ["Security Disclosure", "security@aryorithm.com", "PGP required · 72h triage"],
            ].map(([k, v, n]) => (
              <div key={k} className="bg-panel px-4 py-3.5">
                <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{k}</dt>
                <dd className="mt-1 font-mono text-[12px] text-cyan">{v}</dd>
                <dd className="mt-0.5 font-mono text-[10px] text-muted">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-12 px-5 py-12 lg:px-8">
        <IntakePortals />
        <PgpPanel />
      </div>
    </>
  );
}
