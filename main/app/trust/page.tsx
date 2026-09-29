import type { Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import SbomTable from "@/components/sections/SbomTable";
import TrustCrosswalks from "@/components/simulations/TrustCrosswalks";
import { ARTIFACTS } from "@/data/trust";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sovereign Trust, Verification & Compliance | Aryorithm",
  description: "Cryptographic proof over compliance promises: CMMC 2.0, IEC 62443, NIS2 crosswalks and verifiable SBOM digests.",
};

export default function TrustPage() {
  return (
    <>
      <section id="trust-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Sovereign Trust" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Continuous Attestation &amp; Governance <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Cryptographic Proof Over Compliance Promises.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Independently audited regulatory crosswalks and tamper-evident cryptographic artifacts proving air-gapped
            sovereignty.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust#regulatory-crosswalks" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Inspect Control Crosswalks ]
            </Link>
            <Link href="/trust#sbom-repository" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Verify Binary Hashes ]
            </Link>
          </div>
          <div className="mt-8 max-w-3xl rounded-md border border-hairline bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Independent Verification Posture</p>
            <ul className="mt-3 grid gap-1.5 font-mono text-[11.5px] sm:grid-cols-2">
              {[["CMMC 2.0 Level 2", "crosswalked"], ["NIST SP 800-171 Rev 3", "crosswalked"], ["IEC 62443-3-3/4-2", "assessed"], ["NIS2/EU CER", "aligned"], ["FIPS 140-3 crypto module", "validated"], ["External CDN dependencies", "zero"]].map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2 text-muted"><span>✓ {k}</span><span className="text-kernel">{v}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="regulatory-crosswalks" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Regulatory Framework Alignments"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Every Claim Maps To A Control And An Artefact.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Compliance language is cheap; expand any control for its parent requirement, the evidence artefact, and the
          implementing subsystem.
        </p>
        <div className="mt-6"><TrustCrosswalks /></div>
      </section>

      <section id="sbom-repository" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Cryptographic Artifacts & SBOM Repository"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Verify The Binary Before You Trust The Vendor.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Every shipped artefact publishes a full bill of materials and a SHA-256 digest. Compare the hash before it
          ever reaches a production enclave — a vendor claim you cannot verify independently is not a security control.
        </p>
        <div className="mt-4 rounded-md border border-hairline bg-void px-4 py-3 font-mono text-[11px] text-muted">
          sha256sum -c aryorithm-release.sha256 &amp;&amp; gpg --verify sentinel-nexus.iso.asc · Signing key{" "}
          <span className="text-cyan">9E42 81BC D34A 7F60 2B18</span>
        </div>
        <div className="mt-6"><SbomTable artifacts={ARTIFACTS} /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Verified", "Zero External CDN Dependencies Verified", "UI loads no script, font or stylesheet from any external origin."],
            ["Reproducible", "Deterministic Builds", "Byte-identical output from pinned toolchains — rebuild and compare."],
            ["Escrowed", "Source Code Escrow", "Full source held by an independent third-party escrow agent."],
          ].map(([k, t, d]) => (
            <div key={k} className="rounded-md border border-kernel/40 bg-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">{k}</p>
              <p className="mt-1 text-[13px] font-medium text-ink">{t}</p>
              <p className="mt-1 text-[12px] text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact#pgp-panel" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
            [ Encrypted Vulnerability Disclosure ]
          </Link>
          <Link href="/about" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
            [ Read Our Sovereignty Position ]
          </Link>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
