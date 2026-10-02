"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type KernelRule } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK_RULES: KernelRule[] = [
  { rule_id: "RULE-01", ip: "198.51.100.45", expires_at: null },
  { rule_id: "RULE-02", ip: "203.0.113.99", expires_at: null },
];

export default function KernelRulesPage() {
  const { token } = useAuth();
  const rules = useBackend<KernelRule[]>(
    FALLBACK_RULES,
    (t) => backend.kernelRules(t),
    token,
    20000
  );
  const [ip, setIp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const purge = async () => {
    if (!token || !ip.trim()) {
      setMessage("Enter an IP to purge.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await backend.purgeKernelRule({ ip: ip.trim() }, token);
      setMessage(`Purge: ${res.status} → ${res.ip}`);
      setIp("");
      rules.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Purge failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "rule",
      header: "Rule",
      render: (r: KernelRule) => (
        <span className="font-mono text-[12px] font-medium text-ink">{r.rule_id}</span>
      ),
    },
    {
      key: "ip",
      header: "Blocked IP",
      render: (r: KernelRule) => (
        <span className="font-mono text-[12px] text-threat">{r.ip}</span>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      render: (r: KernelRule) => (
        <span className="font-mono text-[11px] text-muted">{r.expires_at ?? "persistent"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kernel eBPF Rules"
        description="Active IP drop rules synchronized across edge NIC drivers"
        breadcrumbs={[{ label: "Edge Appliances", href: "/kernel-rules" }, { label: "Kernel Rules" }]}
        actions={<Badge variant={rules.live ? "kernel" : "muted"}>{rules.live ? "Live" : "Cached"}</Badge>}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Emergency purge (fleet-wide)
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="198.51.100.45"
            className="admin-input font-mono"
          />
          <button type="button" className="admin-btn-primary text-[12px] disabled:opacity-50" disabled={busy} onClick={() => void purge()}>
            {busy ? "Purging…" : "Purge IP"}
          </button>
        </div>
        {message && <p className="mt-2 font-mono text-[11px] text-muted">{message}</p>}
      </Card>
      <Card>
        <Table columns={columns} data={rules.data} keyExtractor={(r) => r.rule_id} />
      </Card>
    </div>
  );
}
