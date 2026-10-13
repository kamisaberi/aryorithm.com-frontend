"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

export interface TenantRef {
  id: string;
  name: string;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  tenants: TenantRef[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "aryorithm_token";
const REFRESH_KEY = "aryorithm_refresh_token";

/** Roles allowed through admin gates (mirrors backend get_current_admin). */
const ADMIN_ROLES = new Set(["super_admin", "tenant_admin", "admin"]);

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Silent SSO bootstrap: no stored token (fresh browser, came from hub or
    // main) → the shared-domain cookie still authenticates /auth/refresh.
    const silentRefresh = () =>
      api
        .post<AuthResponse>("/auth/refresh", {})
        .then(async (res) => {
          if (cancelled) return;
          setToken(res.access_token);
          localStorage.setItem(TOKEN_KEY, res.access_token);
          if (res.refresh_token) {
            localStorage.setItem(REFRESH_KEY, res.refresh_token);
          }
          const userData = await api.get<User>("/auth/me", res.access_token);
          if (!cancelled) setUser(userData);
        })
        .catch(() => {
          if (cancelled) return;
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      api
        .get<User>("/auth/me", storedToken)
        .then(setUser)
        // Stored token dead (expiry, global logout elsewhere) → one silent
        // retry via the SSO cookie before giving up.
        .catch(silentRefresh);
    } else {
      silentRefresh();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    setToken(res.access_token);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    if (res.refresh_token) {
      localStorage.setItem(REFRESH_KEY, res.refresh_token);
    }
    const userData = await api.get<User>("/auth/me", res.access_token);
    setUser(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/register", { name, email, password });
    setToken(res.access_token);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    if (res.refresh_token) {
      localStorage.setItem(REFRESH_KEY, res.refresh_token);
    }
    const userData = await api.get<User>("/auth/me", res.access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    // Global logout: revokes all refresh tokens server-side and clears the
    // shared-domain SSO cookies, so hub/main sessions die too. Best-effort —
    // local state is cleared even if the backend is unreachable.
    try {
      await api.post("/auth/logout", {}, token);
    } catch {
      /* backend unreachable — still log out locally */
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
