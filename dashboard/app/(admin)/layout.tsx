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

  return <AdminShell>{children}</AdminShell>;
}
