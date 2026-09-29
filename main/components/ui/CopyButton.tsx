"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export default function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "✓ Copied",
  className = "",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await copyText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={
        "shrink-0 rounded-md border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] transition-colors " +
        (copied ? "border-kernel/60 text-kernel" : "border-hairline text-muted hover:border-cyan/60 hover:text-cyan") +
        (className ? ` ${className}` : "")
      }
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
