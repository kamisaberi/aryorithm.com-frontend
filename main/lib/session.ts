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

import { ssGet, ssRemove, ssSet } from "./shared-storage";

export interface SiteSession {
  user_id: string;
  email: string;
  name: string;
  role: string;
  tenants: { id: string; name: string }[];
}

const TOKEN_KEY = "aryorithm_token";
const REFRESH_KEY = "aryorithm_refresh_token";

async function fetchMe(token: string | null): Promise<SiteSession | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SiteSession;
  } catch {
    return null;
  }
}

/** Current member: shared token first, silent cookie refresh as fallback. */
export async function getSession(): Promise<SiteSession | null> {
  const token = await ssGet(TOKEN_KEY);
  const me = await fetchMe(token);
  if (me) return me;
  // Access token expired/missing → one silent retry via the SSO cookie.
  try {
    const r = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "include",
    });
    if (r.ok) {
      const j = (await r.json()) as { access_token?: string };
      if (j.access_token) {
        await ssSet(TOKEN_KEY, j.access_token);
        return await fetchMe(j.access_token);
      }
    }
  } catch {
    /* no session */
  }
  return null;
}

/** Store a fresh login so dashboard + hub see it too. */
export async function setSessionTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await ssSet(TOKEN_KEY, accessToken);
  if (refreshToken) await ssSet(REFRESH_KEY, refreshToken);
}

/** Global logout: revokes all refresh tokens + clears shared + SSO cookies. */
export async function siteLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* backend unreachable — main site holds no local tokens anyway */
  }
  await ssRemove(TOKEN_KEY);
  await ssRemove(REFRESH_KEY);
}

/** Roles allowed through admin gates (mirrors backend get_current_admin). */
const ADMIN_ROLES = new Set(["super_admin", "tenant_admin", "admin"]);

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
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
