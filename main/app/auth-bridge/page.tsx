"use client";

import { useEffect } from "react";

/**
 * SSO storage bridge. Embed as a hidden iframe from any of the three apps;
 * it owns the ONE shared token store (this origin's localStorage) and
 * answers `{type:"ary-sso:request"}` get/set/remove requests via postMessage.
 * Responses use `{type:"ary-sso:response"}` so they can never be mistaken
 * for another request (which previously caused two bridge frames to bounce
 * messages forever). Only our own origins are answered; only `aryorithm_*`
 * keys are touched.
 */
export default function AuthBridge() {
  useEffect(() => {
    const allowed = new Set(
      [
        window.location.origin,
        (process.env.NEXT_PUBLIC_DASHBOARD_URL || "").replace(/\/+$/, ""),
        (process.env.NEXT_PUBLIC_HUB_URL || "").replace(/\/+$/, ""),
        "https://aryorithm.com",
        "https://app.aryorithm.com",
        "https://hub.aryorithm.com",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ].filter(Boolean)
    );
    const onMessage = (e: MessageEvent) => {
      const d = e.data as Record<string, unknown> | null | undefined;
      if (!d || d.ns !== "ary-sso" || typeof d.id !== "number") return;
      if (!allowed.has(e.origin)) return;
      // Only a real operation is answered. Responses have no `op`, so they
      // are ignored instead of being echoed back (the old ping-pong bug).
      // Untyped requests from older hub/dashboard builds stay supported.
      const op = d.op;
      if (op !== "get" && op !== "set" && op !== "remove") return;
      const key = String(d.key ?? "");
      let value: string | null = null;
      let ok = true;
      try {
        if (!key.startsWith("aryorithm_")) {
          ok = false;
        } else if (op === "get") {
          value = localStorage.getItem(key);
        } else if (op === "set") {
          localStorage.setItem(key, String(d.value ?? ""));
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        ok = false;
      }
      const src = e.source as Window | null;
      src?.postMessage({ type: "ary-sso:response", ns: "ary-sso", id: d.id, ok, value }, e.origin);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
