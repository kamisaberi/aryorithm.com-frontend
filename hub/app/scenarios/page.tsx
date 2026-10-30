import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "Digital Twin Scenarios | Aryorithm Hub",
  description:
    "Downloadable attack scenarios for sentinel-matrix: power grid blackout, hospital PACS heist, refinery TRITON sabotage.",
};

export default function ScenariosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading cyber-range scenarios…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="scenario"
        eyebrow="// Digital Twin Scenarios"
        title="Ranges that replay reality."
        description="Attack scenarios for sentinel-matrix digital twins with topology manifests, replayed TTPs and deterministic reset points."
        searchPlaceholder="Search scenarios, sectors, complexity…"
      />
    </Suspense>
  );
}
