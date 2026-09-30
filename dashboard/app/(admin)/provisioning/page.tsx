"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type KernelRule } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_KERNEL_RULES } from "@/data/dummy";

interface ZtpResult {
  token: string;
  expires_at: string;
}

export default function ProvisioningPage() {
  const { token } = useAuth();
  const { data: rules, live, refresh } = useBackend<KernelRule[]>(
    DUMMY_KERNEL_RULES,
    (t) =>
      backend.kernelRules(t).then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Empty response");
        }
        return data;
      }),
    token
  );

  const [enclaveId, setEnclaveId] = useState("CRITICAL_OT");
  const [validDays, setValidDays] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [ztpResult, setZtpResult] = useState<ZtpResult | null>(null);
  const [ztpError, setZtpError] = useState<string | null>(null);

  const [purgingIp, setPurgingIp] = useState<string | null>(null);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setZtpResult(null);
    setZtpError(null);
    try {
      const res = await backend.generateZtpToken(
        { enclave_id: enclaveId, valid_days: validDays },
        token
      );
      setZtpResult({ token: res.token, expires_at: res.expires_at });
    } catch (e) {
      setZtpError(e instanceof Error ? e.message : "Token generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePurge(ip: string) {
    setPurgingIp(ip);
    setPurgeMessage(null);
    try {
      const res = await backend.purgeKernelRule({ ip }, token);
      setPurgeMessage(`Purged ${res.ip}: ${res.status}`);
      refresh();
    } catch (e) {
      setPurgeMessage(e instanceof Error ? `Purge failed for ${ip}: ${e.message}` : `Purge failed for ${ip}`);
    } finally {
      setPurgingIp(null);
    }
  }

  const columns = [
    { key: "rule_id", header: "Rule ID", render: (r: KernelRule) => (
      <span className="font-mono text-[12px] text-ink">{r.rule_id}</span>
    )},
    { key: "ip", header: "IP", render: (r: KernelRule) => (
      <span className="font-mono text-[12px] text-ink">{r.ip}</span>
    )},
    { key: "expires_at", header: "Expires", render: (r: KernelRule) => (
      <span className="font-mono text-[11px] text-muted">{r.expires_at ?? "never"}</span>
    )},
    { key: "actions", header: "Actions", render: (r: KernelRule) => (
      <button
        type="button"
        onClick={() => handlePurge(r.ip)}
        disabled={purgingIp === r.ip}
        className="admin-btn-secondary px-3 py-1 text-[11px]"
      >
        {purgingIp === r.ip ? "Purging..." : "Purge"}
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provision (ZTP)"
        description="Zero-touch provisioning and edge appliance deployment"
        breadcrumbs={[{ label: "Edge Appliances", href: "/fleet-nodes" }, { label: "Provision (ZTP)" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {rules.length} Rules{live ? "" : " (cached)"}
          </Badge>
        }
      />

      <Card className="space-y-4 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">ZTP Token Generator</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="ztp-enclave" className="font-mono text-[11px] text-muted">Enclave ID</label>
            <input
              id="ztp-enclave"
              type="text"
              value={enclaveId}
              onChange={(e) => setEnclaveId(e.target.value)}
              className="admin-input"
              placeholder="CRITICAL_OT"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ztp-days" className="font-mono text-[11px] text-muted">Valid Days</label>
            <input
              id="ztp-days"
              type="number"
              min={1}
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
              className="admin-input"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="admin-btn-primary"
        >
          {generating ? "Generating..." : "Generate Token"}
        </button>
        {ztpResult && (
          <div className="space-y-2">
            <p className="break-all rounded border border-hairline bg-panel p-3 font-mono text-[12px] text-ink">
              {ztpResult.token}
            </p>
            <p className="font-mono text-[11px] text-muted">Expires: {ztpResult.expires_at}</p>
          </div>
        )}
        {ztpError && (
          <p className="font-mono text-[12px] text-threat">{ztpError}</p>
        )}
      </Card>

      <Card>
        <div className="border-b border-hairline p-5 pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Kernel Rules</p>
          {purgeMessage && (
            <p className="mt-2 font-mono text-[12px] text-cyan">{purgeMessage}</p>
          )}
        </div>
        <Table columns={columns} data={rules} keyExtractor={(r) => r.rule_id} />
      </Card>
    </div>
  );
}
