"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_SCADA } from "@/data/dummy";
import { useAuth } from "@/lib/auth";

export default function ScadaPage() {
  const { token } = useAuth();
  const { data, live } = useBackend(DUMMY_SCADA, (t) => backend.scada(t), token);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">MODBUS Violations</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{data.modbus_violations}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">DNP3 Violations</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{data.dnp3_violations}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Overrides Blocked</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">{data.overrides_blocked}</p>
        </Card>
      </div>
      <Card className="p-5">
        <p className="text-[13px] text-muted">
          MODBUS / DNP3 function-code allow-list enforced at the edge; unsafe overrides are
          blocked before actuation.
        </p>
      </Card>
    </div>
  );
}
