import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "Production Blueprints | Aryorithm Hub",
  description:
    "Deploy signed production-site blueprints with verified pipeline DAGs, latency SLAs and hardware bindings.",
};

export default function BlueprintsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading blueprints…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="blueprint"
        eyebrow="// Production Blueprints"
        title="Blueprints for real sites."
        description="Signed deployment pipelines with documented dependencies, latency guarantees and hardware bindings for critical infrastructure."
        searchPlaceholder="Search blueprints, industries, target sites…"
      />
    </Suspense>
  );
}
