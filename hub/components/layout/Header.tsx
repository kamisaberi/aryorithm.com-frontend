"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CommandMenu from "@/components/search/CommandMenu";
import {
  getSession,
  hubLogout,
  isAdminRole,
  mainUrl,
  type HubSession,
} from "@/lib/session";

const NAV = [
  { label: "Explore", href: "/explore" },
  { label: "Packages", href: "/packages" },
  { label: "Models", href: "/models" },
  { label: "Datasets", href: "/datasets" },
  { label: "PCAPs", href: "/pcaps" },
  { label: "Scenarios", href: "/scenarios" },
  { label: "Blueprints", href: "/blueprints" },
  { label: "Appliances", href: "/appliances" },
];

// Keep the matching asset category highlighted when a detail page is open
// through the generic /assets/{type}/{slug} inspector.
const ASSET_DETAIL_PATHS: Record<string, string> = {
  package: "/packages",
  model: "/models",
  dataset: "/datasets",
  pcap: "/pcaps",
  scenario: "/scenarios",
  blueprint: "/blueprints",
  appliance: "/appliances",
};

function navIsActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  const match = pathname.match(/^\/assets\/([^/]+)\//);
  return match ? ASSET_DETAIL_PATHS[match[1]] === href : false;
}

function UserIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 17c1.2-3.4 3.6-5 6.5-5s5.3 1.6 6.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sticky glass app bar (§1.1): brand, asset nav, search trigger, account. */
export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Shared SSO session (dashboard login cookie). undefined = still checking.
  const [session, setSession] = useState<HubSession | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSession().then((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onLogout = async () => {
    await hubLogout();
    setSession(null);
  };

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
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2.5 px-5 lg:gap-3 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Aryorithm Hub home">
            {/* Static glow on purpose: animating this pip inside the header's
                `backdrop-blur` forces a full re-blur every frame and costs
                ~25% GPU while the page is idle. */}
            <span
              className="block h-2.5 w-2.5 bg-kernel"
              style={{ boxShadow: "0 0 12px rgba(0,255,163,0.9)" }}
              aria-hidden="true"
            />
            <span className="font-display text-[14.5px] font-bold tracking-[0.14em] text-ink sm:text-[16px]">
              ARYORITHM&nbsp;HUB
            </span>
            <span className="hidden rounded-md border border-kernel/30 bg-kernel/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel xl:inline-block">
              v2.4 Fleet Compatible
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = navIsActive(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap px-2.5 py-2 text-[12.5px] font-medium transition-colors ${
                    active ? "text-cyan" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Search all assets"
              aria-keyshortcuts="Control+K Meta+K"
              title="Search all assets (⌘K)"
              className="flex h-9 items-center gap-2 rounded-md border border-hairline bg-panel px-2.5 text-muted transition-colors hover:border-cyan/50 hover:text-ink"
            >
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="7.8" cy="7.8" r="5.1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11.6 11.6 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] xl:inline">
                Search
              </span>
              <kbd className="hidden rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-block">
                ⌘K
              </kbd>
            </button>

            {session ? (
              <span className="flex items-center gap-1.5">
                <a
                  href={mainUrl("/profile")}
                  title={`Signed in as ${session.name} (${session.email}) — open profile`}
                  aria-label="Account profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-kernel/50 bg-kernel/10 text-kernel transition-colors hover:bg-kernel/20"
                >
                  <UserIcon />
                </a>
                {isAdminRole(session.role) && (
                  <span className="hidden rounded border border-kernel/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-kernel xl:inline">
                    {session.role.replace(/_/g, " ")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-cyan xl:inline"
                >
                  Logout
                </button>
              </span>
            ) : (
              <Link
                href="/login"
                title="Login — create an account from the login page"
                aria-label="Login"
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-cyan/50 hover:text-cyan ${
                  session === undefined ? "opacity-60" : ""
                }`}
              >
                <UserIcon />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-muted hover:text-cyan lg:hidden"
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
        </div>

        {mobileOpen && (
          <nav aria-label="Mobile" className="border-t border-hairline bg-panel px-5 py-4 lg:hidden">
            <ul className="grid grid-cols-2 gap-1">
              {NAV.map((item) => {
                const active = navIsActive(pathname, item.href);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded px-2 py-2.5 text-[14px] hover:bg-cyan/[0.05] hover:text-cyan ${
                        active ? "text-cyan" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 space-y-2.5 border-t border-hairline pt-3">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setMenuOpen(true);
                }}
                className="block w-full rounded-md border border-hairline px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
              >
                Search all assets ⌘K
              </button>
              {session ? (
                <>
                  <a
                    href={mainUrl("/profile")}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md border border-kernel/40 bg-kernel/[0.06] px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-kernel"
                  >
                    {(session.name || session.email).slice(0, 24)} — Profile
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileOpen(false);
                      await onLogout();
                    }}
                    className="block w-full rounded-md border border-hairline px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
                  >
                    Logout ({session.email})
                  </button>
                </>
              ) : null}
            </div>
          </nav>
        )}
      </header>
      <CommandMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
