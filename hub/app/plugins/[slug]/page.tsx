import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PluginDetailView from "@/components/hub/PluginDetailView";
import { hub } from "@/lib/hub";

interface Props {
  params: { slug: string };
}

async function load(slug: string) {
  const [detail, versions] = await Promise.all([hub.detail(slug), hub.versions(slug)]);
  const active = versions.versions.find((v) => !v.yanked) ?? versions.versions[0];
  const [readme, manifest, security] = await Promise.all([
    hub.readme(slug, active?.version).catch(() => ({ version: active?.version ?? "", content_markdown: "" })),
    hub.manifest(slug, active?.version).catch(() => ({ version: active?.version ?? "", raw_yaml: "", parsed_json: {} })),
    active ? hub.security(slug, active.version).catch(() => null) : Promise.resolve(null),
  ]);
  return { detail, readme, manifest, versions: versions.versions, security };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const detail = await hub.detail(params.slug);
    const version = detail.active_version?.version;
    return {
      title: `${detail.title}${version ? ` ${version}` : ""} | Aryorithm Hub`,
      description: detail.short_description.slice(0, 160),
    };
  } catch {
    return { title: "Extension | Aryorithm Hub" };
  }
}

export default async function PluginPage({ params }: Props) {
  let data;
  try {
    data = await load(params.slug);
  } catch {
    notFound();
  }
  return (
    <PluginDetailView
      detail={data.detail}
      readmeMarkdown={data.readme.content_markdown}
      manifestYaml={data.manifest.raw_yaml}
      versions={data.versions}
      security={data.security}
    />
  );
}
