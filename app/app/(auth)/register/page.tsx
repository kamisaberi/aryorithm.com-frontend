"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
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
          <h1 className="font-display text-lg font-semibold text-ink">Create Account</h1>
          <p className="mt-1 text-[13px] text-muted">Register for the Aryorithm admin dashboard</p>

          {error && (
            <div className="mt-4 rounded-md border border-threat/30 bg-threat/10 px-4 py-3 text-[13px] text-threat">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="admin-input"
                placeholder="Admin User"
                required
                autoComplete="name"
              />
            </div>

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
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="admin-input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-btn-primary w-full justify-center"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan transition-colors hover:text-cyan/80">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
