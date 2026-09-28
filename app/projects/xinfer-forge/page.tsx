import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "xInfer Forge — Air-Gapped Continual Learning Service | Aryorithm",
  description: "Continual learning pipeline that operates entirely within the air-gapped enclave. Only ambiguous quantized feature vectors — never raw traffic — are eligible for model improvement.",
};

export default function XInferForgePage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "xInfer Forge" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Tier 4 Continuous Learning <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            xInfer Forge
          </h1>
          <p className="mt-2 font-mono text-[13px] text-kernel">Air-Gapped Continual Learning Service</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Continual learning pipeline that operates entirely within the air-gapped enclave. Only ambiguous quantized
            feature vectors — never raw traffic — are eligible for model improvement.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/forge" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Technology ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v1.4.0"], ["Status", "Beta"], ["Data Egress", "0 B"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What Is xInfer Forge?</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            xInfer Forge is the continual learning service that keeps xInfer Engine models up to date without requiring
            cloud connectivity or raw data egress. It operates entirely within the air-gapped enclave, learning from
            the appliance's own traffic patterns.
          </p>
          <p>
            The key constraint is data sovereignty: no PCAP, payload, or personally identifying record is transmitted
            off-site under any configuration. Even continual learning respects this — only ambiguous quantized feature
            vectors, never traffic, are eligible to move.
          </p>
          <p>
            The service uses a safety gate (golden_attacks.yaml) that monitors model updates for recall degradation.
            If a proposed update would reduce recall below the configured threshold, it is automatically rejected and
            flagged for human review.
          </p>
        </div>
      </section>

      <section id="learning-pipeline" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Learning Pipeline"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">How Learning Works.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            <span className="text-ink">Step 1 — Ambiguity detection:</span> When the xInfer Engine encounters a
            classification with low confidence (below the ambiguity threshold), the feature vector is flagged for
            potential learning.
          </p>
          <p>
            <span className="text-ink">Step 2 — Quantization:</span> The feature vector is quantized to int8 precision
            and stripped of any identifying metadata. The result is a compact, anonymized representation that cannot
            be reverse-engineered into the original traffic.
          </p>
          <p>
            <span className="text-ink">Step 3 — Local accumulation:</span> Quantized feature vectors are accumulated
            in a local buffer. When the buffer reaches a threshold (typically 10,000 vectors), a training batch is
            assembled.
          </p>
          <p>
            <span className="text-ink">Step 4 — Safety gate validation:</span> The proposed model update is validated
            against the golden_attacks.yaml test suite. If recall drops below the threshold, the update is rejected.
          </p>
          <p>
            <span className="text-ink">Step 5 — OTA promotion:</span> If the safety gate passes, the update is
            promoted through the OTA canary pipeline (shadow → 5% cohort → fleet).
          </p>
        </div>
      </section>

      <section id="safety-gate" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Safety Gate"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">golden_attacks.yaml.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The safety gate is a watchdog that monitors every model update for recall degradation. It is configured
            through golden_attacks.yaml — a curated test suite of known attack patterns that the model must correctly
            classify.
          </p>
          <p>
            Before any model update is deployed, it is validated against the golden attacks suite. If the update
            causes any golden attack to be misclassified, or if recall drops below the configured threshold, the
            update is automatically rejected.
          </p>
          <p>
            This ensures that continual learning can never degrade the appliance's detection capability. The model can
            only get better — never worse. This is a critical safety property for a system that operates autonomously
            in critical infrastructure environments.
          </p>
        </div>
      </section>

      <section id="zero-egress" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Zero Egress"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">0 Bytes Leave The Perimeter.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The xInfer Forge learning pipeline is designed for the most restrictive air-gapped environments. No raw
            packet data, no PCAP files, no payloads, and no personally identifying records are ever transmitted
            off-site.
          </p>
          <p>
            Even the learning uplink is optional and can be disabled entirely without losing detection capability.
            When disabled, the appliance continues to detect threats using its existing models — it simply stops
            learning from new traffic patterns.
          </p>
          <p>
            This is a deliberate design decision: a defense product that requires data egress to improve is a defense
            product that cannot be deployed in the environments that need it most. xInfer Forge proves that continual
            learning and data sovereignty are not mutually exclusive.
          </p>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
