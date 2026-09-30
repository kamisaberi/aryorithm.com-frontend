"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type AttestationLog } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_NIS2, DUMMY_ATTESTATION } from "@/data/dummy";

export default function Nis2DoraPage() {
  const { token } = useAuth();
  const nis2 = useBackend(DUMMY_NIS2, (t: string) => backend.nis2(t), token);
  const logs = useBackend(
    DUMMY_ATTESTATION,
    (t: string) => backend.attestationLogs(t),
    token
  );
  const live = nis2.live && logs.live;

  const columns = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (l: AttestationLog) => (
        <span className="font-mono text-[11px] text-muted">{l.timestamp}</span>
      ),
    },
    {
      key: "pcr0_hash",
      header: "PCR0 Hash",
      render: (l: AttestationLog) => (
        <span className="font-mono text-[11px] text-ink">{l.pcr0_hash}</span>
      ),
    },
    {
      key: "verified",
      header: "Verified",
      render: (l: AttestationLog) => (
        <Badge variant={l.verified ? "kernel" : "muted"}>
          {l.verified ? "verified" : "unverified"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="NIS2 / DORA"
        description="NIS2 directive and DORA compliance management"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/nis2-dora" }, { label: "NIS2 / DORA" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Framework</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{nis2.data.framework}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Compliant</p>
          <div className="mt-2">
            <Badge variant={nis2.data.compliant ? "kernel" : "threat"}>
              {nis2.data.compliant ? "compliant" : "non-compliant"}
            </Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Incident SLA</p>
          <div className="mt-2">
            <Badge variant={nis2.data.incident_sla_verified ? "kernel" : "muted"}>
              {nis2.data.incident_sla_verified ? "verified" : "unverified"}
            </Badge>
          </div>
        </Card>
      </div>
      <Card>
        <Table
          columns={columns}
          data={logs.data}
          keyExtractor={(l) => `${l.timestamp}-${l.pcr0_hash}`}
        />
      </Card>
    </div>
  );
}
