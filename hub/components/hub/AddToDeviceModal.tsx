"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { HUB_API_BASE_URL } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { VaultArtifact, VaultVersion } from "@/lib/hub";

interface AddToDeviceModalProps {
  open: boolean;
  onClose: () => void;
  modelSlug: string;
  modelName: string;
  versions: VaultVersion[];
}

/** Add-to-device flow: pick a version artifact, download it, verify the
 *  checksum, and drop it where the edge runtimes expect it. */
export default function AddToDeviceModal({
  open,
  onClose,
  modelSlug,
  modelName,
  versions,
}: AddToDeviceModalProps) {
  const sorted = useMemo(
    () => [...versions].sort((a, b) => (a.version < b.version ? 1 : -1)),
    [versions]
  );
  const [version, setVersion] = useState(sorted[0]?.version ?? "");
  const [format, setFormat] = useState("");

  const active = sorted.find((v) => v.version === version) ?? sorted[0];
  const artifacts: VaultArtifact[] = active?.artifacts ?? [];
  const artifact =
    artifacts.find((a) => `${a.format}/${a.precision}/${a.target_hardware}` === format) ??
    artifacts[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && sorted.length > 0) {
      setVersion(sorted[0].version);
      setFormat("");
    }
  }, [open, sorted]);

  if (!open) return null;

  const downloadHref = artifact
    ? `${HUB_API_BASE_URL}/model-vault/${modelSlug}/versions/${encodeURIComponent(
        active.version
      )}/download?format=${encodeURIComponent(artifact.format)}&precision=${encodeURIComponent(
        artifact.precision
      )}&hardware=${encodeURIComponent(artifact.target_hardware)}`
    : undefined;
  const installSnippet = artifact
    ? [
        `# 1. download`,
        `curl -OJ "${downloadHref}"`,
        `# 2. verify checksum (air-gap friendly)`,
        `echo "${artifact.sha256_checksum}  ${artifact.file_name}" | sha256sum -c -`,
        `# 3. place for the edge runtimes`,
        `install -m 0644 ${artifact.file_name} /var/lib/blackbox/models/   # libxinfer.so`,
        `#    forge retraining reads:  /var/lib/xinfer-forge/weights/`,
      ].join("\n")
    : "";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-void/80 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${modelName} to device`}
    >
      <div
        className="rise-in w-full max-w-lg overflow-hidden rounded-md border border-hairline bg-panel shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="font-display text-[16px] font-bold text-ink">Add to Device</h2>
            <p className="mt-1 font-mono text-[10.5px] text-muted">{modelName}</p>
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

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Version
              </span>
              <select
                value={active?.version ?? ""}
                onChange={(e) => {
                  setVersion(e.target.value);
                  setFormat("");
                }}
                className="mt-1.5 w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink focus:border-cyan/60 focus:outline-none"
              >
                {sorted.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} · {v.rollout_stage}
                    {v.golden_safety_verified ? "" : " (unverified)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Artifact
              </span>
              <select
                value={artifact ? `${artifact.format}/${artifact.precision}/${artifact.target_hardware}` : ""}
                onChange={(e) => setFormat(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink focus:border-cyan/60 focus:outline-none"
              >
                {artifacts.map((a) => (
                  <option
                    key={`${a.format}/${a.precision}/${a.target_hardware}`}
                    value={`${a.format}/${a.precision}/${a.target_hardware}`}
                  >
                    {a.format} · {a.precision} · {a.target_hardware} ({bytes(a.file_size_bytes)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {artifact && (
            <div className="flex flex-wrap items-center gap-2">
              {artifact && active?.golden_safety_verified ? (
                <Badge variant="kernel">✓ Golden 100%</Badge>
              ) : (
                <Badge variant="telemetry">Unverified — download blocked</Badge>
              )}
              <span className="font-mono text-[10.5px] text-muted">
                sha256: <span className="text-kernel">{artifact.sha256_checksum.slice(0, 16)}…</span>
              </span>
            </div>
          )}

          {artifact && (
            <div className="overflow-hidden rounded-md border border-hairline bg-void">
              <div className="flex items-center justify-between border-b border-hairline bg-void/70 px-4 py-2">
                <span className="font-mono text-[10.5px] text-muted">edge install</span>
                <CopyButton text={installSnippet} label="Copy" />
              </div>
              <pre className="code-fade overflow-x-auto p-4 font-mono text-[11.5px] leading-[1.75] text-ink">
                <code>{installSnippet}</code>
              </pre>
            </div>
          )}

          {downloadHref && active?.golden_safety_verified && (
            <a
              href={downloadHref}
              className="block rounded-md bg-cyan px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
            >
              Download {artifact?.file_name} ↓
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
