"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { useAuth } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Vuln {
  cve: string;
  severity: string;
  description: string;
}

export default function FirmwarePage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [error, setError] = useState<string | null>(null);

  const dissect = async (): Promise<void> => {
    setError(null);
    setVulns([]);
    setTaskId(null);
    if (!file) {
      setError("Select a firmware image first.");
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
      setTaskId(task.task_id);
      const rep = await fetch(`${API_BASE}/dfir/firmware/reports/${task.task_id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!rep.ok) throw new Error(`Report fetch failed with status ${rep.status}`);
      const report = (await rep.json()) as { vulnerabilities: Vuln[] };
      setVulns(report.vulnerabilities ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dissection failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "cve",
      header: "CVE",
      render: (v: Vuln) => (
        <span className="font-mono text-[12px] font-medium text-ink">{v.cve}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (v: Vuln) => (
        <Badge variant={v.severity === "CRITICAL" ? "threat" : v.severity === "HIGH" ? "telemetry" : "muted"}>
          {v.severity}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Finding",
      render: (v: Vuln) => <span className="text-[12px] text-muted">{v.description}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firmware Analyzer"
        description="Inspect router / PLC firmware for backdoors and known CVEs"
        breadcrumbs={[{ label: "Forensics (DFIR)", href: "/forensics/firmware" }, { label: "Firmware Analyzer" }]}
        actions={taskId ? <Badge variant="cyan">{taskId}</Badge> : undefined}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Upload firmware (.bin / .rom)
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" className="admin-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" className="admin-btn-primary text-[12px] disabled:opacity-50" disabled={busy || !file} onClick={() => void dissect()}>
            {busy ? "Analyzing…" : "Dissect"}
          </button>
        </div>
        {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
      </Card>
      {vulns.length > 0 && (
        <Card>
          <Table columns={columns} data={vulns} keyExtractor={(v) => v.cve} />
        </Card>
      )}
    </div>
  );
}
