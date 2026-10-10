import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Industrial OT Dissectors", href: "/explore?category=industrial-ot" },
      { label: "Neural Models", href: "/explore?category=ai-models" },
      { label: "Wasm Sandboxes", href: "/explore?runtime=WASM_SANDBOX" },
      { label: "Lua Threat Rules", href: "/explore?runtime=LUAJIT" },
      { label: "SIEM Forwarders", href: "/explore?category=ai-models" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "C++20 Plugin SDK", href: "/docs#cpp-sdk" },
      { label: "Manifest Specification", href: "/publish" },
      { label: "Security Auditing Criteria", href: "/docs#memory-safety" },
      { label: "Simulation Mesh", href: "/docs#quickstart" },
    ],
  },
  {
    title: "Ecosystem & Governance",
    links: [
      { label: "Documentation Portal", href: "/docs" },
      { label: "GitHub Organization", href: "https://github.com/kamisaberi" },
      { label: "Security Disclosures", href: "https://aryorithm.com/security" },
      { label: "Terms of Distribution", href: "https://aryorithm.com/terms" },
    ],
  },
];

/** Structured 4-column footer (§1.3). */
export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-void">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="block h-2.5 w-2.5 bg-kernel"
              style={{ boxShadow: "0 0 12px rgba(0,255,163,0.9)" }}
              aria-hidden="true"
            />
            <span className="font-display text-[15px] font-bold tracking-[0.14em] text-ink">
              ARYORITHM&nbsp;HUB
            </span>
          </div>
          <p className="mt-4 max-w-xs text-[12.5px] leading-[1.75] text-muted">
            The open extension mesh for cyber-physical edge defense. Every package
            is signed, hashed, and verified — air-gapped sovereign by default.
          </p>
          <p className="mt-4 font-mono text-[10.5px] text-muted">
            Registry build <span className="text-cyan">v2.4.0</span>
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink">
                {col.title}
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="link-underline text-[12px] leading-snug text-muted transition-colors hover:text-cyan"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="link-underline text-[12px] leading-snug text-muted transition-colors hover:text-cyan"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-5 py-5 font-mono text-[10.5px] text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© 2026 Aryorithm Technologies B.V. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="pip-pulse inline-block h-1.5 w-1.5 bg-kernel" aria-hidden="true" />
              Ecosystem Network: Operational
            </span>
            <span className="uppercase tracking-[0.14em]">Zero-telemetry guarantee</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
