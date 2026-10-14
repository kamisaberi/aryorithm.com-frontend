import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DatasetDetailView from "@/components/hub/DatasetDetailView";
import { library } from "@/lib/hub";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const dataset = await library.dataset(params.slug);
    return {
      title: `${dataset.name} | Aryorithm Hub`,
      description: dataset.short_description.slice(0, 160),
    };
  } catch {
    return { title: "Research Dataset | Aryorithm Hub" };
  }
}

export default async function DatasetPage({ params }: Props) {
  let dataset;
  try {
    dataset = await library.dataset(params.slug);
  } catch {
    notFound();
  }
  return <DatasetDetailView dataset={dataset} />;
}
