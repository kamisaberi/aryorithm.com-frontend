import type { Metadata } from "next";
import ScenariosView from "./ScenariosView";

export const metadata: Metadata = {
  title: "Digital Twin Scenarios | Aryorithm Hub",
  description:
    "Downloadable attack scenarios for sentinel-matrix: power grid blackout, hospital PACS heist, refinery TRITON sabotage.",
};

export default function ScenariosPage() {
  return <ScenariosView />;
}
