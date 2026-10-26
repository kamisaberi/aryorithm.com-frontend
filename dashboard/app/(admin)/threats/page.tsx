"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";
import {
  backend,
  type CollectiveBusEntry,
  type ThreatEvent,
  type ThreatGrid,
  type VaccineFeedItem,
  type XAIIncident,
} from "@/lib/backend";
import {
  DUMMY_BUS,
  DUMMY_THREAT_EVENTS,
} from "@/data/dummy";

const FALLBACK_GRID: ThreatGrid = {
  grid_id: "GRD-COLLECTIVE-01",
  peers: [],
  peers_online: 0,
  bus_rules_active: 0,
  p50_fanout_ms: 2.4,
  p99_fanout_ms: 4.7,
  sla_target_ms: 50,
  throughput_msgs_s: 0,
  active_indicators: 0,
  last_sync_timestamp: 0,
};

const FALLBACK_XAI: XAIIncident[] = [
  {
    attacker_ip: "185.220.101.42",
    mitre_id: "T0855",
    attributions: [
      {
        rank: 1,
        feature: "modbus_function_code_90_ratio",
        contribution_pct: 47.2,
        observed: "0.842",
        baseline: "0.003",
        audit_note: "Unauthorized function code burst",
      },
      {
        rank: 2,
        feature: "tcp_syn_retransmit_p99",
        contribution_pct: 29.1,
        observed: "412ms",
        baseline: "18ms",
        audit_note: "Scan-induced retransmit pressure",
      },
      {
        rank: 3,
        feature: "coil_write_entropy",
        contribution_pct: 16.4,
        observed: "6.91 bits",
        baseline: "2.10 bits",
        audit_note: "High-entropy coil write pattern",
      },
    ],
  },
];

const FALLBACK_VACCINES: VaccineFeedItem[] = [
  {
    vaccine_id: "VAC-2026-0042",
    slug: "modbus-function-90-block",
    name: "Modbus function-90 unauthorized command",
    version: "1.2.0",
    severity: "CRITICAL",
    mitre_id: "T0855",
    target_protocol: "MODBUS_TCP",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    size_bytes: 1482000,
    signature_verified: true,
    origin_node: "NODE-WATER-04",
    source_site: "Substation-Alpha-North",
    status: "SHARED",
    download_url: "/api/v1/threats/vaccines/VAC-2026-0042/download",
    created_at: new Date().toISOString(),
  },
];

function formatTime(value: string | number | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour12: false });
}

function severityVariant(severity: string): "kernel" | "telemetry" | "threat" | "muted" {
  const value = severity.toUpperCase();
  if (value === "CRITICAL" || value === "HIGH") return "threat";
  if (value === "MEDIUM") return "telemetry";
  if (value === "LOW") return "kernel";
  return "muted";
}

function Vaccines({ items, live }: { items: VaccineFeedItem[]; live: boolean }) {
  const { token } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download(item: VaccineFeedItem) {
    if (!token) {
      setDownloadError("Sign in to download a sealed vaccine artifact.");
      return;
    }
    setDownloading(item.vaccine_id);
    setDownloadError(null);
    try {
      const blob = await backend.downloadVaccine(item.download_url, token);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${item.slug}.spkg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1500);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Vaccine download failed.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[14px] font-semibold text-ink">Honeynet & vaccine factory</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">
            signed countermeasures distilled from live malware captures
          </p>
        </div>
        <Badge variant={live ? "kernel" : "muted"}>{live ? "feed live" : "cached"}</Badge>
      </div>
      {downloadError && (
        <p className="mt-3 rounded border border-threat/30 bg-threat/5 px-3 py-2 font-mono text-[10px] text-threat">
          {downloadError}
        </p>
      )}
      <div className="mt-4 space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.vaccine_id} className="rounded border border-hairline bg-void/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                  <Badge variant={item.signature_verified ? "kernel" : "threat"}>
                    {item.signature_verified ? "signed" : "unsigned"}
                  </Badge>
                  <span className="font-mono text-[9.5px] text-muted">v{item.version}</span>
                </div>
                <p className="mt-2 truncate text-[12px] font-medium text-ink">{item.name}</p>
                <p className="mt-1 font-mono text-[9.5px] text-muted">
                  {item.target_protocol || "any protocol"} · {item.origin_node} · {formatTime(item.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void download(item)}
                disabled={downloading === item.vaccine_id}
                className="shrink-0 rounded border border-cyan/40 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10 disabled:opacity-50"
              >
                {downloading === item.vaccine_id ? "…" : "↓ vaccine"}
              </button>
            </div>
            <p className="mt-2 truncate font-mono text-[9px] text-muted">sha256 {item.sha256}</p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded border border-dashed border-hairline px-3 py-6 text-center font-mono text-[10.5px] text-muted">
            No vaccines shared from this fleet yet. Honeynet captures will appear here after the
            next collective exchange.
          </p>
        )}
      </div>
    </Card>
  );
}

