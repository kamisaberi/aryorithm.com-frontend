"use client";

/**
 * Shared-session (SSO) helper: the dashboard login drops HttpOnly
 * `ary_access`/`ary_refresh` cookies on `.aryorithm.com`, so the main site
 * recognizes the member with plain cookie auth — no token to store.
 */

const DEV_API_BASE = "http://localhost:8000/api/v1";
const PROD_API_BASE = "https://backend.aryorithm.com/api/v1";

function normalizeApiBase(raw: string | undefined): string {
  const v = (raw || "").trim().replace(/\/+$/, "");
  if (!v) {
    return process.env.NODE_ENV === "production" ? PROD_API_BASE : DEV_API_BASE;
  }
  return v.endsWith("/api/v1") ? v : `${v}/api/v1`;
}

/** Absolute backend API base, always ending in `/api/v1`. */
export const API_BASE_URL = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

export interface SiteSession {
  user_id: string;
  email: string;
  name: string;
  role: string;
  tenants: { id: string; name: string }[];
}

/** Current member via the SSO cookie, or null when logged out. */
export async function getSession(): Promise<SiteSession | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SiteSession;
  } catch {
    return null;
  }
}

/** Global logout: revokes all refresh tokens + clears SSO cookies. */
export async function siteLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* backend unreachable — main site holds no local tokens anyway */
  }
}

function originOf(raw: string | undefined, prod: string, dev: string): string {
  const v = (raw || "").trim().replace(/\/+$/, "");
  if (v) return v;
  return process.env.NODE_ENV === "production" ? prod : dev;
}

/** Dashboard origin (the auth home: login / register live there). */
export function dashboardUrl(path = "/login"): string {
  return originOf(
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    "https://app.aryorithm.com",
    "http://localhost:3000"
  ) + path;
}

/** Hub origin (used by the profile page shortcuts). */
export function hubUrl(path = "/"): string {
  return originOf(
    process.env.NEXT_PUBLIC_HUB_URL,
    "https://hub.aryorithm.com",
    "http://localhost:3001"
  ) + path;
}
