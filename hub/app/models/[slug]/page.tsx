import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ModelDetailView from "@/components/hub/ModelDetailView";
import { vault } from "@/lib/hub";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const model = await vault.detail(params.slug);
    return {
      title: `${model.name} | Aryorithm Hub`,
      description: model.short_description.slice(0, 160),
    };
  } catch {
    return { title: "AI Model | Aryorithm Hub" };
  }
}

export default async function ModelPage({ params }: Props) {
  let model;
  try {
    model = await vault.detail(params.slug);
  } catch {
    notFound();
  }
  return <ModelDetailView model={model} />;
}
