/**
 * Backend endpoint configuration — single source of truth.
 *
 * Local dev:  http://localhost:8000/api/v1   (dashboard/.env.local)
 * Web host:   https://backend.aryorithm.com/api/v1   (dashboard/.env.production)
 *
 * NEXT_PUBLIC_* values are baked into client JS at `next build` time, so the
 * production build MUST run with the production env file present (it is —
 * `.env.production` is committed). `next start` / dev-server code paths read
 * the same vars at runtime.
 */

const DEV_API_BASE = "http://localhost:8000/api/v1";
const PROD_API_BASE = "https://backend.aryorithm.com/api/v1";

function normalizeApiBase(raw: string | undefined, fallback: string): string {
  const v = (raw || "").trim().replace(/\/+$/, "");
  if (!v) return fallback;
  // Accept a bare host (https://backend.aryorithm.com) or a full base URL.
  return v.endsWith("/api/v1") ? v : `${v}/api/v1`;
}

const configured = process.env.NEXT_PUBLIC_API_URL;

/** Absolute backend API base, always ending in `/api/v1`. */
export const API_BASE_URL: string = normalizeApiBase(
  configured,
  // Sensible default when no env is set: prod host for production builds,
  // localhost for local dev.
  process.env.NODE_ENV === "production" && !configured
    ? PROD_API_BASE
    : DEV_API_BASE
);

/** Backend origin without the `/api/v1` suffix (health checks, links). */
export const BACKEND_ORIGIN: string = API_BASE_URL.replace(/\/api\/v1$/, "");

/** True when talking to a local dev backend (gates dev-only UI). */
export function isLocalBackend(): boolean {
  return (
    BACKEND_ORIGIN.includes("localhost") || BACKEND_ORIGIN.includes("127.0.0.1")
  );
}
