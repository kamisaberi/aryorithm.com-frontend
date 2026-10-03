"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type TrismResult } from "@/lib/backend";
import { useAuth } from "@/lib/auth";

export default function TrismPage() {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TrismResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluate = async () => {
    if (!token || !prompt.trim()) {
      setError("Enter a prompt to evaluate.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await backend.trismEvaluate({ prompt_text: prompt }, token);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI TRiSM Firewall"
        description="Prompt injection and token anomaly screening for LLM inputs"
        breadcrumbs={[{ label: "AI & Silicon", href: "/trism" }, { label: "TRiSM Firewall" }]}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Evaluate a prompt
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Paste model input to screen for injection…"
          className="admin-input mt-3 w-full font-mono"
        />
        <button type="button" className="admin-btn-primary mt-3 text-[12px] disabled:opacity-50" disabled={busy} onClick={() => void evaluate()}>
          {busy ? "Evaluating…" : "Evaluate"}
        </button>
        {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
      </Card>
      {result && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={result.safe_to_forward ? "kernel" : "threat"}>{result.safe_to_forward ? "SAFE" : "BLOCKED"}</Badge>
            <span className="font-mono text-[12px] text-muted">risk_score {result.risk_score.toFixed(3)}</span>
            <span className="font-mono text-[11px] text-muted">{result.threat_category} · {result.action_enforced}</span>
          </div>
          {result.sanitized_prompt && (
            <p className="mt-3 whitespace-pre-wrap font-mono text-[12px] text-ink">{result.sanitized_prompt}</p>
          )}
          <p className="mt-2 font-mono text-[11px] text-muted">{result.audit_reason}</p>
        </Card>
      )}
    </div>
  );
}
