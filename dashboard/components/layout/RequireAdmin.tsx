"use client";

import Link from "next/link";
import { isAdminRole, useAuth } from "@/lib/auth";

/**
 * Client-side gate for admin-only areas (API keys, webhooks, billing…).
 * The backend still enforces this server-side (403) — this only spares
 * non-admin members from clicking into actions that would fail, as part of
 * the integrated authorization shared by dashboard + hub + main.
 */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded bg-panel" />
        <div className="h-40 rounded-md border border-hairline bg-panel/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-md border border-hairline bg-panel p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Authentication required</p>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted">
          Sign in to manage workspace settings.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void"
        >
          Login
        </Link>
      </div>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <div className="rounded-md border border-hairline bg-panel p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-threat">Access denied</p>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted">
          Settings are restricted to workspace admins. You&apos;re signed in as{" "}
          <span className="font-mono text-[12px] text-ink">{user.email}</span> (
          {user.role.replace(/_/g, " ")}).
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
