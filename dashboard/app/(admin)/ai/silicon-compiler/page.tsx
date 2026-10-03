"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type CompileTask } from "@/lib/backend";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const TARGETS = [
  { id: "INTEL_OPENVINO", label: "Intel OpenVINO", ext: ".xml" },
  { id: "NVIDIA_TENSORRT", label: "NVIDIA TensorRT", ext: ".engine" },
  { id: "ROCKCHIP_RKNN", label: "Rockchip RKNN", ext: ".rknn" },
  { id: "HAILO_8", label: "Hailo-8", ext: ".hef" },
  { id: "QUALCOMM_QNN", label: "Qualcomm QNN", ext: ".bin" },
];

export default function SiliconCompilerPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("ROCKCHIP_RKNN");
  const [precision, setPrecision] = useState("INT8");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [task, setTask] = useState<CompileTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const push = (line: string) => setLog((l) => [...l, line]);

  const compile = async (): Promise<void> => {
    setError(null);
    setTask(null);
    if (!file) {
      setError("Select an .onnx model first.");
      return;
    }
    setBusy(true);
    setLog([]);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("target_silicon", target);
      form.append("precision", precision);
      push(`$ upload ${file.name} → ${target} [${precision}]`);
      const submitted = await backend.compileModel(form, token);
      push(`[+] task ${submitted.task_id} QUEUED (~${submitted.estimated_seconds ?? 15}s)`);
      let status = submitted;
      for (let i = 0; i < 10 && status.status !== "COMPLETED" && status.status !== "FAILED"; i++) {
        await new Promise((r) => setTimeout(r, 1200));
        status = await backend.compileTask(submitted.task_id, token);
        push(`[…] poll ${i + 1}: ${status.status}`);
      }
      setTask(status);
      if (status.status === "COMPLETED") push(`[+] done: ${status.output_filename} (${status.size_bytes} B, ${status.latency_speedup_factor})`);
      else push("[!] worker did not finish — retry polling");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compilation failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async (): Promise<void> => {
    if (!task?.download_url) return;
    const res = await fetch(`${API_BASE}${task.download_url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setError(`Download failed with status ${res.status}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = task.output_filename ?? "artifact.bin";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Silicon Compiler"
        description="Cross-compile ONNX into silicon-specific binaries"
        breadcrumbs={[{ label: "AI & Silicon", href: "/ai/silicon-compiler" }, { label: "Silicon Compiler" }]}
        actions={task ? <Badge variant={task.status === "COMPLETED" ? "kernel" : "cyan"}>{task.task_id} · {task.status}</Badge> : undefined}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Model dropzone (.onnx)</p>
        <input type="file" accept=".onnx" className="admin-input mt-3" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Target silicon</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTarget(t.id)}
              className={`rounded-md border px-3 py-2.5 text-left transition-colors ${target === t.id ? "border-cyan/60 bg-cyan/5" : "border-hairline hover:border-cyan/30"}`}
            >
              <p className={`font-mono text-[11px] font-bold ${target === t.id ? "text-cyan" : "text-ink"}`}>{t.label}</p>
              <p className="font-mono text-[10px] text-muted">{t.ext}</p>
            </button>
          ))}
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Precision</p>
        <select value={precision} onChange={(e) => setPrecision(e.target.value)} className="admin-input mt-2 max-w-[220px]">
          <option value="FP32">FP32</option>
          <option value="FP16">FP16 (Half Precision)</option>
          <option value="INT8">INT8 (Calibrated)</option>
        </select>
        <div className="mt-4">
          <button type="button" className="admin-btn-primary text-[12px] disabled:opacity-50" disabled={busy || !file} onClick={() => void compile()}>
            {busy ? "Compiling…" : "Compile"}
          </button>
        </div>
        {error && <p className="mt-2 font-mono text-[12px] text-threat">{error}</p>}
      </Card>
      {(log.length > 0 || task?.status === "COMPLETED") && (
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Live compilation terminal</p>
          <div className="mt-3 max-h-56 overflow-y-auto rounded border border-hairline bg-void/60 p-3 font-mono text-[11px] leading-relaxed text-muted">
            {log.map((l, i) => <p key={i} className={l.startsWith("[+") ? "text-kernel" : undefined}>{l}</p>)}
          </div>
          {task?.status === "COMPLETED" && (
            <div className="mt-4 rounded border border-kernel/30 bg-kernel/5 p-4">
              <p className="font-mono text-[12px] text-ink">{task.output_filename} · {task.size_bytes} B · {task.latency_speedup_factor} speedup</p>
              <p className="mt-1 break-all font-mono text-[10px] text-muted">sha256 {task.sha256}</p>
              <button type="button" onClick={() => void download()} className="admin-btn-primary mt-3 text-[12px]">
                Download Pre-Compiled Artifact
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
