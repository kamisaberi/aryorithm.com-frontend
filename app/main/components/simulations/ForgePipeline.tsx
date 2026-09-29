"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatStrip } from "@/components/ui/StatusBadge";

const STEPS = [
  { id: "step-mae", index: "Step 1", name: "Self-Supervised Masked Autoencoding (MAE)", sub: "30% masking · 32-dim NetFlow vectors · zero labels", color: "#00E5FF", blurb: "Hide 30% of every feature vector and force the autoencoder to rebuild it. Learning the plant's real traffic topology requires no manual data labeling at all.", stats: [["Mask Ratio", "30%"], ["Vector Dim", "32"], ["Labels", "0", "#00FFA3"]] as [string, string, string?][] },
  { id: "step-infonce", index: "Step 2", name: "InfoNCE Contrastive Loss", sub: "Positive pairs pulled together, negatives pushed apart", color: "#FFB800", blurb: "Geometry the reconstruction loss cannot provide: a hyperplane that separates ambient normal telemetry from zero-day anomalies in embedding space.", stats: [["Negatives", "4,095"], ["Temp τ", "0.07"], ["Separation", "Linear", "#00FFA3"]] as [string, string, string?][] },
  { id: "step-gate", index: "Step 3", name: "The Non-Negotiable Regression Safety Gate", sub: "configs/safety/golden_attacks.yaml", color: "#FF3366", blurb: "Candidate weights are replayed against an immutable historical attack suite. Miss one attack and adaptation is aborted and purged; retain all and the model compiles to ONNX opset 17 for staging.", stats: [["Required Rate", "1.00", "#FFB800"], ["Suite", "18 attacks"], ["On Miss", "Purge", "#FF3366"]] as [string, string, string?][] },
];

export default function ForgePipeline() {
  const [openId, setOpenId] = useState("step-mae");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("safety-gate")) {
      setOpenId("step-gate");
    }
  }, []);

  return (
    <div className="space-y-4">
      {STEPS.map((s) => {
        const open = openId === s.id;
        return (
          <article key={s.id} className="rounded-md border border-hairline bg-panel" style={open ? { borderColor: `${s.color}88`, boxShadow: `0 0 34px -12px ${s.color}` } : undefined}>
            <button type="button" onClick={() => setOpenId(open ? "" : s.id)} aria-expanded={open} aria-controls={`${s.id}-body`} className="flex w-full items-start gap-4 px-5 py-5 text-left">
              <span className="font-mono text-[12px] text-muted">{s.index}</span>
              <span className="flex-1">
                <span className="block font-display text-[16px] font-bold text-ink">{s.name}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] text-muted">{s.sub}</span>
              </span>
              <span className="font-mono text-[18px] text-muted" style={{ transform: open ? "rotate(45deg)" : undefined }} aria-hidden="true">+</span>
            </button>
            <div className="px-5 pb-4"><StatStrip items={s.stats} /></div>
            {open && (
              <div id={`${s.id}-body`} className="rise-in border-t border-hairline bg-void/45 px-5 py-4">
                <p className="text-[13px] leading-relaxed text-muted">{s.blurb}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/technology/xinfer" className="font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">Compile targets →</Link>
                  <Link href="/platform/nexus#nexus-capabilities" className="font-mono text-[11px] uppercase tracking-[0.1em] text-cyan hover:underline">Stage via Nexus →</Link>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
