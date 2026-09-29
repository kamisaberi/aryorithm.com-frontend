"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="pip-pulse block h-2.5 w-2.5 bg-cyan" style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }} aria-hidden="true" />
            <span className="font-display text-xl font-bold tracking-[0.16em] text-ink">ARYORITHM</span>
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Admin Console</p>
        </div>

        <div className="admin-card p-8">
          <h1 className="font-display text-lg font-semibold text-ink">Sign In</h1>
          <p className="mt-1 text-[13px] text-muted">Access the Aryorithm admin dashboard</p>

          {error && (
            <div className="mt-4 rounded-md border border-threat/30 bg-threat/10 px-4 py-3 text-[13px] text-threat">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
                placeholder="admin@aryorithm.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-btn-primary w-full justify-center"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-cyan transition-colors hover:text-cyan/80">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
