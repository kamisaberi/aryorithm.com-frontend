"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/data/navigation";
import MobileDrawer from "./MobileDrawer";

export default function Header() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      id="site-header"
      className={
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 " +
        (scrolled ? "border-hairline bg-void/95 backdrop-blur-xl" : "border-transparent bg-void/70 backdrop-blur-md")
      }
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Aryorithm Technologies home">
          <span
            className="pip-pulse block h-2.5 w-2.5 bg-cyan"
            style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }}
            aria-hidden="true"
          />
          <span className="font-display text-[17px] font-bold tracking-[0.16em] text-ink">ARYORITHM</span>
        </Link>

        <nav id="primary-nav" className="hidden flex-1 items-center justify-center lg:flex" aria-label="Primary">
          <ul className="flex items-center gap-1">
            {NAV.map((group) => {
              const isActive = group.match?.includes(pathname) ?? pathname === group.to;
              const isOpen = open === group.label;
              return (
                <li
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => setOpen(group.items ? group.label : null)}
                  onMouseLeave={() => setOpen(null)}
                >
                  <Link
                    href={group.items ? group.items[0].to : (group.to ?? "/")}
                    className={
                      "flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-medium transition-colors " +
                      (isOpen || isActive ? "text-cyan" : "text-muted hover:text-ink")
                    }
                  >
                    {group.label}
                    {isActive && <span className="h-1 w-1 bg-cyan" aria-hidden="true" />}
                    {group.items && (
                      <svg width="9" height="9" viewBox="0 0 10 6" fill="none" aria-hidden="true" className={"transition-transform duration-200 " + (isOpen ? "rotate-180" : "")}>
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    )}
                  </Link>
                  {group.items && isOpen && (
                    <div className="absolute left-1/2 top-full w-[334px] -translate-x-1/2 pt-2">
                      <div className="rise-in overflow-hidden rounded-md border border-hairline bg-panel shadow-2xl shadow-black/60">
                        <div className="border-b border-hairline px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                          {group.label}
                        </div>
                        <ul className="divide-y divide-hairline/70">
                          {group.items.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.section ? `${item.to}#${item.section}` : item.to}
                                onClick={() => setOpen(null)}
                                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-cyan/[0.055]"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-hairline transition-colors group-hover:bg-cyan" aria-hidden="true" />
                                <span>
                                  <span className="block text-[13.5px] font-medium text-ink transition-colors group-hover:text-cyan">
                                    {item.name}
                                  </span>
                                  <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{item.desc}</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link
            href="/portal"
            className="rounded-md border border-hairline px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-all duration-200 hover:border-cyan/60 hover:text-cyan"
          >
            Portal
          </Link>
          <Link
            href="/contact"
            className="rounded-md bg-cyan px-4 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void transition-all duration-200 hover:brightness-110"
          >
            Schedule Pilot
          </Link>
        </div>

        <button
          type="button"
          id="mobile-nav-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:text-cyan lg:hidden"
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

      {mobileOpen && <MobileDrawer onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}
