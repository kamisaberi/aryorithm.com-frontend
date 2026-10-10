"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CommandMenu from "@/components/search/CommandMenu";

const NAV = [
  { label: "Explore", href: "/explore" },
  { label: "Runtimes & Targets", href: "/explore" },
  { label: "Documentation & SDK", href: "/docs" },
  { label: "Publish", href: "/publish" },
];

const ECOSYSTEM = [
  { label: "Main Portal (aryorithm.com)", href: "https://aryorithm.com" },
  { label: "Fleet SaaS (app.aryorithm.com)", href: "https://app.aryorithm.com" },
  { label: "Nexus Local Hub (Port 9443)", href: "http://localhost:9443" },
];

/** Sticky glass app bar (§1.1): brand, nav, search trigger, switcher, CTA. */
export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenuOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSwitcherOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Aryorithm Hub home">
            <span
              className="pip-pulse block h-2.5 w-2.5 bg-kernel"
              style={{ boxShadow: "0 0 12px rgba(0,255,163,0.9)" }}
              aria-hidden="true"
            />
            <span className="font-display text-[16px] font-bold tracking-[0.14em] text-ink">
              ARYORITHM&nbsp;HUB
            </span>
            <span className="hidden rounded-md border border-kernel/30 bg-kernel/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel sm:inline-block">
              v2.4 Fleet Compatible
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  pathname === item.href ? "text-cyan" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="hidden min-w-[240px] items-center gap-2.5 rounded-md border border-hairline bg-panel px-3.5 py-2 text-left text-[12.5px] text-muted transition-colors hover:border-cyan/50 hover:text-ink md:flex"
          >
            <span className="font-mono text-cyan" aria-hidden="true">
              ⌕
            </span>
            <span className="flex-1 truncate">Search extensions, protocols, MITRE IDs...</span>
            <kbd className="rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-muted">
              ⌘K
            </kbd>
          </button>

          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-expanded={switcherOpen}
              className="rounded-md border border-hairline px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
            >
              Ecosystem ▾
            </button>
            {switcherOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-md border border-hairline bg-panel shadow-2xl shadow-black/60">
                {ECOSYSTEM.map((e) => (
                  <a
                    key={e.label}
                    href={e.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-2.5 text-[12.5px] text-muted transition-colors hover:bg-cyan/[0.05] hover:text-cyan"
                  >
                    {e.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>

          <a
            href="https://github.com/kamisaberi"
            target="_blank"
            rel="noreferrer"
            className="hidden font-mono text-[11px] text-muted transition-colors hover:text-cyan xl:block"
          >
            ★ GitHub
          </a>

          <Link
            href="/publish"
            className="hidden rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110 sm:block"
          >
            Submit Plugin
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-md border border-hairline text-muted hover:text-cyan lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {mobileOpen ? (
                <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <nav aria-label="Mobile" className="border-t border-hairline bg-panel px-5 py-4 lg:hidden">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded px-2 py-2.5 text-[14px] text-ink hover:bg-cyan/[0.05] hover:text-cyan"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-2 border-t border-hairline pt-3">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setMenuOpen(true);
                }}
                className="block w-full rounded-md border border-hairline px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
              >
                Search ⌘K
              </button>
              <Link
                href="/publish"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md bg-cyan px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void"
              >
                Submit Plugin
              </Link>
            </div>
          </nav>
        )}
      </header>
      <CommandMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