export default function ThreatCommandPage() {
  const { token } = useAuth();
  const events = useBackend<ThreatEvent[]>(DUMMY_THREAT_EVENTS, (t) => backend.threatEvents(t), token, 5000);
  const bus = useBackend<CollectiveBusEntry[]>(DUMMY_BUS, (t) => backend.collectiveBus(t), token, 10000);
  const grid = useBackend<ThreatGrid>(FALLBACK_GRID, (t) => backend.threatGrid(t), token, 15000);
  const xai = useBackend<XAIIncident[]>(FALLBACK_XAI, (t) => backend.threatXai(t), token, 15000);
  const vaccines = useBackend<VaccineFeedItem[]>(FALLBACK_VACCINES, (t) => backend.vaccineFeed(t), token, 20000);

  const [broadcastIp, setBroadcastIp] = useState("");
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [selectedXai, setSelectedXai] = useState<XAIIncident | null>(null);

  const activeDrops = events.data.filter((event) => event.dropped).length;
  const honeynetTraps = events.data.filter((event) => !event.dropped).length;
  const topMitre = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events.data) {
      if (event.mitre_id) map.set(event.mitre_id, (map.get(event.mitre_id) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [events.data]);

  async function broadcast() {
    if (!token) {
      setBroadcastError("Sign in to dispatch a collective threat broadcast.");
      return;
    }
    const ip = broadcastIp.trim();
    if (!ip) {
      setBroadcastError("Enter the attacker or indicator IP.");
      return;
    }
    const ok = window.confirm(
      `Broadcast ${ip} to every peer in the collective defense grid?\n\nThis injects a kernel rule immediately and is audited across the fleet.`
    );
    if (!ok) return;
    setBroadcastBusy(true);
    setBroadcastResult(null);
    setBroadcastError(null);
    try {
      const result = await backend.broadcastThreat({ ip, attributions: [] }, token);
      setBroadcastResult(`Broadcast dispatched · ${result.target_ip} · ${result.status}`);
      setBroadcastIp("");
      grid.refresh();
      bus.refresh();
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : "Broadcast failed.");
    } finally {
      setBroadcastBusy(false);
    }
  }

  const eventColumns = [
    {
      key: "time",
      header: "Detected",
      render: (event: ThreatEvent) => (
        <span className="font-mono text-[10px] text-muted">{formatTime(event.detected_at)}</span>
      ),
    },
    {
      key: "source",
      header: "Attacker / indicator",
      render: (event: ThreatEvent) => (
        <span className="font-mono text-[11px] text-ink">{event.attacker_ip}</span>
      ),
    },
    {
      key: "mitre",
      header: "MITRE ATT&CK",
      render: (event: ThreatEvent) =>
        event.mitre_id ? <Badge variant="telemetry">{event.mitre_id}</Badge> : <span className="text-muted">—</span>,
    },
    {
      key: "tactic",
      header: "Tactic",
      render: (event: ThreatEvent) => (
        <span className="font-mono text-[10px] text-muted">{event.tactic || "unclassified"}</span>
      ),
    },
    {
      key: "action",
      header: "Enforcement",
      render: (event: ThreatEvent) => (
        <div>
          <Badge variant={event.dropped ? "kernel" : "telemetry"}>
            {event.dropped ? "XDP_DROP" : "HONEYNET"}
          </Badge>
          <p className="mt-1 font-mono text-[9px] text-muted">
            {event.dropped ? "wire-speed mitigation" : "capture & fingerprint"}
          </p>
        </div>
      ),
    },
    {
      key: "xai",
      header: "Attribution",
      render: (event: ThreatEvent) => {
        const incident = xai.data.find((item) => item.attacker_ip === event.attacker_ip);
        return incident ? (
          <button
            type="button"
            onClick={() => setSelectedXai(incident)}
            className="font-mono text-[10px] text-cyan hover:underline"
          >
            inspect xai
          </button>
        ) : (
          <span className="font-mono text-[10px] text-muted">pending</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Command"
        description="Live collective defense, emergency broadcasts, honeynet vaccines and explainable attribution"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats" }, { label: "Command" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={events.live ? "kernel" : "muted"}>{events.live ? "live · 5s" : "cached"}</Badge>
            <Link href="/threats/grid" className="admin-btn-secondary text-[10px]">
              Collective grid
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Events in window</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{events.data.length}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{activeDrops} dropped · {honeynetTraps} trapped</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Grid peers</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">
            {grid.data.peers_online}/{grid.data.peers.length || grid.data.peers_online || "—"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">p99 fanout {grid.data.p99_fanout_ms.toFixed(1)} ms</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Active indicators</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{grid.data.active_indicators}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{grid.data.bus_rules_active} kernel rules synced</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">XAI evidence sets</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{xai.data.length}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">feature attribution available</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">Emergency collective broadcast</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                Inject an attacker IP or indicator into every peer&apos;s eBPF map. The command is
                signed, audited and acknowledged by the grid.
              </p>
            </div>
            <Badge variant="threat">supervisor action</Badge>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={broadcastIp}
              onChange={(event) => setBroadcastIp(event.target.value)}
              placeholder="185.220.101.42"
              className="admin-input flex-1 font-mono text-[12px]"
              aria-label="Attacker IP to broadcast"
            />
            <button
              type="button"
              onClick={() => void broadcast()}
              disabled={broadcastBusy || !token}
              className="rounded-md bg-threat px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110 disabled:opacity-50"
            >
              {broadcastBusy ? "Dispatching…" : "Broadcast to grid"}
            </button>
          </div>
          {broadcastResult && (
            <p className="mt-3 rounded border border-kernel/30 bg-kernel/5 px-3 py-2 font-mono text-[10.5px] text-kernel">
              {broadcastResult}
            </p>
          )}
          {broadcastError && (
            <p className="mt-3 rounded border border-threat/30 bg-threat/5 px-3 py-2 font-mono text-[10.5px] text-threat">
              {broadcastError}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-hairline bg-void/40 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Top ATT&CK techniques</p>
              <div className="mt-2 space-y-1.5">
                {topMitre.length === 0 ? (
                  <p className="font-mono text-[10px] text-muted">No classified hits.</p>
                ) : (
                  topMitre.map(([technique, count]) => (
                    <div key={technique} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-ink">{technique}</span>
                      <span className="font-mono text-[10px] text-telemetry">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded border border-hairline bg-void/40 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Bus fanout</p>
              <div className="mt-2 space-y-1.5 font-mono text-[10px]">
                <p className="flex justify-between gap-2"><span className="text-muted">P50</span><span className="text-kernel">{grid.data.p50_fanout_ms.toFixed(1)} ms</span></p>
                <p className="flex justify-between gap-2"><span className="text-muted">P99</span><span className="text-telemetry">{grid.data.p99_fanout_ms.toFixed(1)} ms</span></p>
                <p className="flex justify-between gap-2"><span className="text-muted">SLA target</span><span className="text-ink">{grid.data.sla_target_ms.toFixed(0)} ms</span></p>
                <p className="flex justify-between gap-2"><span className="text-muted">Throughput</span><span className="text-ink">{Math.round(grid.data.throughput_msgs_s).toLocaleString()} msg/s</span></p>
              </div>
            </div>
          </div>
        </Card>

        <Vaccines items={vaccines.data} live={vaccines.live} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
          <div>
            <p className="font-display text-[13px] font-semibold text-ink">Live threat event stream</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              {events.live ? "Authenticated event stream · polling every 5s" : "Last cached event window"}
            </p>
          </div>
          <Badge variant={events.live ? "kernel" : "muted"}>{events.live ? "streaming" : "cached"}</Badge>
        </div>
        <Table columns={eventColumns} data={events.data} keyExtractor={(event) => event.threat_id} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">Collective bus activity</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">rules crossing the mesh</p>
            </div>
            <Badge variant="cyan">{bus.data.length} entries</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {bus.data.slice(0, 6).map((entry) => (
              <div key={`${entry.rule_id}-${entry.origin_node}`} className="flex items-center justify-between gap-2 rounded border border-hairline bg-void/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10.5px] text-ink">{entry.rule_id}</p>
                  <p className="font-mono text-[9px] text-muted">origin {entry.origin_node}</p>
                </div>
                <span className="font-mono text-[10px] text-kernel">{entry.fanout_latency_ms.toFixed(1)} ms</span>
              </div>
            ))}
            {bus.data.length === 0 && (
              <p className="font-mono text-[10.5px] text-muted">No bus traffic in the current window.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">Explainable attribution</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">evidence sets ready for operator review</p>
            </div>
            <Badge variant="telemetry">{xai.data.length} incidents</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {xai.data.slice(0, 5).map((incident) => (
              <button
                key={incident.attacker_ip}
                type="button"
                onClick={() => setSelectedXai(incident)}
                className="w-full rounded border border-hairline bg-void/40 px-3 py-2 text-left transition-colors hover:border-cyan/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-ink">{incident.attacker_ip}</span>
                  <Badge variant="telemetry">{incident.mitre_id || "unclassified"}</Badge>
                </div>
                <p className="mt-1 font-mono text-[9.5px] text-muted">
                  {incident.attributions.length} feature attributions · click to inspect
                </p>
              </button>
            ))}
            {xai.data.length === 0 && (
              <p className="font-mono text-[10.5px] text-muted">No attribution evidence sets available.</p>
            )}
          </div>
        </Card>
      </div>

      {selectedXai && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-md border border-hairline bg-panel p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                  XAI attribution evidence
                </p>
                <h2 className="mt-1 font-display text-[20px] font-bold text-ink">{selectedXai.attacker_ip}</h2>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {selectedXai.mitre_id || "unclassified"} · signed feature vector
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedXai(null)}
                className="font-mono text-[12px] text-muted hover:text-ink"
                aria-label="Close XAI evidence"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {selectedXai.attributions.map((vector) => (
                <div key={`${vector.rank}-${vector.feature}`} className="rounded border border-hairline bg-void/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan/10 font-mono text-[9px] text-cyan">
                        {vector.rank}
                      </span>
                      <span className="font-mono text-[11px] text-ink">{vector.feature}</span>
                    </div>
                    <span className="font-mono text-[11px] text-telemetry">{vector.contribution_pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full rounded-full bg-telemetry"
                      style={{ width: `${Math.min(100, Math.max(2, vector.contribution_pct))}%` }}
                    />
                  </div>
                  <div className="mt-2 grid gap-1 font-mono text-[9.5px] text-muted sm:grid-cols-2">
                    <span>observed {vector.observed}</span>
                    <span>baseline {vector.baseline}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{vector.audit_note}</p>
                </div>
              ))}
              {selectedXai.attributions.length === 0 && (
                <p className="font-mono text-[11px] text-muted">No feature attribution vectors recorded.</p>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setSelectedXai(null)} className="admin-btn-secondary text-[10px]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
