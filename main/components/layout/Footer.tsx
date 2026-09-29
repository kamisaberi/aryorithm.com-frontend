import Link from "next/link";
import { FOOTER_COLUMNS } from "@/data/navigation";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="global-footer" className="bg-void">
      <div className="mx-auto max-w-[1400px] px-5 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_3.4fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="block h-2.5 w-2.5 bg-cyan" style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }} aria-hidden="true" />
              <span className="font-display text-[16px] font-bold tracking-[0.16em] text-ink">ARYORITHM</span>
            </Link>
            <p className="mt-4 max-w-xs text-[12.5px] leading-[1.75] text-muted">
              Deterministic sub-millisecond active defense for sovereign infrastructure. Deep-tech cyber-physical
              security, autonomous edge AI, and heterogeneous silicon runtime engineering.
            </p>
            <dl className="mt-6 space-y-2.5 font-mono text-[11px]">
              <div className="flex gap-2">
                <dt className="text-muted">DOMAIN</dt>
                <dd className="text-ink">aryorithm.com</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">POC</dt>
                <dd className="text-cyan">defense-poc@aryorithm.com</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">CVE</dt>
                <dd className="text-cyan">security@aryorithm.com</dd>
              </div>
            </dl>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink">{col.title}</h2>
                <ul className="mt-3.5 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.section ? `${l.to}#${l.section}` : l.to}
                        className="link-underline text-[12px] leading-snug text-muted transition-colors hover:text-cyan"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-hairline bg-panel/40">
        <div className="mx-auto max-w-[1400px] px-5 py-5 lg:px-8">
          <div className="grid gap-4 font-mono text-[10.5px] lg:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 bg-kernel" aria-hidden="true" />
              <span>
                <span className="block uppercase tracking-[0.14em] text-muted">SHA-256 Binary Integrity</span>
                <span className="mt-1 block break-all text-ink">
                  9f2a1c47b8e05d3af61c7d9042be18cc73a5e0f4d81b6927ac3e5fd0b74e2a19
                </span>
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 bg-cyan" aria-hidden="true" />
              <span>
                <span className="block uppercase tracking-[0.14em] text-muted">GPG Public Key ID</span>
                <Link href="/contact#pgp-panel" className="link-underline mt-1 block text-cyan">
                  9E42 81BC D34A 7F60 2B18 · 4096R/ED25519
                </Link>
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 bg-telemetry" aria-hidden="true" />
              <span>
                <span className="block uppercase tracking-[0.14em] text-muted">Air-Gap Sovereignty Notice</span>
                <span className="mt-1 block text-ink">0 B egress · no external CDN in appliance UI · all inference local</span>
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-hairline pt-4 font-mono text-[10.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© {year} Aryorithm Technologies. All rights reserved. Verify every binary before deployment.</span>
            <span className="uppercase tracking-[0.14em]">Build g.419 · 15 Routes Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
