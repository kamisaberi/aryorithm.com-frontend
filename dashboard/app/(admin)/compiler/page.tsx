"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type AIModel } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_MODELS } from "@/data/dummy";

const TARGETS = ["ROCKCHIP_RKNN", "OPENVINO", "TENSORRT", "NCNN"] as const;
type CompileTarget = (typeof TARGETS)[number];

export default function CompilerPage() {
  const { token } = useAuth();
  const ping = useBackend<AIModel[]>(
    DUMMY_MODELS,
    (t) => backend.models(t),
    token
  );
  const [modelId, setModelId] = useState("v2.0");
  const [target, setTarget] = useState<CompileTarget>("ROCKCHIP_RKNN");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = ping.live || result !== null;

  const compile = async () => {
    if (!token) {
      setError("Sign in to compile a model.");
      return;
    }
    if (!modelId.trim()) {
      setError("Model ID is required.");
      return;
    }
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", new Blob([`{"model_id":"${modelId.trim()}"}`], { type: "application/octet-stream" }), `${modelId.trim()}.onnx`);
      form.append("target_silicon", target);
      form.append("precision", "FP16");
      const res = await backend.compileModel(form, token);
      const status = await backend.compileTask(res.task_id, token);
      setResult(`Task ${status.task_id}: ${status.status}${status.output_filename ? ` → ${status.output_filename}` : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compilation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="15x Compiler"
        description="Heterogeneous silicon compilation and optimization"
        breadcrumbs={[{ label: "AI & Silicon", href: "/model-hub" }, { label: "15x Compiler" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Compile Model
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] text-muted">
              Model ID
            </span>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="admin-input w-full font-mono text-[12px]"
              placeholder="v2.0"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] text-muted">
              Target
            </span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as CompileTarget)}
              className="admin-input w-full font-mono text-[12px]"
            >
              {TARGETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={compile}
            className="admin-btn-primary text-[12px] disabled:opacity-50"
          >
            {busy ? "Compiling…" : "Compile"}
          </button>
          {result && (
            <span className="font-mono text-[11px] text-kernel">{result}</span>
          )}
          {error && (
            <span className="font-mono text-[11px] text-threat">{error}</span>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Supported Targets
        </p>
        <ul className="mt-3 space-y-2">
          {TARGETS.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Badge variant="muted">{t}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
