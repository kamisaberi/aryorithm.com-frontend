import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PackageDetailView from "@/components/hub/PackageDetailView";
import { hub } from "@/lib/hub";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const pkg = await hub.sentinelPackage(params.slug);
    return {
      title: `${pkg.name} | Aryorithm Hub`,
      description: pkg.short_description.slice(0, 160),
    };
  } catch {
    return { title: "Package | Aryorithm Hub" };
  }
}

export default async function PackagePage({ params }: Props) {
  let pkg;
  try {
    pkg = await hub.sentinelPackage(params.slug);
  } catch {
    notFound();
  }
  return <PackageDetailView pkg={pkg} />;
}
