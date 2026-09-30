"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type AuditLog } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_AUDIT } from "@/data/dummy";

export default function ActivityPage() {
  const { token } = useAuth();
  const { data: logs, live } = useBackend<AuditLog[]>(
    DUMMY_AUDIT,
    (tok: string) => backend.auditLogs(tok),
    token
  );

  const columns = [
    { key: "action", header: "Action", render: (log: AuditLog) => (
      <span className="font-mono text-[11px] text-cyan">{log.action}</span>
    )},
    { key: "operator", header: "Operator", render: (log: AuditLog) => (
      <span className="text-[13px] text-ink">{log.operator}</span>
    )},
    { key: "ts", header: "Timestamp", render: (log: AuditLog) => (
      <span className="font-mono text-[11px] text-muted">{log.ts}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="All system events and user actions"
        breadcrumbs={[{ label: "Management" }, { label: "Activity" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />

      <Card>
        <Table
          columns={columns}
          data={logs}
          keyExtractor={(log) => `${log.action}-${log.operator}-${log.ts}`}
        />
      </Card>
    </div>
  );
}
