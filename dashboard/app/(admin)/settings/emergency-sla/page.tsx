"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type EmergencyDispatch } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: EmergencyDispatch[] = [];
const ROSTER = [
  ["Lead SCADA Architect", "Bram Visser · on-call primary"],
  ["Lead Kernel Engineer", "Lukas Weber · on-call secondary"],
  ["Hardware Trust Lead", "Sofia Kallas · escalation"],
];

export default function EmergencySlaPage() {
  const { token } = useAuth();
  const history = useBackend<EmergencyDispatch[]>(FALLBACK, (t) => backend.slaHistory(t), token, 15000);
  const [enclave, setEnclave] = useState("CRITICAL_OT_SUBSTATION_01");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = async () => {
    if (!token || !enclave.trim() || busy) return;
    const ok = window.confirm("Page on-call kernel + SCADA leads now?");
    if (!ok) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await backend.emergencyDispatch(
        { affected_enclave: enclave.trim(), urgency: "PHYSICAL_SAFETY_RISK", incident_notes: notes.trim() }, token
      );
      setResult(`${res.dispatch_id}: ${res.status} — responders paged, bridge ${res.emergency_bridge_link}`);
      history.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "id", header: "Dispatch", render: (d: EmergencyDispatch) => (
      <span className="font-mono text-[11px] text-ink">{d.dispatch_id}</span>
    )},
    { key: "enclave", header: "Enclave", render: (d: EmergencyDispatch) => (
      <span className="font-mono text-[11px] text-muted">{d.affected_enclave}</span>
    )},
    { key: "response", header: "Response", render: (d: EmergencyDispatch) => (
      <span className="font-mono text-[11px] text-ink">
        {d.response_time_seconds == null ? "paged…" : `${Math.floor(d.response_time_seconds / 60)}m ${d.response_time_seconds % 60}s`}
      </span>
    )},
    { key: "sla", header: "15-min SLA", render: (d: EmergencyDispatch) => (
      d.sla_met == null
        ? <Badge variant="telemetry">PENDING</Badge>
        : <Badge variant={d.sla_met ? "kernel" : "threat"}>{d.sla_met ? "MET" : "MISSED"}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency SLA & Triage"
        description="15-minute critical incident response guarantee"
        breadcrumbs={[{ label: "Settings & Governance", href: "/settings/emergency-sla" }, { label: "Emergency SLA" }]}
        actions={<Badge variant="kernel">15-MINUTE CRITICAL SLA ACTIVE</Badge>}
      />
      <Card className="border-threat/40 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-threat">Red alert emergency trigger</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={enclave} onChange={(e) => setEnclave(e.target.value)} placeholder="CRITICAL_OT_SUBSTATION_01" className="admin-input font-mono" aria-label="Affected enclave" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Incident notes (optional)" className="admin-input" aria-label="Incident notes" />
          <button type="button" disabled={busy} onClick={() => void trigger()} className="admin-btn-primary text-[12px] disabled:opacity-50">
            {busy ? "Paging…" : "Trigger Immediate L3 Emergency Escalation"}
          </button>
        </div>
        {result && <p className="mt-2 font-mono text-[11px] text-kernel">{result}</p>}
        {error && <p className="mt-2 font-mono text-[11px] text-threat">{error}</p>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">On-call roster</p>
          <div className="mt-3 space-y-2">
            {ROSTER.map(([role, who]) => (
              <div key={role} className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-ink">{role}</span>
                <span className="font-mono text-[10.5px] text-muted">{who}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-muted">Dispatch: SMS + PagerDuty + voice call, multi-channel</p>
        </Card>
        <Card>
          <Table columns={columns} data={history.data} keyExtractor={(d) => d.dispatch_id} />
        </Card>
      </div>
    </div>
  );
}
