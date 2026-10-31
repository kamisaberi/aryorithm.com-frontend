import type { Metadata } from "next";
import ArtifactsExplorer from "@/components/artifacts/ArtifactsExplorer";

export const metadata: Metadata = {
  title: "Artifact Hub — Search & Share | Aryorithm",
  description:
    "Search, inspect, download, fork and share every authorized Aryorithm artifact from the dashboard.",
};

export default function ArtifactHubPage() {
  return <ArtifactsExplorer initialScope="all" hubMode />;
}
