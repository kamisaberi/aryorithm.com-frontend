"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageLoader() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setLoading(true);
    setProgress(0);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }, 600);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-hairline" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan"
            style={{ animation: "spin 0.8s linear infinite" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2.5 w-2.5 bg-cyan" style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="font-display text-[14px] font-bold tracking-[0.2em] text-ink">ARYORITHM</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Loading</span>
        </div>
        <div className="h-[2px] w-48 overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-cyan transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
