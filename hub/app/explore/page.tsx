import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "./UniversalCatalogView";

export const metadata: Metadata = {
  title: "Universal Asset Catalog | Aryorithm Hub",
  description:
    "Search every signed Aryorithm asset type: packages, models, datasets, PCAPs, scenarios, production blueprints and official appliances.",
};

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading universal catalog…
          </p>
        </div>
      }
    >
      <UniversalCatalogView />
    </Suspense>
  );
}
