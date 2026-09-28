/**
 * Universal clipboard copy with resilient fallback.
 * The async Clipboard API REJECTS (rather than being absent) in headless
 * browsers, non-secure origins and sandboxed webviews — so we catch the
 * rejection and fall back to the legacy selection path.
 * Returns true when some mechanism reported success.
 */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Permission denied / insecure context — fall through.
      }
    }
  } catch {
    // navigator itself unavailable — fall through.
  }
  return legacyCopy(text);
}
