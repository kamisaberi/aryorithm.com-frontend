import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Markdown from "@/components/docs/Markdown";
import { allDocs, readDoc, SECTIONS, sectionLabel } from "@/lib/blackbox-docs";

export function generateStaticParams() {
  const fileSlugs = allDocs()
    .filter((d) => d.slug.length > 0)
    .map((d) => ({ slug: d.slug }));
  const sectionSlugs = SECTIONS.map((s) => ({ slug: [s.slug] }));
  return [...fileSlugs, ...sectionSlugs];
}

export function generateMetadata({ params }: { params: { slug: string[] } }): Metadata {
  const doc = readDoc(params.slug);
  const title = doc ? doc.title : "Not Found";
  return {
    title: `${title} — Blackbox Essential Docs | Aryorithm`,
    description: `Blackbox Essential documentation: ${title}.`,
  };
}

export default function BlackboxDocPage({ params }: { params: { slug: string[] } }) {
  const doc = readDoc(params.slug);
  if (!doc) notFound();

  const docs = allDocs().filter((d) => d.slug.length > 0);
  const idx = docs.findIndex((d) => d.slug.join("/") === params.slug.join("/"));
  const prev = idx > 0 ? docs[idx - 1] : null;
  const next = idx >= 0 && idx < docs.length - 1 ? docs[idx + 1] : null;
  const section = params.slug[0];
  const siblings = docs.filter((d) => d.section === section);

  return (
    <>
      <section id="doc-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-14 lg:px-8">
          <Breadcrumb
            trail={[
              { label: "Documentation", to: "/docs" },
              { label: "Blackbox Essential", to: "/docs/blackbox-essential" },
              { label: doc.title },
            ]}
          />
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
            {"// "}{sectionLabel(section)}
          </p>
          <h1 className="mt-2 max-w-4xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
            {doc.title}
          </h1>
        </div>
      </section>

      <section id="doc-body" className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <article className="min-w-0 flex-1 rounded-md border border-hairline bg-panel p-6 sm:p-8">
            <Markdown source={doc.body} />
            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-hairline pt-5">
              <div className="min-w-0 flex-1">
                {prev && (
                  <Link href={`/docs/blackbox-essential/${prev.slug.join("/")}`} className="block truncate font-mono text-[11.5px] text-muted transition-colors hover:text-cyan">
                    ← {prev.title}
                  </Link>
                )}
              </div>
              <div className="min-w-0 flex-1 text-right">
                {next && (
                  <Link href={`/docs/blackbox-essential/${next.slug.join("/")}`} className="block truncate font-mono text-[11.5px] text-muted transition-colors hover:text-cyan">
                    {next.title} →
                  </Link>
                )}
              </div>
            </div>
          </article>
          <aside className="w-full shrink-0 lg:w-64 xl:w-72">
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-md border border-hairline bg-panel p-4">
                <h3 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">This Section</h3>
                <ul className="mt-3 space-y-2">
                  {siblings.map((d) => {
                    const active = d.slug.join("/") === params.slug.join("/");
                    return (
                      <li key={d.file}>
                        <Link
                          href={`/docs/blackbox-essential/${d.slug.join("/")}`}
                          className={`block text-[12.5px] leading-snug transition-colors ${active ? "text-cyan" : "text-muted hover:text-cyan"}`}
                        >
                          {d.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Link
                href="/docs/blackbox-essential"
                className="block rounded-md bg-cyan px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
              >
                All Guides
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
