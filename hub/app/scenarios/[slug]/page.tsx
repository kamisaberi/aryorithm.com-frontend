import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ScenarioDetailView from "@/components/hub/ScenarioDetailView";
import { library } from "@/lib/hub";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const scenario = await library.scenario(params.slug);
    return {
      title: `${scenario.name} | Aryorithm Hub`,
      description: scenario.short_description.slice(0, 160),
    };
  } catch {
    return { title: "Twin Scenario | Aryorithm Hub" };
  }
}

export default async function ScenarioPage({ params }: Props) {
  let scenario;
  try {
    scenario = await library.scenario(params.slug);
  } catch {
    notFound();
  }
  return <ScenarioDetailView scenario={scenario} />;
}
