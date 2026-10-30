import type { Metadata } from "next";
import { Suspense } from "react";
import UniversalCatalogView from "../explore/UniversalCatalogView";

export const metadata: Metadata = {
  title: "Malware PCAP Vault | Aryorithm Hub",
  description:
    "Certified adversary traffic captures for pre-flight testing: Industroyer2, TRITON, Stuxnet, Modbus abuse, HTTP/2 Rapid Reset.",
};

export default function PcapsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading PCAP vault…
          </p>
        </div>
      }
    >
      <UniversalCatalogView
        fixedType="pcap"
        eyebrow="// Malware PCAP Vault"
        title="Adversary traffic, contained."
        description="Certified captures for pre-flight testing and forensic replay. Public promotion is content-sanitized; private captures remain tenant-confined."
        searchPlaceholder="Search captures, protocols, attack types…"
      />
    </Suspense>
  );
}
