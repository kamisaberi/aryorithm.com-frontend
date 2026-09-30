"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.push(token ? "/dashboard" : "/login");
  }, [token, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <div className="text-center">
        <span className="pip-pulse mx-auto block h-3 w-3 bg-cyan" style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }} aria-hidden="true" />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Loading...</p>
      </div>
    </div>
  );
}
