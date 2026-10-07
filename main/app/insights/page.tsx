import type { Metadata } from "next";
import InsightsView from "./InsightsView";

export const metadata: Metadata = {
  title: "Technical Insights | Aryorithm",
  description:
    "Exploit analyses, benchmarks, and engineering deep-dives: protocol dissectors, latency distributions, and zero-copy measurements.",
};

export default function InsightsPage() {
  return <InsightsView />;
}
