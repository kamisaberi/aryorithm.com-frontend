import type { Metadata } from "next";
import PcapsView from "./PcapsView";

export const metadata: Metadata = {
  title: "Malware PCAP Vault | Aryorithm Hub",
  description:
    "Certified adversary traffic captures for pre-flight testing: Industroyer2, TRITON, Stuxnet, Modbus abuse, HTTP/2 Rapid Reset.",
};

export default function PcapsPage() {
  return <PcapsView />;
}
