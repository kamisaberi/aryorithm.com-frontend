"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend } from "@/lib/backend";
import type { CollectiveBusEntry, ThreatEvent } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_BUS, DUMMY_THREAT_EVENTS } from "@/data/dummy";
import { useAuth } from "@/lib/auth";

export default function ThreatBusPage() {
  const { token } = useAuth();
  const events = useBackend(DUMMY_THREAT_EVENTS, (t) => backend.threatEvents(t), token, 5000);
  const bus = useBackend(DUMMY_BUS, (t) => backend.collectiveBus(t), token, 5000);
  const feed = useBackend(
    { indicators: [], count: 0, updated_at: "" },
    (t) => backend.globalFeed(t),
    token,
    20000
  );
  const live = events.live && bus.live;

  const [ip, setIp] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleBroadcast() {
    const target = ip.trim();
    if (!target || sending) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await backend.broadcastThreat({ ip: target, attributions: [] }, token);
      setResult(`${res.status} → ${res.target_ip}`);
      setIp("");
      events.refresh();
      bus.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Broadcast failed");
    } finally {
      setSending(false);
    }
  }

  const eventColumns = [
    {
      key: "threat_id",
      header: "Threat ID",
      render: (e: ThreatEvent) => (
        <span className="font-mono text-[11px] text-ink">{e.threat_id}</span>
      ),
    },
    {
      key: "attacker_ip",
      header: "Attacker IP",
      render: (e: ThreatEvent) => (
        <span className="font-mono text-[11px] text-ink">{e.attacker_ip}</span>
      ),
    },
    {
      key: "mitre",
      header: "MITRE",
      render: (e: ThreatEvent) =>
        e.mitre_id ? (
          <Badge variant="telemetry">{e.mitre_id}</Badge>
        ) : (
          <span className="font-mono text-[11px] text-muted">—</span>
        ),
    },
    {
      key: "dropped",
      header: "Dropped",
      render: (e: ThreatEvent) => (
        <Badge variant={e.dropped ? "kernel" : "threat"}>
          {e.dropped ? "kernel" : "threat"}
        </Badge>
      ),
    },
  ];

  const busColumns = [
    {
      key: "rule_id",
      header: "Rule ID",
      render: (b: CollectiveBusEntry) => (
        <span className="font-mono text-[11px] text-ink">{b.rule_id}</span>
      ),
    },
    {
      key: "origin_node",
      header: "Origin Node",
      render: (b: CollectiveBusEntry) => (
        <span className="font-mono text-[11px] text-ink">{b.origin_node}</span>
      ),
    },
    {
      key: "fanout_latency_ms",
      header: "Fanout Latency",
      render: (b: CollectiveBusEntry) => (
        <span className="tabular font-mono text-[12px] text-ink">
          {b.fanout_latency_ms.toFixed(1)} ms
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Bus"
        description="Collective threat intelligence sharing and real-time IOC distribution"
        breadcrumbs={[{ label: "Collective Grid", href: "/threat-bus" }, { label: "Threat Bus" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "live" : "cached"}
          </Badge>
        }
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Broadcast Threat
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Attacker IP e.g. 198.51.100.45"
            spellCheck={false}
            className="admin-input w-full font-mono text-[12px] sm:max-w-xs"
          />
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={sending || !ip.trim()}
            className="admin-btn"
          >
            {sending ? "Broadcasting…" : "Broadcast"}
          </button>
        </div>
        {result && <p className="mt-3 font-mono text-[11px] text-kernel">{result}</p>}
        {error && <p className="mt-3 font-mono text-[11px] text-threat">{error}</p>}
      </Card>
      <Card>
        <Table columns={eventColumns} data={events.data} keyExtractor={(e) => e.threat_id} />
      </Card>
      <Card>
        <Table columns={busColumns} data={bus.data} keyExtractor={(b) => b.rule_id} />
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Global Feed — auto-refresh every 20s
          </p>
          <Badge variant={feed.live ? "kernel" : "muted"}>
            {feed.live ? `live · ${feed.data.count} IOCs` : "cached"}
          </Badge>
        </div>
        {feed.data.indicators.length === 0 ? (
          <p className="mt-3 font-mono text-[11px] text-muted">Waiting for GET /threats/global-feed…</p>
        ) : (
          <div className="mt-3 space-y-2">
            {feed.data.indicators.map((i) => (
              <div key={i.indicator} className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-ink">{i.indicator}</span>
                <span className="text-muted">{i.mitre_id ?? i.severity}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
