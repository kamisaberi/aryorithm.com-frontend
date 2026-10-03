"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type FirmwareReport } from "@/lib/backend";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function FirmwareAnalyzerPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<FirmwareReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (): Promise<void> => {
    setError(null);
    setReport(null);
    if (!file) {
      setError("Select a firmware image first (.bin / .rom / .hex).");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/dfir/firmware/dissect`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Dissect failed with status ${res.status}`);
      const task = (await res.json()) as { task_id: string; status: string };
      const rep: FirmwareReport = await backend.firmwareReport(task.task_id, token);
      setReport(rep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firmware Analyzer"
        description="Binary anatomy inspector with CVE and backdoor findings"
        breadcrumbs={[{ label: "Digital Forensics", href: "/dfir/firmware-analyzer" }, { label: "Firmware Analyzer" }]}
        actions={report ? <Badge variant={report.security_score === "LOW_RISK" ? "kernel" : "threat"}>{report.security_score}</Badge> : undefined}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Binary image dropzone (.bin / .rom / .hex)</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" className="admin-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" className="admin-btn-primary text-[12px] disabled:opacity-50" disabled={busy || !file} onClick={() => void analyze()}>
            {busy ? "Analyzing…" : "Dissect"}
          </button>
        </div>
        {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
      </Card>
      {report && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Architecture</p>
              <p className="mt-1 font-mono text-[12px] text-ink">{report.cpu_architecture}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Filesystem</p>
              <p className="mt-1 font-mono text-[12px] text-ink">{report.extracted_filesystem}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">SHA-256</p>
              <p className="mt-1 break-all font-mono text-[10.5px] text-muted">{report.sha256}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {report.findings.length === 0 && <p className="font-mono text-[11px] text-kernel">No findings — clean image.</p>}
            {report.findings.map((f, i) => (
              <div key={i} className="rounded border border-hairline p-3">
                <Badge variant={f.severity === "CRITICAL" ? "threat" : f.severity === "HIGH" ? "telemetry" : "muted"}>{f.severity}</Badge>
                <span className="ml-2 font-mono text-[11px] text-ink">{f.category}</span>
                <p className="mt-1 text-[12px] text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
