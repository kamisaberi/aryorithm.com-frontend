"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { setSessionTokens } from "@/lib/session";

interface TokenPair {
  access_token: string;
  refresh_token?: string;
}

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
      // Tokens land in the SHARED store — dashboard + main see them too.
      const res = await api.post<TokenPair>("/auth/register", { name, email, password });
      await setSessionTokens(res.access_token, res.refresh_token);
      window.location.assign("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-5 pt-24">
      <div className="w-full">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Create Account"}</p>
        <h1 className="mt-2 font-display text-[26px] font-bold text-ink">Join the mesh.</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          One account for the hub, the fleet dashboard, and the main site.
        </p>
        {error && (
          <div className="mt-4 rounded-md border border-threat/30 bg-threat/10 px-4 py-3 text-[13px] text-threat">
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
            className="w-full rounded-md bg-cyan px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Creating..." : "Register"}
          </button>
        </form>
        <p className="mt-5 text-center text-[12.5px] text-muted">
          Already a member?{" "}
          <Link href="/login" className="text-cyan hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
