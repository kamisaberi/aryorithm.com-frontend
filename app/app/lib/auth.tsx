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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "aryorithm_token";
const REFRESH_KEY = "aryorithm_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      api
        .get<User>("/auth/me", storedToken)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, []);

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
