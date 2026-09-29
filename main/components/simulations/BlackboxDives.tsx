"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatStrip } from "@/components/ui/StatusBadge";
import { InfoNceVisualizer, MaeVisualizer } from "@/components/simulations/ForgeSims";

const STEPS = [
  { id: "step-mae", index: "Step 1", name: "Self-Supervised Masked Autoencoding (MAE)", sub: "30% masking · 32-dim NetFlow vectors · zero labels", color: "#00E5FF", blurb: "Hide 30% of every feature vector and force the autoencoder to rebuild it. Learning the plant's real traffic topology requires no manual data labeling at all.", stats: [["Mask Ratio", "30%"], ["Vector Dim", "32"], ["Labels", "0", "#00FFA3"]] as [string, string, string?][] },
  { id: "step-infonce", index: "Step 2", name: "InfoNCE Contrastive Loss", sub: "Positive pairs pulled together, negatives pushed apart", color: "#FFB800", blurb: "Geometry the reconstruction loss cannot provide: a hyperplane that separates ambient normal telemetry from zero-day anomalies in embedding space.", stats: [["Negatives", "4,095"], ["Temp τ", "0.07"], ["Separation", "Linear", "#00FFA3"]] as [string, string, string?][] },
  { id: "step-gate", index: "Step 3", name: "The Non-Negotiable Regression Safety Gate", sub: "configs/safety/golden_attacks.yaml", color: "#FF3366", blurb: "Candidate weights are replayed against an immutable historical attack suite. Miss one attack and adaptation is aborted and purged; retain all and the model compiles to ONNX opset 17 for staging.", stats: [["Required Rate", "1.00", "#FFB800"], ["Suite", "18 attacks"], ["On Miss", "Purge", "#FF3366"]] as [string, string, string?][] },
];

export default function BlackboxDives() {
  return <ForgeLikePanels />;
}

function ForgeLikePanels() {
  const [openId, setOpenId] = useState<string | null>("dive-xdp");
  useEffect(() => {
    setOpenId("dive-xdp");
  }, []);
  const DIVES = [
    { id: "dive-xdp", index: "01", name: "Native eBPF / XDP Filter", sub: "Clang → BPF bytecode → in-driver execution", color: "#00E5FF", blurb: "Filter logic is compiled by Clang to BPF bytecode, verified by the kernel on load, and executed inside the network driver — before a Linux socket buffer exists for the packet.", stats: [["Compiler", "Clang / LLVM"], ["Verified", "on load", "#00FFA3"], ["Hook", "XDP native"]] as [string, string, string?][] },
    { id: "dive-ring", index: "02", name: "Lock-Free SPMC Ring Buffer", sub: "EventRingBuffer — no mutex in the hot path", color: "#FFB800", blurb: "A single-producer multi-consumer circular buffer coordinates concurrent C++ inference threads with atomic cursors, so no thread can ever stall another behind a mutex.", stats: [["Producers", "1"], ["Consumers", "N threads"], ["Mutex Stalls", "0", "#00FFA3"]] as [string, string, string?][] },
    { id: "dive-identity", index: "03", name: "Three-Tier Adaptive Hardware Identity Engine", sub: "TPM 2.0 → vTPM → cryptographic DMI fallback", color: "#00FFA3", blurb: "Machine identity degrades gracefully instead of failing open. The engine probes physical TPM, then hypervisor vTPM, then a hardware composite hash — and always reports which tier it achieved.", stats: [["Tiers", "3 ordered"], ["Preferred", "TPM 2.0", "#00FFA3"], ["Fail Open", "never", "#FF3366"]] as [string, string, string?][] },
  ];
  void STEPS;
  void InfoNceVisualizer;
  void MaeVisualizer;
  return (
    <div className="space-y-4">
      {DIVES.map((d) => {
        const open = openId === d.id;
        return (
          <article key={d.id} className="rounded-md border border-hairline bg-panel" style={open ? { borderColor: `${d.color}88`, boxShadow: `0 0 34px -12px ${d.color}` } : undefined}>
            <button type="button" onClick={() => setOpenId(open ? null : d.id)} aria-expanded={open} aria-controls={`${d.id}-body`} className="flex w-full items-start gap-4 px-5 py-5 text-left">
              <span className="font-mono text-[12px] text-muted">{d.index}</span>
              <span className="flex-1">
                <span className="block font-display text-[16px] font-bold text-ink">{d.name}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] text-muted">{d.sub}</span>
                <span className="mt-2 block text-[13px] text-muted">{d.blurb}</span>
              </span>
              <span className="font-mono text-[18px] text-muted" style={{ transform: open ? "rotate(45deg)" : undefined }} aria-hidden="true">+</span>
            </button>
            <div className="px-5 pb-4"><StatStrip items={d.stats} /></div>
            {open && (
              <div id={`${d.id}-body`} className="rise-in border-t border-hairline bg-void/45 px-5 py-4">
                <p className="text-[13px] leading-relaxed text-muted">
                  See the source listings below — the XDP filter and the lock-free ring are shipped verbatim with every
                  appliance image.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/technology/xinfer" className="font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">libxinfer runtime →</Link>
                  <Link href="/technology/forge" className="font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">xInfer Forge safety gate →</Link>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
