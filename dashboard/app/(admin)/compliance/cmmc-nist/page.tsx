"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import type { CMMCStatus } from "@/lib/backend";

const FALLBACK: CMMCStatus = {
  findings: [
    { control_id: "IA.L2-3.5.1", title: "TPM 2.0 Auth", passed: true },
    { control_id: "SC.L2-3.13.2", title: "Boundary Protection", passed: true },
    { control_id: "AU.L2-3.3.1", title: "Audit Logging", passed: false },
  ],
};

export default function CmmcPage() {
  const { token } = useAuth();
  const cmmc = useBackend<CMMCStatus>(FALLBACK, (t) => backend.cmmc(t), token);
  const passed = cmmc.data.findings.filter((f) => f.passed).length;

  const columns = [
    {
      key: "control",
      header: "Control",
      render: (f: { control_id: string; title: string; passed: boolean }) => (
        <span className="font-mono text-[12px] font-medium text-ink">{f.control_id}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (f: { control_id: string; title: string; passed: boolean }) => (
        <span className="text-[12px] text-muted">{f.title}</span>
      ),
    },
    {
      key: "passed",
      header: "Status",
      render: (f: { control_id: string; title: string; passed: boolean }) => (
        <Badge variant={f.passed ? "kernel" : "threat"}>{f.passed ? "PASS" : "FAIL"}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMMC 2.0 / NIST"
        description="Defense contractor control audits backed by TPM 2.0 silicon quotes"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/cmmc-nist" }, { label: "CMMC 2.0" }]}
        actions={<Badge variant={cmmc.live ? "kernel" : "muted"}>{passed}/{cmmc.data.findings.length} passing</Badge>}
      />
      <Card>
        <Table columns={columns} data={cmmc.data.findings} keyExtractor={(f) => f.control_id} />
      </Card>
    </div>
  );
}
