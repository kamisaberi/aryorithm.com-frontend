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

  return null;
}
