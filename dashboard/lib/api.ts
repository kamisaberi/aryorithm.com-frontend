const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiOptions extends RequestInit {
  tenantId?: string | null;
  enclaveId?: string | null;
  apiKey?: string | null;
  /** Set for FormData uploads so the JSON content type is not forced. */
  noJsonContentType?: boolean;
}

function parseErrorMessage(errorData: unknown, status: number): { code: string; message: string; details: Record<string, unknown> } {
  if (typeof errorData === "object" && errorData !== null) {
    const data = errorData as Record<string, unknown>;
    // Spec envelope: { success: false, error: { code, message, details } }
    if (typeof data.error === "object" && data.error !== null) {
      const err = data.error as Record<string, unknown>;
      return {
        code: typeof err.code === "string" ? err.code : "UNKNOWN_ERROR",
        message: typeof err.message === "string" ? err.message : `Request failed with status ${status}`,
        details: typeof err.details === "object" && err.details !== null ? (err.details as Record<string, unknown>) : {},
      };
    }
    // FastAPI HTTPException: { detail: "message" }
    if (typeof data.detail === "string") {
      return { code: `HTTP_${status}`, message: data.detail, details: {} };
    }
    // FastAPI validation: { detail: [{ msg, loc }] }
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

async function request<T>(endpoint: string, options: ApiOptions = {}, token?: string | null): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { tenantId, enclaveId, apiKey, noJsonContentType, ...init } = options;
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };
  if (!noJsonContentType && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Explicit per-call tenant wins; otherwise use the header switcher
  // selection (Service 3: 1-click tenant context without re-login).
  let effectiveTenant = tenantId ?? null;
  if (!effectiveTenant) {
    try {
      const { getSelectedTenant } = await import("./tenant");
      effectiveTenant = getSelectedTenant();
    } catch {
      effectiveTenant = null;
    }
  }
  if (effectiveTenant) {
    headers["X-Tenant-ID"] = effectiveTenant;
  }
  if (enclaveId) {
    headers["X-Enclave-ID"] = enclaveId;
  }
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const response = await fetch(url, { ...init, headers });

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
  get: <T>(endpoint: string, token?: string | null, options?: ApiOptions) =>
    request<T>(endpoint, { method: "GET", ...(options || {}) }, token),

  post: <T>(endpoint: string, body?: unknown, token?: string | null, options?: ApiOptions) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body), ...(options || {}) }, token),

  postForm: <T>(endpoint: string, form: FormData, token?: string | null, options?: ApiOptions) => {
    const merged: ApiOptions = { method: "POST", body: form as unknown as BodyInit, ...(options || {}) };
    (merged as Record<string, unknown>).noJsonContentType = true;
    return request<T>(endpoint, merged, token);
  },

  postBlob: async (endpoint: string, body?: unknown, token?: string | null, options?: ApiOptions): Promise<Blob> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const { getSelectedTenant } = await import("./tenant");
      const selected = getSelectedTenant();
      if (selected) headers["X-Tenant-ID"] = selected;
    } catch {
      /* no tenant context */
    }
    const response = await fetch(url, { method: "POST", body: JSON.stringify(body), headers });
    if (!response.ok) throw new Error(`Export failed with status ${response.status}`);
    return response.blob();
  },

  put: <T>(endpoint: string, body?: unknown, token?: string | null, options?: ApiOptions) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body), ...(options || {}) }, token),

  patch: <T>(endpoint: string, body?: unknown, token?: string | null, options?: ApiOptions) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body), ...(options || {}) }, token),

  delete: <T>(endpoint: string, token?: string | null, options?: ApiOptions) =>
    request<T>(endpoint, { method: "DELETE", ...(options || {}) }, token),
};
