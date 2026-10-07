import type { Metadata } from "next";
import FaqView from "./FaqView";

export const metadata: Metadata = {
  title: "Architectural FAQ | Aryorithm",
  description:
    "Deep-tech Q&A on eBPF/XDP architecture, silicon backends, continual learning, and hardware attestation.",
};

export default function FaqPage() {
  return <FaqView />;
}
