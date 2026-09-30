"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function CdrPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSanitize = async (): Promise<void> => {
    setStatus(null);
    setError(null);
    if (!file) {
      setError("Select a file to sanitize first.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/dfir/cdr/sanitize`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Sanitization failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sanitized-${file.name}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Sanitized ${file.name} — download started.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sanitization failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CDR Sanitizer"
        description="Content Disarm and Reconstruction sanitization"
        breadcrumbs={[{ label: "Forensics (DFIR)", href: "/forensics/evidence" }, { label: "CDR Sanitizer" }]}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          About CDR
        </p>
        <p className="mt-2 text-[13px] text-muted">
          Content Disarm and Reconstruction rebuilds files from known-safe
          primitives, stripping embedded macros, scripts, and exploits while
          preserving usable content. Upload a suspect file to receive a
          sanitized copy.
        </p>
      </Card>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Sanitize a file
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            className="admin-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="admin-btn-primary"
            disabled={busy || !file}
            onClick={() => void handleSanitize()}
          >
            {busy ? "Sanitizing…" : "Sanitize"}
          </button>
        </div>
        {file && (
          <p className="mt-2 font-mono text-[11px] text-muted">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {status && (
          <p className="mt-2 font-mono text-[12px] text-kernel">{status}</p>
        )}
        {error && (
          <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>
        )}
      </Card>
    </div>
  );
}
