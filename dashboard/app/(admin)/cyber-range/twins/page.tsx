"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ResilienceScore, type Twin } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_RESILIENCE, DUMMY_TWINS } from "@/data/dummy";

function twinBadgeVariant(status: string): "kernel" | "telemetry" | "muted" {
  const s = status.toUpperCase();
  if (s === "RUNNING") return "kernel";
  if (s === "IDLE") return "muted";
  return "telemetry";
}

export default function DigitalTwinsPage() {
  const { token } = useAuth();
  const {
    data: twins,
    live: twinsLive,
    refresh,
  } = useBackend<Twin[]>(DUMMY_TWINS, (t) => backend.twins(t), token);
  const { data: resilience, live: resilienceLive } =
    useBackend<ResilienceScore>(
      DUMMY_RESILIENCE,
      (t) => backend.resilience(t),
      token
    );
  const [acting, setActing] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (
    twinId: string,
    action: "start" | "stop"
  ): Promise<void> => {
    setActionMsg(null);
    setActionError(null);
    setActing(twinId);
    try {
      if (action === "start") {
        await backend.startTwin(twinId, token);
        setActionMsg(`Twin ${twinId} start requested.`);
      } else {
        await backend.stopTwin(twinId, token);
        setActionMsg(`Twin ${twinId} stop requested.`);
      }
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActing(null);
    }
  };

  const columns = [
    {
      key: "twin_id",
      header: "Twin ID",
      render: (t: Twin) => (
        <span className="font-mono text-[12px] font-medium text-ink">
          {t.twin_id}
        </span>
      ),
    },
    {
      key: "nodes",
      header: "Nodes",
      render: (t: Twin) => (
        <span className="tabular font-mono text-[12px] text-ink">
          {t.nodes}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t: Twin) => (
        <Badge variant={twinBadgeVariant(t.status)}>{t.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (t: Twin) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="admin-btn-primary"
            disabled={acting === t.twin_id}
            onClick={() => void handleAction(t.twin_id, "start")}
          >
            Start
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={acting === t.twin_id}
            onClick={() => void handleAction(t.twin_id, "stop")}
          >
            Stop
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Twins"
        description="Digital twin simulation and infrastructure modeling"
        breadcrumbs={[{ label: "Cyber Range", href: "/cyber-range/twins" }, { label: "Digital Twins" }]}
        actions={
          <Badge variant={twinsLive ? "kernel" : "muted"}>
            {twins.length} Twins{twinsLive ? "" : " (cached)"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            MTTFI{resilienceLive ? "" : " (cached)"}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {resilience.mttfi_ms} ms
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Rollback Guard{resilienceLive ? "" : " (cached)"}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">
            {resilience.rollback_guard_ms} ms
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Resilience Score{resilienceLive ? "" : " (cached)"}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">
            {resilience.score}
          </p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={twins} keyExtractor={(t) => t.twin_id} />
      </Card>
      {actionMsg && (
        <p className="font-mono text-[12px] text-kernel">{actionMsg}</p>
      )}
      {actionError && (
        <p className="font-mono text-[12px] text-threat">{actionError}</p>
      )}
    </div>
  );
}
