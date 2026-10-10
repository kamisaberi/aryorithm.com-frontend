"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/** Clipboard button with ephemeral checkmark feedback (§5.2). */
export default function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied to Clipboard!" : label}
      className={`relative inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
        copied ? "border-kernel/60 text-kernel" : "text-muted hover:border-cyan/60 hover:text-cyan"
      } ${className}`}
    >
      {copied ? (
        <>
          <span aria-hidden="true">✓</span> Copied
        </>
      ) : (
        <>
          <span aria-hidden="true">⎘</span> {label}
        </>
      )}
    </button>
  );
}
