"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSession,
  siteLogout,
  type SiteSession,
} from "@/lib/session";

/**
 * Top-right account corner: Login / Register for guests, account avatar +
 * Profile + Logout for members (shared SSO session, no local tokens).
 */
export default function AccountButton({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
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

  if (session === undefined) {
    if (variant === "mobile") return null;
    return (
      <span
        aria-hidden="true"
        className="hidden h-9 w-24 animate-pulse rounded-md border border-hairline lg:block"
      />
    );
  }

  if (variant === "mobile") {
    if (session) {
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
    return (
      <div className="space-y-2.5">
        <Link
          href="/login"
          className="block rounded-md border border-hairline px-4 py-2.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="block rounded-md border border-cyan/40 bg-cyan/[0.06] px-4 py-2.5 text-center font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-cyan"
        >
          Register
        </Link>
      </div>
    );
  }

  if (session) {
    return (
      <span className="hidden items-center gap-2.5 lg:flex">
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
          className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-cyan"
        >
          Logout
        </button>
      </span>
    );
  }

  return (
    <span className="hidden items-center gap-3 lg:flex">
      <Link
        href="/login"
        className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-cyan"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="rounded-md border border-hairline px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-all duration-200 hover:border-cyan/60 hover:text-cyan"
      >
        Register
      </Link>
    </span>
  );
}
