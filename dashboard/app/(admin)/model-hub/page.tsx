"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type AIModel } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_MODELS, DUMMY_OTA } from "@/data/dummy";

function formatSize(sizeBytes: number): string {
  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}

function truncateSha(sha: string): string {
  return sha.length > 16 ? `${sha.slice(0, 10)}…${sha.slice(-4)}` : sha;
}

export default function ModelHubPage() {
  const { token } = useAuth();
  const models = useBackend<AIModel[]>(
    DUMMY_MODELS,
    (t) => backend.models(t),
    token
  );
  const ota = useBackend(DUMMY_OTA, (t) => backend.otaStatus(t), token);
  const [busy, setBusy] = useState<"advance" | "rollback" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const live = models.live || ota.live;

  const runOta = async (action: "advance" | "rollback") => {
    if (!token) {
      setMessage("Sign in to manage OTA rollout.");
      return;
    }
    setBusy(action);
    setMessage(null);
    try {
      if (action === "advance") {
        const res = await backend.otaAdvance(token);
        setMessage(`Advance: ${res.status} → ${res.new_stage ?? "—"}`);
      } else {
        const res = await backend.otaRollback(token);
        setMessage(`Rollback: ${res.status} → ${res.active ?? "—"}`);
      }
      ota.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "OTA request failed");
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: "version",
      header: "Version",
      render: (m: AIModel) => (
        <span className="font-mono text-[12px] font-medium text-ink">{m.filename ?? m.version ?? "—"}</span>
      ),
    },
    {
      key: "sha256",
      header: "SHA-256",
      render: (m: AIModel) => (
        <span className="font-mono text-[11px] text-muted" title={m.sha256}>
          {truncateSha(m.sha256)}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      render: (m: AIModel) => (
        <span className="tabular font-mono text-[12px] text-ink">
          {formatSize(m.size_bytes)}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (m: AIModel) => (
        <Badge variant={m.stage === "FLEET_WIDE" ? "kernel" : "muted"}>
          {m.stage}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Hub (OTA)"
        description="AI model registry, OTA updates, and version management"
        breadcrumbs={[{ label: "AI & Silicon", href: "/model-hub" }, { label: "Model Hub (OTA)" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          OTA Status
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="text-[13px] text-muted">
            Stable{" "}
            <span className="font-mono text-[12px] text-ink">
              {ota.data.stable_version}
            </span>
          </p>
          <p className="text-[13px] text-muted">
            Candidate{" "}
            <span className="font-mono text-[12px] text-ink">
              {ota.data.candidate_version ?? "—"}
            </span>
          </p>
          <Badge variant="telemetry">{ota.data.stage}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => runOta("advance")}
            className="admin-btn-primary text-[12px] disabled:opacity-50"
          >
            {busy === "advance" ? "Advancing…" : "Advance"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => runOta("rollback")}
            className="admin-btn-secondary text-[12px] disabled:opacity-50"
          >
            {busy === "rollback" ? "Rolling back…" : "Rollback"}
          </button>
          {message && (
            <span className="font-mono text-[11px] text-muted">{message}</span>
          )}
        </div>
      </Card>
      <Card>
        <Table columns={columns} data={models.data} keyExtractor={(m) => m.filename ?? m.version ?? m.sha256} />
      </Card>
    </div>
  );
}
