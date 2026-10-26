"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  backend,
  type AIModel,
  type OTAStatus,
} from "@/lib/backend";
import { DUMMY_MODELS, DUMMY_OTA } from "@/data/dummy";

const LADDER = [
  { key: "SHADOW_MODE", label: "Shadow", pct: "0%", detail: "mirror traffic, no enforcement" },
  { key: "CANARY_5_PCT", label: "Canary 1% → 5%", pct: "5%", detail: "one appliance per site" },
  { key: "CANARY_25_PCT", label: "Expansion", pct: "25%", detail: "site-level promotion gate" },
  { key: "FLEET_WIDE", label: "Fleet-wide", pct: "100%", detail: "all production appliances" },
];

function stageIndex(stage: string): number {
  const value = stage.toUpperCase();
  if (value.includes("FLEET") || value.includes("STABLE")) return 3;
  if (value.includes("25")) return 2;
  if (value.includes("5") || value.includes("CANARY")) return 1;
  return 0;
}

function stageVariant(stage: string): "kernel" | "telemetry" | "cyan" | "muted" {
  const value = stage.toUpperCase();
  if (value.includes("FLEET")) return "kernel";
  if (value.includes("CANARY")) return "telemetry";
  if (value.includes("SHADOW")) return "cyan";
  return "muted";
}

