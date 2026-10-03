"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ScadaEvent } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_SCADA_MONITOR } from "@/data/dummy";
import { useAuth } from "@/lib/auth";

const PROTOCOLS = ["MODBUS_TCP", "IEC104", "S7COMM", "DNP3"] as const;

export default function ScadaCpsPage() {
  const { token } = useAuth();
  const { data, live } = useBackend(DUMMY_SCADA_MONITOR, (t) => backend.scada(t), token, 20000);
  const s = data.summary;

  const cards = [
    { title: "Modbus TCP", sub: "Coils monitored · overrides blocked", value: s.modbus_violations_total },
    { title: "IEC 60870-5-104", sub: "APDU Type 45 breaker trips blocked", value: s.iec104_trips_blocked },
    { title: "Siemens S7Comm", sub: "Memory DB read/write traps", value: s.s7comm_writes_blocked },
    { title: "DNP3", sub: "Cold restart injections blocked", value: s.dnp3_anomalies_total },
  ];

  const columns = [
    { key: "time", header: "Time", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-muted">{new Date(e.timestamp * 1000).toLocaleTimeString()}</span>
    )},
    { key: "node", header: "Appliance / Site", render: (e: ScadaEvent) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{e.appliance_id}</p>
        <p className="font-mono text-[10px] text-muted">{e.site}</p>
      </div>
    )},
    { key: "proto", header: "Protocol", render: (e: ScadaEvent) => (
      <Badge variant="telemetry">{e.protocol}</Badge>
    )},
    { key: "detail", header: "Intercept", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-ink">{e.function_code}{e.register_address != null ? ` @${e.register_address}` : ""} {e.plc_ip ? `→ ${e.plc_ip}` : ""}</span>
    )},
    { key: "attacker", header: "Attacker", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-threat">{e.attacker_ip}</span>
    )},
    { key: "action", header: "Action", render: (e: ScadaEvent) => (
      <span className="font-mono text-[11px] text-kernel">{e.action} {e.mitigation_time_us.toFixed(2)}µs</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SCADA & OT Monitor"
        description="Protocol violation widgets and physical actuation log"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/scada-cps" }, { label: "SCADA & OT Monitor" }]}
        actions={<Badge variant={live ? "kernel" : "muted"}>{live ? "live" : "cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROTOCOLS.map((p, i) => (
          <Card key={p} className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{cards[i].title}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{cards[i].value}</p>
            <p className="mt-1 text-[11.5px] text-muted">{cards[i].sub}</p>
          </Card>
        ))}
      </div>
      <Card>
        <Table columns={columns} data={data.recent_events} keyExtractor={(e) => `${e.appliance_id}-${e.timestamp}-${e.attacker_ip}`} />
      </Card>
    </div>
  );
}
