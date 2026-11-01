import type { Metadata } from "next";
import ArtifactsExplorer from "@/components/artifacts/ArtifactsExplorer";

export const metadata: Metadata = {
  title: "Shared with Me | Aryorithm",
  description: "Artifacts other members and tenants shared with your account.",
};

export default function SharedArtifactsPage() {
  return <ArtifactsExplorer initialScope="shared" />;
}
