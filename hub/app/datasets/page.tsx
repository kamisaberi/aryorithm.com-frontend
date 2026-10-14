import type { Metadata } from "next";
import DatasetsView from "./DatasetsView";

export const metadata: Metadata = {
  title: "SLAB Research Datasets | Aryorithm Hub",
  description:
    "Pre-normalized zero-copy research datasets for sentinel-lab: CIC-IDS-2017, UNSW-NB15, SWaT water testbed.",
};

export default function DatasetsPage() {
  return <DatasetsView />;
}
