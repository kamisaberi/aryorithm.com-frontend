import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { NEWS_ITEMS, getNewsBySlug } from "@/data/news";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return NEWS_ITEMS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getNewsBySlug(slug);
  if (!item) return {};
  return {
    title: `${item.title} | Aryorithm News`,
    description: item.excerpt,
  };
}

export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params;
  const item = getNewsBySlug(slug);

  if (!item) notFound();

  const related = NEWS_ITEMS.filter((n) => n.slug !== slug).slice(0, 3);

  return (
    <>
      <section id="post-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "News", to: "/news" }, { label: item.title }]} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className="rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em]"
              style={{ color: item.color }}
            >
              {item.category}
            </span>
            <span className="font-mono text-[10.5px] text-muted">{item.date}</span>
            <span className="font-mono text-[10.5px] text-muted">·</span>
            <span className="font-mono text-[10.5px] text-muted">{item.readTime}</span>
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-[28px] font-bold leading-tight text-ink sm:text-[36px]">
            {item.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">{item.excerpt}</p>
          <div className="mt-6 flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md font-display text-[12px] font-bold"
              style={{ backgroundColor: item.color + "18", color: item.color }}
            >
              {item.author.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="font-mono text-[11px] text-ink">{item.author}</p>
              <p className="font-mono text-[10px] text-muted">Aryorithm Technologies</p>
            </div>
          </div>
        </div>
      </section>

      <section id="post-body" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="max-w-3xl">
          {item.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="mb-5 text-[14.5px] leading-[1.85] text-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section id="related" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Related"}</p>
        <h2 className="mt-2 font-display text-[20px] font-bold text-ink">More From Aryorithm.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {related.map((r) => (
            <Link
              key={r.slug}
              href={`/news/${r.slug}`}
              className="rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/40"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: r.color }}>
                {r.category}
              </span>
              <h3 className="mt-2 font-display text-[14px] font-bold leading-snug text-ink">{r.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{r.excerpt.slice(0, 100)}…</p>
            </Link>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
