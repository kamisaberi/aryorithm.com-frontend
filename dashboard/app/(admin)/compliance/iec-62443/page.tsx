"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type CMMCStatus } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_IEC, DUMMY_CMMC } from "@/data/dummy";

type Finding = CMMCStatus["findings"][number];

export default function Iec62443Page() {
  const { token } = useAuth();
  const iec = useBackend(DUMMY_IEC, (t: string) => backend.iec62443(t), token);
  const cmmc = useBackend(DUMMY_CMMC, (t: string) => backend.cmmc(t), token);
  const live = iec.live && cmmc.live;

  const columns = [
    {
      key: "control_id",
      header: "Control ID",
      render: (f: Finding) => (
        <span className="font-mono text-[11px] text-ink">{f.control_id}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (f: Finding) => (
        <span className="text-[12px] text-ink">{f.title}</span>
      ),
    },
    {
      key: "passed",
      header: "Passed",
      render: (f: Finding) => (
        <Badge variant={f.passed ? "kernel" : "threat"}>
          {f.passed ? "passed" : "failed"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="IEC 62443 / CMMC"
        description="IEC 62443 and CMMC cybersecurity compliance"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/nis2-dora" }, { label: "IEC 62443 / CMMC" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Standard</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{iec.data.standard}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">System Integrity</p>
          <p className="mt-2 font-display text-2xl font-bold text-kernel">{iec.data.system_integrity}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Zones Verified</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{iec.data.zones_verified}</p>
        </Card>
      </div>
      <Card>
        <Table
          columns={columns}
          data={cmmc.data.findings}
          keyExtractor={(f) => f.control_id}
        />
      </Card>
    </div>
  );
}
