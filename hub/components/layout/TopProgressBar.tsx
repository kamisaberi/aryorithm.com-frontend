"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_PROGRESS = 8;
const MAX_PROGRESS = 92;
const MIN_VISIBLE_MS = 280;
const SAFETY_TIMEOUT_MS = 8000;
const FADE_OUT_MS = 200;

// Links that trigger a file download or an API response should never leave
// the route progress bar running.
const DOWNLOAD_PATH = /\.(?:7z|aryopack|blueprint|csv|gz|ico|jpe?g|json|onnx|pcap|pdf|png|spkg|svg|tar|txt|webmanifest|webp|xml|ya?ml|zip)$/i;

function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const locationKey = `${pathname}?${search}`;

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeRef = useRef(false);
  const startedAtRef = useRef(0);
  const lastLocationRef = useRef(locationKey);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (!activeRef.current) return;

    activeRef.current = false;
    clearTimers();

    // Keep very fast, prefetched navigations from flashing too briefly.
    const elapsed = performance.now() - startedAtRef.current;
    const holdMs = Math.max(0, MIN_VISIBLE_MS - elapsed);
    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = setTimeout(() => setProgress(0), FADE_OUT_MS);
    }, holdMs + 140);
  }, [clearTimers]);

  const start = useCallback(() => {
    if (activeRef.current) return;

    clearTimers();
    activeRef.current = true;
    startedAtRef.current = performance.now();
    setProgress(START_PROGRESS);
    setVisible(true);

    intervalRef.current = setInterval(() => {
      setProgress((current) => {
        const remaining = MAX_PROGRESS - current;
        if (remaining <= 0.5) return MAX_PROGRESS;
        return Math.min(
          MAX_PROGRESS,
          current + Math.max(0.6, remaining * 0.08 + Math.random() * 2)
        );
      });
    }, 160);

    // A cancelled/aborted navigation should not pin the bar forever.
    safetyTimerRef.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
  }, [clearTimers, finish]);

  // Finish as soon as the App Router commits the new pathname/query.
  useEffect(() => {
    if (locationKey === lastLocationRef.current) return;
    lastLocationRef.current = locationKey;
    finish();
  }, [locationKey, finish]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;
      if (DOWNLOAD_PATH.test(url.pathname)) return;

      // Hash-only anchors and links back to the current page do not need a
      // network route transition.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      start();
    }

    function onPopState() {
      start();
    }

    function onHashChange() {
      finish();
    }

    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [finish, start]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}
