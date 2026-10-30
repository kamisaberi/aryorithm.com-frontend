"use client";

import { useEffect, useState } from "react";
import {
  dashboardUrl,
  getSession,
  hubUrl,
  isAdminRole,
  siteLogout,
  type SiteSession,
} from "@/lib/session";

/** Member profile — reads the shared SSO session, never a local token. */
export default function ProfileView() {
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
    window.location.reload();
  };

  if (session === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded bg-panel" />
        <div className="h-40 rounded-md border border-hairline bg-panel/60" />
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan">{"// Member Profile"}</p>
        <h1 className="mt-2 font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
          You&apos;re signed out.
        </h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-[1.75] text-muted">
          Login once with your Aryorithm account — the same session unlocks the
          fleet dashboard and the hub automatically.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={dashboardUrl("/login")}
            className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
          >
            Login
          </a>
          <a
            href={dashboardUrl("/register")}
            className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
          >
            Register
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan">{"// Member Profile"}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan/50 bg-cyan/10 font-mono text-[20px] font-bold uppercase text-cyan"
        >
          {(session.name || session.email).slice(0, 1)}
        </span>
        <div>
          <h1 className="font-display text-[26px] font-bold leading-tight text-ink sm:text-[32px]">
            {session.name}
          </h1>
          <p className="mt-0.5 font-mono text-[12px] text-muted">{session.email}</p>
        </div>
        <span className="rounded-md border border-cyan/30 bg-cyan/[0.06] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-cyan">
          {session.role.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-hairline bg-panel p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Account</h2>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">User ID</dt>
              <dd className="break-all text-right font-mono text-[11.5px] text-ink">{session.user_id}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Organization</dt>
              <dd className="text-right text-ink">
                {(session.tenants ?? []).map((t) => t.name).join(", ") || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Session</dt>
              <dd className="text-right text-ink">Shared across dashboard &amp; hub</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-hairline bg-panel p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Continue to</h2>
          <div className="mt-4 space-y-2.5">
            <a
              href={dashboardUrl("/")}
              className="block rounded-md border border-hairline px-4 py-3 text-[13.5px] text-ink transition-colors hover:border-cyan/50 hover:text-cyan"
            >
              Fleet dashboard <span className="font-mono text-[11px] text-muted">→ app.aryorithm.com</span>
            </a>
            <a
              href={hubUrl("/")}
              className="block rounded-md border border-hairline px-4 py-3 text-[13.5px] text-ink transition-colors hover:border-cyan/50 hover:text-cyan"
            >
              Extension hub <span className="font-mono text-[11px] text-muted">→ hub.aryorithm.com</span>
            </a>
            <a
              href={dashboardUrl("/artifacts")}
              className="block rounded-md border border-cyan/30 bg-cyan/[0.04] px-4 py-3 text-[13.5px] text-cyan transition-colors hover:border-cyan/60 hover:bg-cyan/[0.08]"
            >
              Artifact workspace <span className="font-mono text-[11px] opacity-70">→ 7 asset classes, forks & sharing</span>
            </a>
            {isAdminRole(session.role) && (
              <a
                href={dashboardUrl("/settings")}
                className="block rounded-md border border-cyan/40 bg-cyan/[0.06] px-4 py-3 text-[13.5px] text-cyan transition-colors hover:bg-cyan/[0.12]"
              >
                Admin console <span className="font-mono text-[11px] opacity-70">→ workspace settings</span>
              </a>
            )}
            <button
              type="button"
              onClick={logout}
              className="block w-full rounded-md border border-hairline px-4 py-3 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-red-400/60 hover:text-red-300"
            >
              Logout everywhere
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
