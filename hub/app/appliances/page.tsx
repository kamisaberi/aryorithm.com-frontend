import type { Metadata } from "next";
import ApplianceMatrixView from "./ApplianceMatrixView";

export const metadata: Metadata = {
  title: "Official Appliance Matrix | Aryorithm Hub",
  description:
    "Download root-signed .aryopack appliance images for Intel, NVIDIA Jetson, Rockchip and generic Linux targets.",
};

export default function AppliancesPage() {
  return <ApplianceMatrixView />;
}
