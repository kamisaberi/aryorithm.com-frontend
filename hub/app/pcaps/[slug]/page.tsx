import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PcapDetailView from "@/components/hub/PcapDetailView";
import { library } from "@/lib/hub";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const pcap = await library.pcap(params.slug);
    return {
      title: `${pcap.title} | Aryorithm Hub`,
      description: pcap.short_description.slice(0, 160),
    };
  } catch {
    return { title: "PCAP Capture | Aryorithm Hub" };
  }
}

export default async function PcapPage({ params }: Props) {
  let pcap;
  try {
    pcap = await library.pcap(params.slug);
  } catch {
    notFound();
  }
  return <PcapDetailView pcap={pcap} />;
}
