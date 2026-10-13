"use client";

/**
 * Shared token storage across dashboard + hub + main.
 *
 * localStorage is per-origin, so the three subdomains cannot see each
 * other's. Instead every app talks to ONE store: a hidden iframe serving
 * the bridge page on the main site, which reads/writes ITS localStorage
 * over postMessage (strict origin + key-prefix checks on both ends).
 * Login on any app → tokens land in the shared store → the other two apps
 * read them on boot. No links, tickets, or redirects involved.
 *
 * If the bridge is unreachable (e.g. main site not running in local dev),
 * every op falls back to this origin's own localStorage so single-app dev
 * keeps working.
 */

const BRIDGE_PATH = "/auth-bridge";

function bridgeOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_BRIDGE_URL || "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  try {
    if (typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      return "http://localhost:3002";
    }
  } catch {
    /* ignore */
  }
  return "https://aryorithm.com";
}

let iframePromise: Promise<HTMLIFrameElement | null> | null = null;
let seq = 0;
const pending = new Map<number, (v: Record<string, unknown>) => void>();

function ensureBridge(): Promise<HTMLIFrameElement | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }
  if (!iframePromise) {
    iframePromise = new Promise((resolve) => {
      let done = false;
      const finish = (el: HTMLIFrameElement | null) => {
        if (!done) {
          done = true;
          resolve(el);
        }
      };
      try {
        const origin = bridgeOrigin();
        const onMessage = (e: MessageEvent) => {
          if (e.origin !== origin) return;
          const d = e.data as Record<string, unknown> | null | undefined;
          if (!d || d.ns !== "ary-sso" || typeof d.id !== "number") return;
          const r = pending.get(d.id);
          if (r) {
            pending.delete(d.id);
            r(d);
          }
        };
        window.addEventListener("message", onMessage);
        const f = document.createElement("iframe");
        f.src = `${origin}${BRIDGE_PATH}`;
        f.style.display = "none";
        f.setAttribute("aria-hidden", "true");
        f.tabIndex = -1;
        const timer = setTimeout(() => finish(null), 2500);
        f.onload = () => {
          clearTimeout(timer);
          finish(f);
        };
        document.body.appendChild(f);
      } catch {
        finish(null);
      }
    });
  }
  return iframePromise;
}

function callBridge(op: string, key: string, value?: string): Promise<Record<string, unknown>> {
  return ensureBridge().then((f) => {
    const win = f?.contentWindow;
    if (!win) throw new Error("bridge unavailable");
    const id = ++seq;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      pending.set(id, resolve);
      setTimeout(() => {
        if (pending.delete(id)) reject(new Error("bridge timeout"));
      }, 2500);
      win.postMessage({ ns: "ary-sso", id, op, key, value }, bridgeOrigin());
    });
  });
}

function local(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Read a shared key (bridge first, own localStorage as fallback). */
export async function ssGet(key: string): Promise<string | null> {
  try {
    const r = await callBridge("get", key);
    if (r.ok) return (r.value as string | null) ?? null;
  } catch {
    /* fall through to local */
  }
  return local()?.getItem(key) ?? null;
}

/** Write a shared key (bridge; mirrors locally only if bridge is down). */
export async function ssSet(key: string, value: string): Promise<void> {
  try {
    const r = await callBridge("set", key, value);
    if (r.ok) return;
  } catch {
    /* fall through to local */
  }
  try {
    local()?.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** Delete a shared key (bridge + local mirror, best-effort both). */
export async function ssRemove(key: string): Promise<void> {
  try {
    await callBridge("remove", key);
  } catch {
    /* fall through */
  }
  try {
    local()?.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}
