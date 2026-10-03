"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type RangeInstance, type TwinBlueprint } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK_BLUEPRINTS: TwinBlueprint[] = [
  { blueprint_id: "TWIN-SUBSTATION-ALPHA", name: "High-Voltage Electrical Substation", description: "IEC 60870-5-104 / Modbus TCP", protocols: ["IEC104", "MODBUS_TCP", "DNP3"] },
  { blueprint_id: "TWIN-HOSPITAL-PACS", name: "Hospital Clinical Imaging Enclave", description: "DICOM PACS / HL7 v2", protocols: ["DICOM", "HL7"] },
  { blueprint_id: "TWIN-REFINERY-CRACKING", name: "Petrochemical Refinery Cracking Unit", description: "Siemens S7Comm / PROFINET", protocols: ["S7COMM", "PROFINET"] },
  { blueprint_id: "TWIN-MARITIME-VESSEL", name: "Commercial Maritime Vessel Network", description: "AIS / MAVLink", protocols: ["AIS", "MAVLINK"] },
];

function runtimeLeft(expiresAt: number): string {
  const s = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "m")}m`;
}

export default function DigitalTwinsPage() {
  const { token } = useAuth();
  const blueprints = useBackend<TwinBlueprint[]>(FALLBACK_BLUEPRINTS, (t) => backend.twinBlueprints(t), token);
  const instances = useBackend<RangeInstance[]>([], (t) => backend.twinInstances(t), token, 10000);
  const [selected, setSelected] = useState("TWIN-SUBSTATION-ALPHA");
  const [enclave, setEnclave] = useState("Virtual Substation 01 Twin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>, label: string) => {
    if (!token || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage(label);
      instances.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const launch = () => act(
    () => backend.provisionTwin({ blueprint_id: selected, enclave_name: enclave, duration_hours: 2, traffic_profile: "OMNIFLOW_SCADA_DEFAULT" }, token).then((r) => `Launched ${r.instance_id} → ${r.assigned_sandbox_ip}`),
    "Launching…"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Twins"
        description="Pre-configured virtual infrastructure blueprints with sandbox lifecycle"
        breadcrumbs={[{ label: "Cyber Range", href: "/range/digital-twins" }, { label: "Digital Twins" }]}
        actions={<Badge variant={instances.live ? "kernel" : "muted"}>{instances.data.length} active</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {blueprints.data.map((b) => (
          <button
            key={b.blueprint_id}
            type="button"
            onClick={() => setSelected(b.blueprint_id)}
            className={`rounded-md border p-5 text-left transition-colors ${selected === b.blueprint_id ? "border-cyan/60 bg-cyan/5" : "border-hairline bg-panel hover:border-cyan/30"}`}
          >
            <p className={`font-display text-[15px] font-bold ${selected === b.blueprint_id ? "text-cyan" : "text-ink"}`}>{b.name}</p>
            <p className="mt-1 text-[12px] text-muted">{b.description}</p>
            <p className="mt-2 font-mono text-[10px] text-muted">{b.protocols.join(" · ")}</p>
          </button>
        ))}
      </div>
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={enclave} onChange={(e) => setEnclave(e.target.value)} placeholder="Enclave name" className="admin-input" aria-label="Enclave name" />
          <button type="button" disabled={busy} onClick={() => void launch()} className="admin-btn-primary text-[12px] disabled:opacity-50">
            {busy ? "Working…" : "Launch Twin Sandbox"}
          </button>
        </div>
        {message && <p className="mt-2 font-mono text-[11px] text-muted">{message}</p>}
      </Card>
      {instances.data.map((i) => (
        <Card key={i.instance_id} className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[13px] font-bold text-ink">{i.instance_id}</p>
            <Badge variant={i.status === "RUNNING" ? "kernel" : i.status === "PAUSED" ? "telemetry" : "muted"}>{i.status}</Badge>
            <span className="ml-auto flex flex-wrap gap-2">
              {i.status === "RUNNING" && (
                <button type="button" disabled={busy} onClick={() => void act(() => backend.pauseTwin(i.instance_id, token), `Paused ${i.instance_id}`)} className="admin-btn-secondary text-[11px] disabled:opacity-50">Pause</button>
              )}
              {i.status === "PAUSED" && (
                <button type="button" disabled={busy} onClick={() => void act(() => backend.resumeTwin(i.instance_id, token), `Resumed ${i.instance_id}`)} className="admin-btn-secondary text-[11px] disabled:opacity-50">Resume</button>
              )}
              <button type="button" disabled={busy} onClick={() => void act(() => backend.terminateTwin(i.instance_id, token), `Terminated ${i.instance_id}`)} className="font-mono text-[11px] text-threat hover:underline disabled:opacity-50">Terminate</button>
            </span>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">{i.enclave_name} · {i.assigned_sandbox_ip}</p>
          <p className="mt-1 font-mono text-[10.5px] text-muted">
            Active: {runtimeLeft(i.expires_at_timestamp)} · Quota: 50h/month · console: {i.web_console_url}
          </p>
          <div className="mt-2 space-y-1">
            {i.allocated_nodes.map((n) => (
              <p key={n.id} className="font-mono text-[10.5px] text-muted">{n.id} · {n.ip} · {n.role}</p>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
