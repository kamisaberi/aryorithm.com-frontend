import type { Metadata } from "next";
import AssetDetailView from "./AssetDetailView";

interface AssetPageProps {
  params: { type: string; slug: string };
}

export function generateMetadata({ params }: AssetPageProps): Metadata {
  const title = params.slug.replace(/[-_]+/g, " ");
  return {
    title: `${title} | Aryorithm Hub`,
    description:
      "Inspect cryptographic provenance, latency SLA, dependencies and raw manifests for a verified Aryorithm asset.",
  };
}

export default function AssetPage({ params }: AssetPageProps) {
  return <AssetDetailView type={params.type} slug={params.slug} />;
}
