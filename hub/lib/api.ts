/**
 * Backend endpoint configuration — single source of truth.
 *
 * Local dev:  http://localhost:8000/api/v1   (hub/.env.local)
 * Web host:   https://backend.aryorithm.com/api/v1   (hub/.env.production)
 *
 * NEXT_PUBLIC_* values are baked into client JS at `next build` time, so the
 * production build MUST run with the production env file present (it is —
 * `.env.production` is committed). Server components (`next start`) read the
 * same vars at request time.
 */
const DEV_API_BASE = "http://localhost:8000/api/v1";
const PROD_API_BASE = "https://backend.aryorithm.com/api/v1";

function normalizeApiBase(raw: string | undefined): string {
  const v = (raw || "").trim().replace(/\/+$/, "");
  if (!v) {
    return process.env.NODE_ENV === "production" && !raw
      ? PROD_API_BASE
      : DEV_API_BASE;
  }
  // Accept a bare host (https://backend.aryorithm.com) or a full base URL.
  return v.endsWith("/api/v1") ? v : `${v}/api/v1`;
}

const API_BASE_URL = normalizeApiBase(process.env.NEXT_PUBLIC_HUB_API_URL);

/** Backend origin without the `/api/v1` suffix (health checks, links). */
export const HUB_BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

/** True when talking to a local dev backend (gates dev-only UI). */
export function isLocalBackend(): boolean {
  return (
    HUB_BACKEND_ORIGIN.includes("localhost") ||
    HUB_BACKEND_ORIGIN.includes("127.0.0.1")
  );
}

/** Absolute backend base for direct binary downloads (<a href>, not fetch). */
export const HUB_API_BASE_URL = API_BASE_URL;

const HUB_CLIENT = "web-frontend";

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details: unknown = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function parseErrorMessage(
  errorData: unknown,
  status: number
): { code: string; message: string; details: unknown } {
  if (typeof errorData === "object" && errorData !== null) {
    const data = errorData as Record<string, unknown>;
    // Hub registry errors: RFC 7807-style { error_code, message, details }
    if (typeof data.error_code === "string") {
      return {
        code: data.error_code,
        message: typeof data.message === "string" ? data.message : `Request failed with status ${status}`,
        details: data.details ?? {},
      };
    }
    // Manifest linter 422: { valid: false, errors: [{ field, message }] }
    if (data.valid === false && Array.isArray(data.errors)) {
      const first = data.errors[0] as Record<string, unknown> | undefined;
      const message =
        first && typeof first.message === "string"
          ? `${first.field ?? "manifest"}: ${first.message}`
          : `Request failed with status ${status}`;
      return { code: "PLUGIN_MANIFEST_INVALID", message, details: data.errors };
    }
    // Repo convention: FastAPI HTTPException { detail: "message" | [...] }
    if (typeof data.detail === "string") {
      return { code: `HTTP_${status}`, message: data.detail, details: {} };
    }
    if (Array.isArray(data.detail)) {
      const first = data.detail[0] as Record<string, unknown> | undefined;
      const message =
        first && typeof first.msg === "string" ? first.msg : `Request failed with status ${status}`;
      return { code: `HTTP_${status}`, message, details: { errors: data.detail } };
    }
    if (typeof data.message === "string") {
      return { code: "UNKNOWN_ERROR", message: data.message, details: {} };
    }
  }
  return { code: "UNKNOWN_ERROR", message: `Request failed with status ${status}`, details: {} };
}

interface ApiOptions extends RequestInit {
  token?: string | null;
  apiKey?: string | null;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { token, apiKey, ...init } = options;
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
    "X-Hub-Client": HUB_CLIENT,
  };
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (apiKey) {
    headers["Authorization"] = `ApiKey ${apiKey}`;
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { credentials: "include", ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", `Hub backend unreachable (${API_BASE_URL}). Is the backend running?`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { code, message, details } = parseErrorMessage(errorData, response.status);
    throw new ApiError(response.status, code, message, details);
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { method: "GET", ...(options || {}) }),

  post: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body), ...(options || {}) }),

  postForm: <T>(endpoint: string, form: FormData, options?: ApiOptions) =>
    request<T>(endpoint, { method: "POST", body: form as unknown as BodyInit, ...(options || {}) }),

  del: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { method: "DELETE", body: JSON.stringify(body), ...(options || {}) }),

  download: async (endpoint: string, body?: unknown, options?: ApiOptions): Promise<{ blob: Blob; filename: string }> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Hub-Client": HUB_CLIENT,
    };
    const { token, apiKey } = options || {};
    if (apiKey) headers["Authorization"] = `ApiKey ${apiKey}`;
    else if (token) headers["Authorization"] = `Bearer ${token}`;
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", body: JSON.stringify(body), headers, credentials: "include" });
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", `Hub backend unreachable (${API_BASE_URL}). Is the backend running?`);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const { code, message, details } = parseErrorMessage(errorData, response.status);
      throw new ApiError(response.status, code, message, details);
    }
    const cd = response.headers.get("content-disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    return { blob: await response.blob(), filename: (m?.[1] || "hub-bundle.tar.gz").trim() };
  },
};
