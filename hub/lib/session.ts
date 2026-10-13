"use client";

/**
 * Shared-session (SSO) helper: the dashboard login drops HttpOnly
 * `ary_access`/`ary_refresh` cookies on `.aryorithm.com`, so the hub
 * recognizes the member with plain cookie auth — no token to store.
 */

import { api } from "./api";

export interface HubSession {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

/** Current member via the SSO cookie, or null when logged out. */
export async function getSession(): Promise<HubSession | null> {
  try {
    return await api.get<HubSession>("/auth/me");
  } catch {
    return null;
  }
}

/** Global logout: revokes all refresh tokens + clears SSO cookies. */
export async function hubLogout(): Promise<void> {
  try {
    await api.post("/auth/logout", {});
  } catch {
    /* backend unreachable — hub holds no local tokens anyway */
  }
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
