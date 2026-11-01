import type { Metadata } from "next";
import ArtifactsExplorer from "@/components/artifacts/ArtifactsExplorer";

export const metadata: Metadata = {
  title: "My Artifacts | Aryorithm",
  description: "Artifacts you uploaded to your Aryorithm workspace.",
};

export default function MyArtifactsPage() {
  return <ArtifactsExplorer initialScope="owned" />;
}
