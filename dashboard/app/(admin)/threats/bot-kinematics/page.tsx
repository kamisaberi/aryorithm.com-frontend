"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type BotVerdict } from "@/lib/backend";
import { useAuth } from "@/lib/auth";

const SNIPPET = `<script src="https://api.aryorithm.com/sdk/bad.js"
  data-key="ary_live_..."></script>
<script>
  BadSensor.evaluate().then((v) => {
    fetch("/api/v1/bot/evaluate", {
      method: "POST",
      headers: { "X-API-Key": "ary_live_...", "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: v.session, kinematic_vectors: v.vectors }),
    });
  });
</script>`;

export default function BotKinematicsPage() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BotVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let x = 20;
    let y = 30;
    for (let i = 0; i < 40; i++) {
      x += 8 + Math.sin(i * 0.7) * 10 + (i % 7 === 0 ? 34 : 0);
      y += 5 + Math.cos(i * 0.4) * 8;
      pts.push({ x, y });
    }
    return pts;
  }, []);

  const evaluate = async (scripted: boolean) => {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const vectors = scripted
        ? points.map((p, i) => ({ x: p.x, y: p.y, dt_ms: 16 }))
        : points.map((p, i) => ({ x: p.x + (i % 3) * 7, y: p.y + (i % 5) * 3, dt_ms: 16 + ((i * 37) % 120) }));
      const res = await backend.botEvaluate(
        { session_id: `sess_demo_${Date.now()}`, kinematic_vectors: vectors, keystroke_jitter_ms: scripted ? 0.04 : 12.6 },
        token
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  };

  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot Kinematics API"
        description="Human vs scripted trajectory analysis without CAPTCHAs"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/bot-kinematics" }, { label: "Bot Kinematics API" }]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Kinematic curve visualizer</p>
          <svg viewBox={`0 0 ${maxX + 20} ${maxY + 20}`} className="mt-3 h-48 w-full rounded border border-hairline bg-void/60">
            <polyline
              points={points.map((p) => `${p.x + 10},${p.y + 10}`).join(" ")}
              fill="none"
              stroke="#00E5FF"
              strokeWidth="1.5"
            />
            {points.filter((_, i) => i % 8 === 0).map((p, i) => (
              <circle key={i} cx={p.x + 10} cy={p.y + 10} r="2.5" fill="#FFB800" />
            ))}
          </svg>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void evaluate(false)} className="admin-btn-secondary text-[12px] disabled:opacity-50">
              Score human sample
            </button>
            <button type="button" disabled={busy} onClick={() => void evaluate(true)} className="admin-btn-secondary text-[12px] disabled:opacity-50">
              Score scripted sample
            </button>
          </div>
          {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
          {result && (
            <div className="mt-3 rounded border border-hairline p-3">
              <Badge variant={result.verdict === "AUTOMATED_BOT" ? "threat" : "kernel"}>{result.verdict}</Badge>
              <p className="mt-2 font-mono text-[11px] text-muted">bot_probability {result.bot_probability} · {result.confidence}</p>
              {result.attribution_factors.map((f) => (
                <p key={f} className="mt-1 font-mono text-[10.5px] text-muted">· {f}</p>
              ))}
              <p className="mt-2 font-mono text-[11px] text-cyan">{result.action_recommended}</p>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Bot traffic breakdown</p>
            {[
              ["Human Verified", 74, "bg-kernel"],
              ["Good Search Bots", 18, "bg-cyan"],
              ["Malicious Scrapers & Credential Bots", 8, "bg-threat"],
            ].map(([label, pct, color]) => (
              <div key={label as string} className="mt-3 flex items-center gap-3">
                <span className="w-56 text-[11.5px] text-muted">{label} ({pct}%)</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-hairline">
                  <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Website integration</p>
            <pre className="mt-3 overflow-x-auto rounded border border-hairline bg-void/60 p-3 font-mono text-[10.5px] leading-relaxed text-muted">{SNIPPET}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
