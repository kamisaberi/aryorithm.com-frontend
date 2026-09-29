const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.error?.code || "UNKNOWN_ERROR",
      errorData.error?.message || `Request failed with status ${response.status}`,
      errorData.error?.details || {}
    );
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string | null) =>
    request<T>(endpoint, { method: "GET" }, token),

  post: <T>(endpoint: string, body?: unknown, token?: string | null) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }, token),

  put: <T>(endpoint: string, body?: unknown, token?: string | null) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }, token),

  delete: <T>(endpoint: string, token?: string | null) =>
    request<T>(endpoint, { method: "DELETE" }, token),
};
