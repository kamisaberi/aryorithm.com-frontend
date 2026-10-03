"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type MDRIncident, type MDRIncidentDetail } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: MDRIncident[] = [
  { incident_id: "MDR-INC-2026-081", severity: "CRITICAL", target_site: "Substation-Alpha-North", protocol: "MODBUS_TCP", threat_summary: "Unauthorized coil override on Register 105 (Turbine Cooling Relief)", in_kernel_drop_verified: true, aryorithm_analyst_assigned: "Lukas Weber (Lead Kernel Engineer)", analyst_verdict: "CONFIRMED_MALICIOUS_RECONNAISSANCE", status: "TRIAGED_CONTAINED", created_timestamp: 1774998240, contained_timestamp: 1774998241 },
];

export default function MdrTriagePage() {
  const { token } = useAuth();
  const incidents = useBackend<MDRIncident[]>(FALLBACK, (t) => backend.mdrIncidents(t), token, 15000);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<MDRIncidentDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const open = async (id: string) => {
    if (!token) return;
    setSelected(id);
    try {
      setDetail(await backend.mdrIncident(id, token));
    } catch {
      setDetail(null);
    }
  };

  const send = async () => {
    if (!token || !selected || !draft.trim() || busy) return;
    setBusy(true);
    try {
      await backend.mdrMessage(selected, { author_role: "customer", body: draft.trim() }, token);
      setDraft("");
      setDetail(await backend.mdrIncident(selected, token));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "incident", header: "Incident", render: (i: MDRIncident) => (
      <button type="button" onClick={() => void open(i.incident_id)} className="font-mono text-[11px] text-cyan hover:underline">
        {i.incident_id}
      </button>
    )},
    { key: "severity", header: "Severity", render: (i: MDRIncident) => (
      <Badge variant={i.severity === "CRITICAL" ? "threat" : i.severity === "HIGH" ? "telemetry" : "muted"}>{i.severity}</Badge>
    )},
    { key: "target", header: "Target", render: (i: MDRIncident) => (
      <div>
        <p className="text-[12px] text-ink">{i.target_site}</p>
        <p className="font-mono text-[10px] text-muted">{i.protocol}</p>
      </div>
    )},
    { key: "verdict", header: "Analyst Verdict", render: (i: MDRIncident) => (
      <span className="font-mono text-[11px] text-muted">{i.analyst_verdict}</span>
    )},
    { key: "status", header: "Status", render: (i: MDRIncident) => (
      <Badge variant={i.status === "OPEN" ? "threat" : "kernel"}>{i.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="MDR Triage Hub"
        description="Co-managed incidents with Aryorithm 24/7 analysts"
        breadcrumbs={[{ label: "Mission Control", href: "/dashboard/mdr-triage" }, { label: "MDR Triage Hub" }]}
        actions={
          <Badge variant="kernel">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-kernel pip-pulse" />
            On-duty L3 Lead assigned
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <Table columns={columns} data={incidents.data} keyExtractor={(i) => i.incident_id} />
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Investigation case drawer</p>
          {!detail ? (
            <p className="mt-3 text-[12.5px] text-muted">Select an incident to inspect telemetry, XAI, audit notes, and chat.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-[12.5px] text-ink">{detail.threat_summary}</p>
              <p className="font-mono text-[10.5px] text-muted">
                drop verified: {detail.in_kernel_drop_verified ? "yes" : "no"} · analyst: {detail.aryorithm_analyst_assigned}
              </p>
              <a href="/forensics/evidence" className="font-mono text-[11px] text-cyan hover:underline">carved PCAP links →</a>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-hairline bg-void/60 p-3">
                {detail.messages.length === 0 && <p className="font-mono text-[10.5px] text-muted">No messages yet.</p>}
                {detail.messages.map((m, i) => (
                  <div key={i}>
                    <p className="font-mono text-[10px] text-cyan">{m.author} · {m.author_role}</p>
                    <p className="text-[12px] text-ink">{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the SOC…" className="admin-input" />
                <button type="button" disabled={busy} onClick={() => void send()} className="admin-btn-primary text-[12px] disabled:opacity-50">Send</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
