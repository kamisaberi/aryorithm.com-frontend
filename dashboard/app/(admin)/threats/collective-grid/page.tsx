"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type GlobalFeedVerbose } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK: GlobalFeedVerbose[] = [
  { indicator_id: "IOC-GLOBAL-8901", ip: "198.51.100.45", subnet_mask: 32, threat_type: "THREAT_SCADA_ANOMALY", mitre_id: "T0855", confidence: 0.998, first_seen_timestamp: 1774998120, expires_at_timestamp: 1775084520, origin_anonymized_sector: "ENERGY_UTILITY", total_appliances_blocked: 1420 },
];

function ago(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function CollectiveGridPage() {
  const { token } = useAuth();
  const feed = useBackend<GlobalFeedVerbose[]>(FALLBACK, (t) => backend.globalFeedVerbose(t), token, 20000);
  const [purging, setPurging] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const purge = async (ip: string) => {
    if (!token || purging) return;
    setPurging(ip);
    setMessage(null);
    try {
      const res = await backend.purgeKernelRule({ ip }, token);
      setMessage(`Emergency purge: ${res.status} → ${res.ip}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Purge failed");
    } finally {
      setPurging(null);
    }
  };

  const columns = [
    { key: "ip", header: "Attacker IP", render: (i: GlobalFeedVerbose) => (
      <div>
        <p className="font-mono text-[12px] text-ink">{i.ip}<span className="text-muted">/{i.subnet_mask}</span></p>
        <p className="font-mono text-[10px] text-muted">{i.origin_anonymized_sector}</p>
      </div>
    )},
    { key: "discovered", header: "Discovered", render: (i: GlobalFeedVerbose) => (
      <span className="font-mono text-[11px] text-muted">{ago(i.first_seen_timestamp)}</span>
    )},
    { key: "attack", header: "Attack", render: (i: GlobalFeedVerbose) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{i.threat_type}</p>
        {i.mitre_id && <Badge variant="telemetry">{i.mitre_id}</Badge>}
      </div>
    )},
    { key: "status", header: "Fleet Status", render: (i: GlobalFeedVerbose) => (
      <div>
        <Badge variant="kernel">SYNCHRONIZED</Badge>
        <p className="mt-1 font-mono text-[10px] text-muted">{i.total_appliances_blocked} nodes · {(i.confidence * 100).toFixed(1)}%</p>
      </div>
    )},
    { key: "purge", header: "", render: (i: GlobalFeedVerbose) => (
      <button type="button" disabled={purging === i.ip} onClick={() => void purge(i.ip)} className="font-mono text-[10.5px] text-threat hover:underline disabled:opacity-50">
        {purging === i.ip ? "purging…" : "emergency purge"}
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collective Grid"
        description="Global immunity feed — attacked once, immune everywhere"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/collective-grid" }, { label: "Collective Grid" }]}
        actions={<Badge variant={feed.live ? "kernel" : "muted"}>fanout 38.4ms · &lt;50ms SLA</Badge>}
      />
      {message && <p className="font-mono text-[11px] text-muted">{message}</p>}
      <Card>
        <Table columns={columns} data={feed.data} keyExtractor={(i) => i.indicator_id} />
      </Card>
    </div>
  );
}
