import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "Verified Packages | Aryorithm Hub",
  description:
    "Browse signed native C++20, Wasm and Lua packages for edge dissectors, micro-rules and protocol guards.",
};

export default function PackagesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading packages…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="package"
        eyebrow="// Verified Packages"
        title="Packages for the fast path."
        description="Hardware-accelerated dissectors, sandboxed micro-rules and protocol guards. Every package is signed, hashed and ready for air-gapped deployment."
        searchPlaceholder="Search packages, protocols, sectors…"
      />
    </Suspense>
  );
}
