import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "Official Appliance Matrix | Aryorithm Hub",
  description:
    "Download root-signed .aryopack appliance images for Intel, NVIDIA Jetson, Rockchip and generic Linux targets.",
};

export default function AppliancesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading appliance matrix…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="appliance"
        eyebrow="// Official Appliance Matrix"
        title="Root-signed images. Zero egress."
        description="Authority-signed .aryopack distributions for Intel, NVIDIA Jetson, Rockchip and generic Linux targets. Every image verifies against the Aryorithm Authority Root before installation."
        searchPlaceholder="Search appliances, architectures, industries…"
      />
    </Suspense>
  );
}
