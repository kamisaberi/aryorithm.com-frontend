"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_INSURANCE } from "@/data/dummy";

export default function InsurancePage() {
  const { token } = useAuth();
  const insurance = useBackend(
    DUMMY_INSURANCE,
    (t: string) => backend.insurance(t),
    token
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Proof"
        description="Cyber insurance documentation and evidence management"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/nis2-dora" }, { label: "Insurance Proof" }]}
        actions={
          <Badge variant={insurance.live ? "kernel" : "muted"}>
            {insurance.live ? "Live" : "Cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Certified SLA</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">
            {insurance.data.certified_sla_us.toFixed(2)} µs
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Hardware Root</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{insurance.data.hardware_root}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Discount Score</p>
          <p className="mt-2 font-display text-2xl font-bold text-kernel">
            {insurance.data.insurance_discount_score}
          </p>
        </Card>
      </div>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Auditor Export</p>
        <p className="mt-2 text-[13px] text-muted">
          Auditor export is available via POST /compliance/export, which returns
          a binary PDF evidence package.
        </p>
      </Card>
    </div>
  );
}
