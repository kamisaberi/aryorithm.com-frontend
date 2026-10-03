"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type FleetGroup } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK: FleetGroup[] = [
  { group_id: "CRITICAL_OT", description: "Industrial SCADA and high-voltage electrical protection", scada_mode: true, max_latency_us: 800, node_count: 5, active_threats: 0 },
  { group_id: "DEFAULT_DMZ", description: "Public-facing corporate web and API gateways", scada_mode: false, max_latency_us: 1000, node_count: 8, active_threats: 2 },
];

export default function FleetEnclavesPage() {
  const { token } = useAuth();
  const groups = useBackend<FleetGroup[]>(FALLBACK, (t) => backend.fleetGroups(t), token, 20000);
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [description, setDescription] = useState("");
  const [scada, setScada] = useState(false);
  const [latency, setLatency] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const create = async () => {
    if (!token || !groupId.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await backend.createFleetGroup({
        group_id: groupId.trim(),
        description: description.trim(),
        scada_mode: scada,
        max_allowed_latency_us: Number(latency) || 1000,
      }, token);
      setMessage(`Created ${res.group_id}`);
      setGroupId("");
      setDescription("");
      groups.refresh();
      setOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Enclaves"
        description="Physical zones with latency SLAs and SCADA enforcement"
        breadcrumbs={[{ label: "Edge Fleet", href: "/fleet/enclaves" }, { label: "Site Enclaves" }]}
        actions={
          <button type="button" onClick={() => setOpen((v) => !v)} className="admin-btn-primary text-[12px]">
            + Add New Enclave
          </button>
        }
      />
      {open && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="REFINERY_CRACKING_UNIT" className="admin-input font-mono" aria-label="Group ID" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="admin-input" aria-label="Description" />
            <input value={latency} onChange={(e) => setLatency(e.target.value)} placeholder="650" inputMode="numeric" className="admin-input font-mono" aria-label="Max latency µs" />
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input type="checkbox" checked={scada} onChange={(e) => setScada(e.target.checked)} />
              SCADA mode
            </label>
          </div>
          <button type="button" disabled={busy} onClick={() => void create()} className="admin-btn-primary mt-3 text-[12px] disabled:opacity-50">
            {busy ? "Creating…" : "Create Enclave"}
          </button>
        </Card>
      )}
      {message && <p className="font-mono text-[11px] text-muted">{message}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.data.map((g) => (
          <Card key={g.group_id} className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[13px] font-bold text-ink">{g.group_id}</p>
              {g.scada_mode && <Badge variant="telemetry">SCADA</Badge>}
            </div>
            <p className="mt-1 min-h-[2.5em] text-[12px] text-muted">{g.description || "—"}</p>
            <div className="mt-3 flex items-center gap-4 font-mono text-[11px] text-muted">
              <span>SLA ≤ {g.max_latency_us}µs</span>
              <span className="text-cyan">{g.node_count} nodes</span>
              <span className={g.active_threats > 0 ? "text-threat" : "text-kernel"}>{g.active_threats} threats</span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted">{groups.live ? "live" : "cached"}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
