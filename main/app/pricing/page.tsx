import type { Metadata } from "next";
import PricingView from "./PricingView";

export const metadata: Metadata = {
  title: "Pricing & Licensing | Aryorithm",
  description:
    "Node-based licensing for air-gapped enclaves: community research tier, enterprise IT, critical infrastructure, and sovereign defense.",
};

export default function PricingPage() {
  return <PricingView />;
}
