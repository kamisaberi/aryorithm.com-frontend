"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ScadaEvent } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_SCADA_MONITOR } from "@/data/dummy";
import { useAuth } from "@/lib/auth";

export default function ScadaPage() {
  const { token } = useAuth();
  const { data, live } = useBackend(DUMMY_SCADA_MONITOR, (t) => backend.scada(t), token, 20000);
  const s = data.summary;

  const columns = [
    { key: "timestamp", header: "Time", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-muted">{new Date(e.timestamp * 1000).toLocaleTimeString()}</span>
    )},
    { key: "appliance", header: "Appliance", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-ink">{e.appliance_id}</span>
    )},
    { key: "protocol", header: "Protocol", render: (e: ScadaEvent) => (
      <Badge variant="telemetry">{e.protocol}</Badge>
    )},
    { key: "function", header: "Function", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-ink">{e.function_code}{e.register_address != null ? ` @${e.register_address}` : ""}</span>
    )},
    { key: "attacker", header: "Attacker", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-threat">{e.attacker_ip}</span>
    )},
    { key: "action", header: "Action", render: (e: ScadaEvent) => (
      <Badge variant="kernel">{e.action}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SCADA Monitor"
        description="SCADA and industrial control system monitoring"
        breadcrumbs={[{ label: "Collective Grid", href: "/threat-bus" }, { label: "SCADA Monitor" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "live" : "cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">MODBUS Violations</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{s.modbus_violations_total}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">IEC104 Trips Blocked</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{s.iec104_trips_blocked}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">S7 Writes Blocked</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{s.s7comm_writes_blocked}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">DNP3 Anomalies</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">{s.dnp3_anomalies_total}</p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={data.recent_events} keyExtractor={(e) => `${e.appliance_id}-${e.timestamp}-${e.attacker_ip}`} />
      </Card>
    </div>
  );
}
