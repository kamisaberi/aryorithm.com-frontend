import type { Metadata } from "next";
import { Suspense } from "react";
import ExploreView from "./ExploreView";

export const metadata: Metadata = {
  title: "Explore Extensions | Aryorithm Hub",
  description:
    "Search and filter the extension mesh by domain, runtime, silicon target, and verification tier.",
};

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Loading catalog…</p>
        </div>
      }
    >
      <ExploreView />
    </Suspense>
  );
}
