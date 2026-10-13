"use client";

/**
 * Shared-session (SSO) helper: login tokens live in the ONE shared store
 * (hidden bridge iframe → main origin's localStorage), so a login on any
 * of the three apps is visible to the other two. Short access token goes
 * out as Bearer; silent refresh rides the HttpOnly SSO cookie.
 */

import { api } from "./api";
import { ssGet, ssRemove, ssSet } from "./shared-storage";

export interface HubSession {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

const TOKEN_KEY = "aryorithm_token";
const REFRESH_KEY = "aryorithm_refresh_token";

async function fetchMe(token: string | null): Promise<HubSession | null> {
  try {
    const res = await api.get<HubSession>(
      "/auth/me",
      token ? { token } : undefined
    );
    return res;
  } catch {
    return null;
  }
}

/** Current member: shared token first, silent cookie refresh as fallback. */
export async function getSession(): Promise<HubSession | null> {
  const token = await ssGet(TOKEN_KEY);
  const me = await fetchMe(token);
  if (me) return me;
  // Access token expired/missing → one silent retry via the SSO cookie.
  try {
    const refreshed = await api.post<{ access_token?: string }>(
      "/auth/refresh",
      {}
    );
    if (refreshed?.access_token) {
      await ssSet(TOKEN_KEY, refreshed.access_token);
      return await fetchMe(refreshed.access_token);
    }
  } catch {
    /* no session */
  }
  return null;
}

/** Store a fresh login so dashboard + main see it too. */
export async function setSessionTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await ssSet(TOKEN_KEY, accessToken);
  if (refreshToken) await ssSet(REFRESH_KEY, refreshToken);
}

/** Global logout: revokes all refresh tokens + clears shared + SSO cookies. */
export async function hubLogout(): Promise<void> {
  try {
    await api.post("/auth/logout", {});
  } catch {
    /* backend unreachable — hub holds no local tokens anyway */
  }
  await ssRemove(TOKEN_KEY);
  await ssRemove(REFRESH_KEY);
}

/** Dashboard origin for the "Login / Register" handoff (same shared session). */
export function dashboardUrl(path = "/login"): string {
  const base = (process.env.NEXT_PUBLIC_DASHBOARD_URL || "").trim().replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  return process.env.NODE_ENV === "production"
    ? `https://app.aryorithm.com${path}`
    : `http://localhost:3000${path}`;
}

/** Main-site origin (the shared member profile lives there). */
export function mainUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_MAIN_URL || "").trim().replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  return process.env.NODE_ENV === "production"
    ? `https://aryorithm.com${path}`
    : `http://localhost:3002${path}`;
}

/** Roles allowed through admin gates (mirrors backend get_current_admin). */
const ADMIN_ROLES = new Set(["super_admin", "tenant_admin", "admin"]);

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}
