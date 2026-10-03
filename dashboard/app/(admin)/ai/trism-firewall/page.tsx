"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type TrismResult } from "@/lib/backend";
import { useAuth } from "@/lib/auth";

interface HistoryRow extends TrismResult {
  key: string;
  prompt: string;
}

const SNIPPET = `from openai import OpenAI

client = OpenAI(
    base_url="https://aryorithm.example.com/v1/trism",
    api_key="ary_live_...",
)

resp = client.chat.completions.create(
    model="sentinel-guard",
    messages=[{"role": "user", "content": prompt_text}],
)
# blocked prompts raise with audit_reason attached`;

export default function TrismFirewallPage() {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const intercepted = history.filter((h) => !h.safe_to_forward).length;

  const evaluate = async () => {
    if (!token || !prompt.trim() || busy) {
      if (!prompt.trim()) setError("Enter a prompt to evaluate.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await backend.trismEvaluate({ prompt_text: prompt, sanitize_pii: true }, token);
      setHistory((h) => [{ ...res, key: `${Date.now()}`, prompt }, ...h].slice(0, 20));
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "prompt", header: "Prompt", render: (h: HistoryRow) => (
      <span className="font-mono text-[11px] text-ink">{h.prompt.length > 80 ? `${h.prompt.slice(0, 80)}…` : h.prompt}</span>
    )},
    { key: "category", header: "Category", render: (h: HistoryRow) => (
      <span className="font-mono text-[11px] text-muted">{h.threat_category}</span>
    )},
    { key: "risk", header: "Risk", render: (h: HistoryRow) => (
      <span className={`font-mono text-[11px] ${h.risk_score > 0.8 ? "text-threat" : "text-kernel"}`}>{h.risk_score.toFixed(3)}</span>
    )},
    { key: "action", header: "Action", render: (h: HistoryRow) => (
      <Badge variant={h.action_enforced === "FORWARDED" ? "kernel" : "threat"}>{h.action_enforced}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI TRiSM Firewall"
        description="Prompt injection and token anomaly screening with live stream"
        breadcrumbs={[{ label: "AI & Silicon", href: "/ai/trism-firewall" }, { label: "TRiSM Firewall" }]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Prompts Evaluated</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{history.length}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Injections Intercepted</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">{intercepted}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">PII Tokens Redacted</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">
            {history.filter((h) => h.sanitized_prompt && h.sanitized_prompt.includes("REDACTED")).length}
          </p>
        </Card>
      </div>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Evaluate a prompt</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ignore previous instructions…" className="admin-input w-full font-mono" />
          <button type="button" className="admin-btn-primary text-[12px] disabled:opacity-50" disabled={busy} onClick={() => void evaluate()}>
            {busy ? "Evaluating…" : "Evaluate"}
          </button>
        </div>
        {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
        {history[0]?.audit_reason && (
          <p className="mt-2 font-mono text-[11px] text-muted">latest: {history[0].audit_reason}</p>
        )}
      </Card>
      <Card>
        <Table columns={columns} data={history} keyExtractor={(h) => h.key} />
      </Card>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">API integration — route OpenAI/LangChain through the proxy</p>
        <pre className="mt-3 overflow-x-auto rounded border border-hairline bg-void/60 p-4 font-mono text-[11px] leading-relaxed text-muted">{SNIPPET}</pre>
      </Card>
    </div>
  );
}
