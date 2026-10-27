"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSession,
  siteLogout,
  type SiteSession,
} from "@/lib/session";

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

/**
 * Top-right account corner: one login icon for guests, avatar + logout for
 * members (shared SSO session, no local tokens). Registration is reachable
 * from the login page.
 */
export default function AccountButton({
  variant = "header",
  onNavigate,
}: {
  variant?: "header" | "mobile";
  onNavigate?: () => void;
}) {
  // undefined = still checking the session.
  const [session, setSession] = useState<SiteSession | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSession().then((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    await siteLogout();
    onNavigate?.();
    // Reload so every header/profile instance drops the signed-in state.
    window.location.reload();
  };

  if (variant === "mobile") {
    if (!session) return null;
    return (
      <div className="space-y-2.5">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="block rounded-md border border-cyan/40 bg-cyan/[0.06] px-4 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-cyan"
        >
          {(session.name || session.email).slice(0, 24)} — Profile
        </Link>
        <button
          type="button"
          onClick={logout}
          className="block w-full rounded-md border border-hairline px-4 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted"
        >
          Logout
        </button>
      </div>
    );
  }

  if (session) {
    return (
      <span className="flex items-center gap-2.5">
        <Link
          href="/profile"
          title={`${session.name} (${session.email}) — Member profile`}
          aria-label="Member profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan/50 bg-cyan/10 font-mono text-[13px] font-bold uppercase text-cyan transition-colors hover:bg-cyan/20"
        >
          {(session.name || session.email).slice(0, 1)}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="hidden font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-cyan lg:inline"
        >
          Logout
        </button>
      </span>
    );
  }

  return (
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
  );
}
