"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type ResilienceScore } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_RESILIENCE } from "@/data/dummy";

export default function AttackReplayPage() {
  const { token } = useAuth();
  const { data: resilience, live } = useBackend<ResilienceScore>(
    DUMMY_RESILIENCE,
    (t) => backend.resilience(t),
    token
  );
  const [malware, setMalware] = useState("INDUSTROYER");
  const [target, setTarget] = useState("NODE-01");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    frames_injected: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReplay = async (): Promise<void> => {
    setResult(null);
    setError(null);
    setBusy(true);
    try {
      const res = await backend.replayAttack({ malware, target }, token);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Replay failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attack Replay"
        description="Attack scenario replay and incident reconstruction"
        breadcrumbs={[{ label: "Cyber Range", href: "/cyber-range/twins" }, { label: "Attack Replay" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            Score {resilience.score}
            {live ? "" : " (cached)"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            MTTFI{live ? "" : " (cached)"}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {resilience.mttfi_ms} ms
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Rollback Guard{live ? "" : " (cached)"}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">
            {resilience.rollback_guard_ms} ms
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Resilience Score{live ? "" : " (cached)"}
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">
            {resilience.score}
          </p>
        </Card>
      </div>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Replay an attack
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-muted">Malware</span>
            <input
              type="text"
              className="admin-input"
              value={malware}
              onChange={(e) => setMalware(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-muted">Target</span>
            <input
              type="text"
              className="admin-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="admin-btn-primary"
              disabled={busy}
              onClick={() => void handleReplay()}
            >
              {busy ? "Replaying…" : "Replay Attack"}
            </button>
          </div>
        </div>
        {result && (
          <p className="mt-3 font-mono text-[12px] text-kernel">
            {result.status} — {result.frames_injected} frames injected
          </p>
        )}
        {error && (
          <p className="mt-3 font-mono text-[12px] text-threat">{error}</p>
        )}
      </Card>
    </div>
  );
}
