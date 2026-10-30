import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "AI Models | Aryorithm Hub",
  description:
    "Foundation and community models for edge inference and forge retraining: ONNX, SafeTensors, OpenVINO IR, TensorRT engines.",
};

export default function ModelsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading models…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="model"
        eyebrow="// AI Model Vault"
        title="Models for the edge."
        description="Foundation and community models with signed artifacts, precision profiles and hardware-specific runtimes. Private workspace models appear only to authorized members."
        searchPlaceholder="Search models, domains, architectures…"
      />
    </Suspense>
  );
}
