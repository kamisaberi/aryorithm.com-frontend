import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "SLAB Research Datasets | Aryorithm Hub",
  description:
    "Pre-normalized zero-copy research datasets for sentinel-lab: CIC-IDS-2017, UNSW-NB15, SWaT water testbed.",
};

export default function DatasetsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading datasets…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="dataset"
        eyebrow="// SLAB Research Datasets"
        title="Telemetry, normalized."
        description="Zero-copy research corpora in SLAB, PCAP, Parquet and NetFlow formats. Public datasets remain open; private tenant corpora stay isolated."
        searchPlaceholder="Search datasets, formats, sectors…"
      />
    </Suspense>
  );
}
