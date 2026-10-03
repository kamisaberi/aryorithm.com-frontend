"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/data/admin";
import { useAuth } from "@/lib/auth";

export default function AdminSidebar() {
  const pathname = usePathname() ?? "/";
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-hairline bg-panel">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-hairline px-5">
        <span
          className="pip-pulse block h-2.5 w-2.5 bg-cyan"
          style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }}
          aria-hidden="true"
        />
        <span className="font-display text-[15px] font-bold tracking-[0.16em] text-ink">
          ARYORITHM
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        <ul className="space-y-1">
          {ADMIN_NAV.map((group) => (
            <li key={group.label}>
              <p className="mb-2 mt-4 px-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/60 first:mt-0">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`admin-sidebar-link ${isActive ? "active" : ""}`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center text-[14px]" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className={item.highlight === "green" ? "text-kernel" : item.highlight ? "text-telemetry" : undefined}>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-cyan/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-hairline px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/10 font-mono text-[11px] font-bold text-cyan">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-ink">{user?.name || "Admin User"}</p>
            <p className="truncate font-mono text-[10px] text-muted">{user?.email || "admin@aryorithm.com"}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-muted transition-colors hover:text-threat"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
