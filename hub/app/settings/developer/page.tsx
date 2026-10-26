import type { Metadata } from "next";
import DeveloperPortalView from "./DeveloperPortalView";

export const metadata: Metadata = {
  title: "Developer Portal | Aryorithm Hub",
  description:
    "Manage CLI publication tokens, review your Ed25519 identity and publish signed assets to the Hub registry.",
};

export default function DeveloperPortalPage() {
  return <DeveloperPortalView />;
}
