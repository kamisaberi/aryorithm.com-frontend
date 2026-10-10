"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";

type Context = "edge" | "fleet" | "airgap";

interface InstallModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  version: string;
  verified: boolean;
  /** "<vendor>/<package>" manifest id, or the slug as fallback. */
  packageRef: string;
  sha256: string;
  /** Absolute backend download URL for the air-gapped archive (optional). */
  downloadUrl?: string;
}

/** 1-click install modal with 3 deployment contexts (§3.1). */
export default function InstallModal({
  open,
  onClose,
  title,
  version,
  verified,
  packageRef,
  sha256,
  downloadUrl,
}: InstallModalProps) {
  const [context, setContext] = useState<Context>("edge");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const edge = `sentinel plugin install ${packageRef}:${version}`;
  const fleet = `nexus-ctl plugin deploy ${packageRef}:${version} --fleet-wide`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-void/80 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Install ${title}`}
    >
      <div
        className="rise-in w-full max-w-lg overflow-hidden rounded-md border border-hairline bg-panel shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-muted">
              <span>v{version}</span>
              {verified && <Badge variant="kernel">✓ Verified</Badge>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-hairline px-2.5 py-1.5 font-mono text-[12px] text-muted hover:text-cyan"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-4">
          {(
            [
              { id: "edge", label: "Edge Appliance" },
              { id: "fleet", label: "Fleet Rollout" },
              { id: "airgap", label: "Air-Gapped" },
            ] as { id: Context; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setContext(t.id)}
              aria-pressed={context === t.id}
              className={`flex-1 rounded-md border px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
                context === t.id
                  ? "border-cyan/60 text-cyan"
                  : "border-hairline text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 px-5 py-4">
          {context === "edge" && (
            <div>
              <p className="text-[12.5px] text-muted">
                Single node — gateways, DIN-rail IPCs, testbeds.
              </p>
              <div className="terminal-body mt-2 flex items-center gap-2 overflow-x-auto rounded-md border border-hairline px-3 py-3">
                <code className="whitespace-nowrap font-mono text-[12px] text-ink">{edge}</code>
                <span className="ml-auto shrink-0">
                  <CopyButton text={edge} />
                </span>
              </div>
            </div>
          )}
          {context === "fleet" && (
            <div>
              <p className="text-[12.5px] text-muted">
                Coordinated rollout across up to 5,000 appliances over the Collective Defense Bus.
              </p>
              <div className="terminal-body mt-2 flex items-center gap-2 overflow-x-auto rounded-md border border-hairline px-3 py-3">
                <code className="whitespace-nowrap font-mono text-[12px] text-ink">{fleet}</code>
                <span className="ml-auto shrink-0">
                  <CopyButton text={fleet} />
                </span>
              </div>
            </div>
          )}
          {context === "airgap" && (
            <div>
              <p className="text-[12.5px] text-muted">
                Sneakernet staging — download the signed archive plus checksum, verify offline.
              </p>
              <div className="mt-2 rounded-md border border-hairline bg-void px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  SHA-256 verification
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-kernel">
                    {sha256 || "hash available after publish"}
                  </code>
                  {sha256 && <CopyButton text={sha256} label="Copy hash" />}
                </div>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    className="mt-3 block rounded-md bg-cyan px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
                  >
                    Download .splugin archive
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
