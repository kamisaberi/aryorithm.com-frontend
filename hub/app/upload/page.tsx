import type { Metadata } from "next";
import UploadArtifactView from "./UploadArtifactView";

export const metadata: Metadata = {
  title: "Upload Artifact | Aryorithm Hub",
  description:
    "Upload packages, datasets, models, PCAPs, scenarios, blueprints and appliances with your signed-in member account — no developer API token required.",
};

export default function UploadArtifactPage() {
  return <UploadArtifactView />;
}
