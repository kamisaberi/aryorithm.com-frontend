"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE_URL, setSessionTokens } from "@/lib/session";

const inputCls =
  "w-full rounded-md border border-hairline bg-void px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-cyan/60 focus:outline-none";
const labelCls =
  "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted";

export default function RegisterView() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(
          typeof detail === "string" ? detail : `Registration failed (${res.status})`
        );
      }
      const j = (await res.json()) as { access_token: string; refresh_token?: string };
      // Tokens land in the SHARED store — dashboard + hub see them too.
      await setSessionTokens(j.access_token, j.refresh_token);
      window.location.assign("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-5 pt-24 lg:px-8">
      <div className="w-full">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan">{"// Create Account"}</p>
        <h1 className="mt-2 font-display text-[30px] font-bold text-ink">Join Aryorithm.</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          One account for the main site, the fleet dashboard, and the hub.
        </p>
        {error && (
          <div className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className={labelCls}>Name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>Password (min 8 chars)</label>
            <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-cyan px-4 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Creating..." : "Register"}
          </button>
        </form>
        <p className="mt-5 text-center text-[12.5px] text-muted">
          Already a member?{" "}
          <Link href="/login" className="text-cyan hover:underline">Login</Link>
        </p>
      </div>
    </section>
  );
}
