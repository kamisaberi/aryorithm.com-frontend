import type { Metadata } from "next";
import PortalView from "./PortalView";

export const metadata: Metadata = {
  title: "Customer Enclave Portal | Aryorithm",
  description:
    "Hardware-bound operator access and offline license issuance for Aryorithm appliances.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalPage() {
  return <PortalView />;
}
