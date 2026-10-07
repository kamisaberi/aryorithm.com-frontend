import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { allDocs, sectionLabel } from "@/lib/xinfer-docs";

export const metadata: Metadata = {
  title: "xInfer Essential Documentation | Aryorithm",
  description:
    "xinfer-essential docs: setup, 15 silicon backends, memory model, plugins, API reference, and benchmarks.",
};

export default function XinferDocsIndexPage() {
  const docs = allDocs();
  const home = docs.find((d) => d.slug.length === 0);
  const seen: string[] = [];
  for (const d of docs) {
    if (d.slug.length > 0 && !seen.includes(d.section)) seen.push(d.section);
  }
  const groups = seen.map((section) => ({
    section,
    items: docs.filter((d) => d.section === section),
  }));

  return (
    <>
      <section id="docs-xinfer-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Documentation", to: "/docs" }, { label: "xInfer Essential" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> libxinfer.so · Full Manual <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            xInfer Essential Documentation.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            {home ? `${docs.length - 1} guides` : "Guides"} across setup, architecture, all 15 silicon backends, memory
            management, plugins, ModelHub, API reference, tutorials, benchmarks, and troubleshooting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/docs/xinfer-essential/getting-started/overview" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Start Reading ]
            </Link>
            <Link href="/projects/xinfer-essential" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Product Page ]
            </Link>
          </div>
        </div>
      </section>

      <section id="docs-xinfer-index" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map(({ section, items }) => (
            <div key={section} className="rounded-md border border-hairline bg-panel p-6">
              <h2 className="font-display text-[16px] font-bold text-cyan">{sectionLabel(section)}</h2>
              <p className="mt-1 font-mono text-[10.5px] text-muted">{items.length} guides</p>
              <ul className="mt-4 space-y-2">
                {items.map((d) => (
                  <li key={d.file}>
                    <Link href={`/docs/xinfer-essential/${d.slug.join("/")}`} className="link-underline text-[12.5px] text-muted transition-colors hover:text-cyan">
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
