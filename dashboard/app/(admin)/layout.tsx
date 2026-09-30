"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useNexusPolling } from "@/hooks/useNexusPolling";
import AdminShell from "@/components/layout/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, loading } = useAuth();
  // Keep Nexus heartbeat alive on every dashboard page:
  // POST /fleet/sync every 5s, GET /threats/global-feed every 20s.
  useNexusPolling(token, !loading && !!token);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.push("/login");
    }
  }, [token, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <div className="text-center">
          <span className="pip-pulse mx-auto block h-3 w-3 bg-cyan" style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }} aria-hidden="true" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return <AdminShell>{children}</AdminShell>;
}