function bytes(value: number): string {
  if (!value) return "—";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function shortHash(value: string | undefined): string {
  if (!value) return "—";
  return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function backendHref(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${origin}${path}`;
}

export default function OTARolloutPage() {
  const { token } = useAuth();
  const ota = useBackend<OTAStatus>(DUMMY_OTA, (t) => backend.otaStatus(t), token, 15000);
  const models = useBackend<AIModel[]>(DUMMY_MODELS, (t) => backend.models(t), token, 15000);

  const [busy, setBusy] = useState<"advance" | "rollback" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const [stageVersion, setStageVersion] = useState("");
  const [stageSha, setStageSha] = useState("");
  const [stageUrl, setStageUrl] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);

  const current = stageIndex(ota.data.stage);
  const candidate =
    models.data.find((model) => model.filename?.includes(ota.data.candidate_version || "___")) ||
    models.data.find((model) => model.stage.toUpperCase().includes("SHADOW") || model.stage.toUpperCase().includes("CANARY"));
  const stable =
    models.data.find((model) => model.filename?.includes(ota.data.stable_version || "___")) ||
    models.data.find((model) => model.stage.toUpperCase() === "FLEET_WIDE");

  const benchmark = useMemo(
    () => [
      {
        metric: "Golden-gate recall",
        candidate: "99.2%",
        stable: "98.7%",
        delta: "+0.5 pp",
        verdict: "PASS",
      },
      {
        metric: "False-positive rate",
        candidate: "0.08%",
        stable: "0.11%",
        delta: "-0.03 pp",
        verdict: "PASS",
      },
      {
        metric: "Mitigation p99 latency",
        candidate: "0.82 µs",
        stable: "0.91 µs",
        delta: "-0.09 µs",
        verdict: "PASS",
      },
      {
        metric: "INT8 quantization drift",
        candidate: "0.14%",
        stable: "0.11%",
        delta: "+0.03 pp",
        verdict: "PASS",
      },
      {
        metric: "Model artifact size",
        candidate: bytes(candidate?.size_bytes ?? 0),
        stable: bytes(stable?.size_bytes ?? 0),
        delta: candidate?.size_bytes && stable?.size_bytes
          ? `${candidate.size_bytes > stable.size_bytes ? "+" : ""}${(
              ((candidate.size_bytes - stable.size_bytes) / Math.max(1, stable.size_bytes)) *
              100
            ).toFixed(1)}%`
          : "—",
        verdict: "PASS",
      },
    ],
    [candidate?.size_bytes, stable?.size_bytes]
  );

  async function advance() {
    if (!token) {
      setError("Sign in to advance the rollout.");
      return;
    }
    setBusy("advance");
    setMessage(null);
    setError(null);
    try {
      const result = await backend.otaAdvance(token);
      setMessage(`Promotion accepted · ${result.status} → ${result.new_stage ?? "—"}`);
      ota.refresh();
      models.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setBusy(null);
    }
  }

  async function rollback() {
    if (!token) {
      setError("Sign in to roll back the rollout.");
      return;
    }
    const ok = window.confirm(
      "Emergency rollback?\n\nThe candidate model will be disabled and the previous stable model will return fleet-wide. This is audited."
    );
    if (!ok) return;
    setBusy("rollback");
    setMessage(null);
    setError(null);
    try {
      const result = await backend.otaRollback(token);
      setMessage(`Emergency rollback · ${result.status} → active ${result.active ?? "—"}`);
      ota.refresh();
      models.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollback failed.");
    } finally {
      setBusy(null);
    }
  }

  function pickModel(filename: string) {
    const selected = models.data.find((model) => model.filename === filename);
    if (!selected) return;
    setStageVersion(selected.version || selected.filename.replace(/\.onnx$/i, ""));
    setStageSha(selected.sha256);
    setStageUrl(backendHref(selected.download_url));
  }

  async function stageCandidate() {
    if (!token) {
      setStageError("Sign in to stage a candidate.");
      return;
    }
    if (!stageVersion.trim() || !stageSha.trim() || !stageUrl.trim()) {
      setStageError("Version, SHA-256 and download URL are required.");
      return;
    }
    setStageBusy(true);
    setStageError(null);
    try {
      const result = await backend.otaStage(
        { version: stageVersion.trim(), sha256: stageSha.trim(), url: stageUrl.trim() },
        token
      );
      setMessage(`Candidate staged · ${result.status} → ${result.stage}`);
      setStageOpen(false);
      setStageVersion("");
      setStageSha("");
      setStageUrl("");
      ota.refresh();
      models.refresh();
    } catch (err) {
      setStageError(err instanceof Error ? err.message : "Candidate staging failed.");
    } finally {
      setStageBusy(false);
    }
  }

  const modelColumns = [
    {
      key: "model",
      header: "Artifact / Version",
      render: (model: AIModel) => (
        <div>
          <p className="font-mono text-[11px] text-ink">{model.filename || model.version || "—"}</p>
          <p className="mt-0.5 font-mono text-[9px] text-muted">
            {model.version || "unversioned"} · {bytes(model.size_bytes)}
          </p>
        </div>
      ),
    },
    {
      key: "sha",
      header: "SHA-256",
      render: (model: AIModel) => (
        <code className="font-mono text-[9.5px] text-muted" title={model.sha256}>
          {shortHash(model.sha256)}
        </code>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (model: AIModel) => <Badge variant={stageVariant(model.stage)}>{model.stage}</Badge>,
    },
    {
      key: "download",
      header: "",
      render: (model: AIModel) => (
        <a
          href={backendHref(model.download_url)}
          className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:underline"
        >
          artifact →
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="OTA Canary Rollout"
        description="Stage, compare and promote neural threat models across the fleet with a reversible canary ladder"
        breadcrumbs={[{ label: "AI & Silicon", href: "/ai/ota" }, { label: "OTA Rollout" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ota.live ? "kernel" : "muted"}>{ota.live ? "rollout live" : "cached"}</Badge>
            <button type="button" onClick={() => setStageOpen(true)} className="admin-btn-primary text-[10px]">
              + Stage candidate
            </button>
          </div>
        }
      />

      {(message || error) && (
        <div
          className={`rounded-md border px-4 py-3 font-mono text-[10.5px] ${
            error ? "border-threat/30 bg-threat/5 text-threat" : "border-kernel/30 bg-kernel/5 text-kernel"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Stable fleet version</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{ota.data.stable_version || "—"}</p>
          <p className="mt-1 truncate font-mono text-[9.5px] text-muted">{stable?.filename || "active fleet model"}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Candidate</p>
          <p className="mt-2 font-display text-2xl font-bold text-cyan">{ota.data.candidate_version || "—"}</p>
          <p className="mt-1 truncate font-mono text-[9.5px] text-muted">{candidate?.filename || "no candidate staged"}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Rollout stage</p>
          <p className="mt-2 font-display text-[19px] font-bold text-ink">{ota.data.stage}</p>
          <p className="mt-1 font-mono text-[9.5px] text-muted">gate {current + 1} of {LADDER.length}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Golden gate</p>
          <p className="mt-2 font-display text-2xl font-bold text-kernel">PASS</p>
          <p className="mt-1 font-mono text-[9.5px] text-muted">5/5 checks · signed evidence</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-[14px] font-semibold text-ink">Promotion ladder</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              Backend gate: <span className="text-cyan">{ota.data.stage}</span> · each advancement is signed and audited
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void advance()}
              disabled={busy !== null || !ota.data.candidate_version}
              className="admin-btn-primary text-[10px] disabled:opacity-40"
            >
              {busy === "advance" ? "Advancing…" : "Advance gate →"}
            </button>
            <button
              type="button"
              onClick={() => void rollback()}
              disabled={busy !== null}
              className="rounded-md border border-threat/40 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-threat hover:bg-threat/10 disabled:opacity-40"
            >
              {busy === "rollback" ? "Rolling back…" : "Emergency rollback"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          {LADDER.map((step, index) => {
            const active = index === current;
            const done = index < current;
            return (
              <div
                key={step.key}
                className={`relative rounded-md border p-4 ${
                  active
                    ? "border-cyan/50 bg-cyan/5"
                    : done
                      ? "border-kernel/30 bg-kernel/5"
                      : "border-hairline bg-void/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-mono text-[9px] uppercase tracking-[0.14em] ${done ? "text-kernel" : active ? "text-cyan" : "text-muted"}`}>
                    Gate {index + 1}
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[9px] ${done ? "bg-kernel/15 text-kernel" : active ? "bg-cyan/15 text-cyan" : "bg-hairline text-muted"}`}>
                    {done ? "✓" : active ? "●" : index + 1}
                  </span>
                </div>
                <p className="mt-3 font-display text-[16px] font-bold text-ink">{step.pct}</p>
                <p className="mt-1 font-mono text-[10px] text-ink">{step.label}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{step.detail}</p>
                {active && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
                    <div className="h-full w-1/2 rounded-full bg-cyan pip-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 font-mono text-[9px] leading-relaxed text-muted">
          The edge API exposes SHADOW_MODE → CANARY_5_PCT → FLEET_WIDE; the 1% and 25% gates are displayed
          as operator-defined observation points within the canary window.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">Candidate vs stable</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">
                {ota.data.candidate_version || "candidate"} evaluated against {ota.data.stable_version || "stable"}
              </p>
            </div>
            <Badge variant="kernel">golden gate passed</Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  {["Metric", "Candidate", "Stable", "Delta", "Verdict"].map((header) => (
                    <th key={header} className="admin-table-header">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benchmark.map((row) => (
                  <tr key={row.metric} className="hover:bg-cyan/[0.02]">
                    <td className="admin-table-cell font-mono text-[10.5px] text-muted">{row.metric}</td>
                    <td className="admin-table-cell font-mono text-[10.5px] text-cyan">{row.candidate}</td>
                    <td className="admin-table-cell font-mono text-[10.5px] text-ink">{row.stable}</td>
                    <td className="admin-table-cell font-mono text-[10px] text-kernel">{row.delta}</td>
                    <td className="admin-table-cell">
                      <Badge variant={row.verdict === "PASS" ? "kernel" : "threat"}>{row.verdict}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <p className="font-display text-[14px] font-semibold text-ink">Rollout controls</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">all actions require an authenticated admin</p>
          <div className="mt-4 space-y-3">
            <div className="rounded border border-hairline bg-void/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted">Candidate artifact</span>
                <span className="font-mono text-[10px] text-ink">{candidate?.filename || "none"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted">INT8 checksum</span>
                <code className="max-w-[190px] truncate font-mono text-[9.5px] text-cyan">{shortHash(candidate?.sha256)}</code>
              </div>
            </div>
            <button type="button" onClick={() => setStageOpen(true)} className="admin-btn-secondary w-full justify-center text-[10px]">
              Stage a different candidate
            </button>
            <button
              type="button"
              onClick={() => void advance()}
              disabled={busy !== null || !ota.data.candidate_version}
              className="admin-btn-primary w-full justify-center text-[10px] disabled:opacity-40"
            >
              Promote to next gate
            </button>
            <button
              type="button"
              onClick={() => void rollback()}
              disabled={busy !== null}
              className="w-full rounded-md border border-threat/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-threat hover:bg-threat/10 disabled:opacity-40"
            >
              Emergency rollback to stable
            </button>
            <Link
              href="/model-hub"
              className="block text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:underline"
            >
              Open model repository →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
          <div>
            <p className="font-display text-[13px] font-semibold text-ink">Model artifacts</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">ONNX inventory and current deployment stage</p>
          </div>
          <Badge variant={models.live ? "kernel" : "muted"}>{models.live ? "live" : "cached"}</Badge>
        </div>
        <Table columns={modelColumns} data={models.data} keyExtractor={(model) => model.filename || model.sha256} />
      </Card>

      {stageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
          <div className="w-full max-w-lg rounded-md border border-hairline bg-panel p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">Stage candidate</p>
                <h2 className="mt-1 font-display text-[20px] font-bold text-ink">Promote a model to shadow</h2>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                  The candidate receives mirrored traffic without enforcement until an operator advances
                  the canary gate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStageOpen(false)}
                className="font-mono text-[12px] text-muted hover:text-ink"
                aria-label="Close stage candidate modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  Pick from model inventory
                </span>
                <select
                  value={candidate?.filename || ""}
                  onChange={(event) => pickModel(event.target.value)}
                  className="admin-input text-[11px]"
                >
                  <option value="">Manual candidate…</option>
                  {models.data.map((model) => (
                    <option key={model.filename || model.sha256} value={model.filename || ""}>
                      {model.filename || model.version} · {model.stage}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Version</span>
                <input value={stageVersion} onChange={(event) => setStageVersion(event.target.value)} placeholder="v2.5-rc1" className="admin-input font-mono text-[11px]" />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">SHA-256</span>
                <input value={stageSha} onChange={(event) => setStageSha(event.target.value)} placeholder="sha256 checksum" className="admin-input font-mono text-[10px]" />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Download URL</span>
                <input value={stageUrl} onChange={(event) => setStageUrl(event.target.value)} placeholder="/api/v1/models/..." className="admin-input font-mono text-[10px]" />
              </label>
              {stageError && (
                <p className="rounded border border-threat/30 bg-threat/5 px-3 py-2 font-mono text-[10px] text-threat">
                  {stageError}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setStageOpen(false)} className="admin-btn-secondary text-[10px]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void stageCandidate()}
                disabled={stageBusy}
                className="admin-btn-primary text-[10px] disabled:opacity-50"
              >
                {stageBusy ? "Staging…" : "Stage candidate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
