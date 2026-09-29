"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

export interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  tenants: { id: string; name: string }[];
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("aryorithm_token");
    if (storedToken) {
      setToken(storedToken);
      api.get<User>("/auth/me", storedToken)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("aryorithm_token");
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
    localStorage.setItem("aryorithm_token", res.access_token);
    const userData = await api.get<User>("/auth/me", res.access_token);
    setUser(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/register", { name, email, password });
    setToken(res.access_token);
    localStorage.setItem("aryorithm_token", res.access_token);
    const userData = await api.get<User>("/auth/me", res.access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("aryorithm_token");
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
