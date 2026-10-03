"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const STAGES = ["Scanning document structures", "Stripping VBA macros / OLE objects / scripts", "Rebuilding clean visual representation"];

export default function CdrSanitizerPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState<{ name: string; from: number; to: number; status: string; removed: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sanitize = async (): Promise<void> => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Select a .docx, .pdf, .xlsx, or .pptx file first.");
      return;
    }
    setBusy(true);
    setStage(0);
    try {
      const timers = STAGES.map((_, i) => setTimeout(() => setStage(i), 400 * (i + 1)));
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/dfir/cdr/sanitize`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      timers.forEach(clearTimeout);
      setStage(STAGES.length - 1);
      if (!res.ok) throw new Error(`Sanitization failed with status ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sanitized-${file.name}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setResult({
        name: file.name,
        from: file.size,
        to: blob.size,
        status: res.headers.get("X-Sanitization-Status") ?? "CLEAN",
        removed: res.headers.get("X-Threats-Removed") ?? "0",
      });
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
        description="Strip macros and active content, download a clean document"
        breadcrumbs={[{ label: "Digital Forensics", href: "/dfir/cdr-sanitizer" }, { label: "CDR Sanitizer" }]}
        actions={result ? <Badge variant="kernel">{result.status}</Badge> : undefined}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">File dropzone (.docx / .pdf / .xlsx / .pptx)</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" className="admin-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" className="admin-btn-primary text-[12px] disabled:opacity-50" disabled={busy || !file} onClick={() => void sanitize()}>
            {busy ? "Sanitizing…" : "Sanitize"}
          </button>
        </div>
        {busy && (
          <div className="mt-3 space-y-1">
            {STAGES.map((s, i) => (
              <p key={s} className={`font-mono text-[11px] ${i <= stage ? "text-cyan" : "text-muted"}`}>
                {i <= stage ? "▸" : "·"} {s}
              </p>
            ))}
          </div>
        )}
        {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
      </Card>
      {result && (
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Sanitized file download card</p>
          <p className="mt-2 font-mono text-[12px] text-ink">{result.name}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {(result.from / 1024).toFixed(1)} KB → {(result.to / 1024).toFixed(1)} KB · {result.removed} threats stripped · download started
          </p>
        </Card>
      )}
    </div>
  );
}
