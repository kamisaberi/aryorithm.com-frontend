"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-hairline bg-void/95 px-6 backdrop-blur-xl">
      {/* Search */}
      <div className={`relative flex-1 transition-all duration-200 ${searchFocused ? "max-w-md" : "max-w-sm"}`}>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search users, subscriptions, API keys..."
          className="admin-input pl-9"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          aria-label="Search"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-hairline bg-panel px-1.5 py-0.5 font-mono text-[9px] text-muted">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notifications */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
          aria-label="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2C5.8 2 4 3.8 4 6v2.5L2.5 11h11L12 8.5V6c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6.5 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-threat" aria-hidden="true" />
        </button>

        {/* Environment badge */}
        <span className="admin-badge border-kernel/30 bg-kernel/10 text-kernel">
          <span className="h-1.5 w-1.5 rounded-full bg-kernel pip-pulse" aria-hidden="true" />
          Production
        </span>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/10 font-mono text-[11px] font-bold text-cyan">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12.5px] font-medium text-ink">{user?.name || "Admin"}</p>
            <p className="font-mono text-[10px] text-muted">{user?.role || "admin"}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="admin-btn-ghost text-muted hover:text-threat"
            aria-label="Sign out"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M8 5l3 3-3 3M11 8H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Main site link */}
        <Link href="/" className="admin-btn-secondary">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          View Site
        </Link>
      </div>
    </header>
  );
}
