import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { HELP_CATEGORIES, getHelpCategory, getHelpArticle } from "@/data/help";

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  return HELP_CATEGORIES.flatMap((category) =>
    category.articles.map((article) => ({
      category: category.id,
      slug: article.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getHelpArticle(category, slug);
  if (!article) return {};
  return {
    title: `${article.title} | Aryorithm Help Center`,
    description: article.content.slice(0, 160).replace(/[#*`]/g, ""),
  };
}

function HelpSidebar({ activeCategory, activeSlug }: { activeCategory: string; activeSlug: string }) {
  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="sticky top-24 space-y-1">
        {HELP_CATEGORIES.map((category) => {
          const isActive = category.id === activeCategory;
          return (
            <div key={category.id}>
              <Link
                href={`/help/${category.id}/${category.articles[0].slug}`}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive ? "bg-cyan/10 text-cyan" : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded text-[11px]"
                  style={{ backgroundColor: category.color + "18", color: category.color }}
                >
                  {category.icon === "rocket" && "🚀"}
                  {category.icon === "download" && "📥"}
                  {category.icon === "settings" && "⚙️"}
                  {category.icon === "warning" && "⚠️"}
                  {category.icon === "code" && "💻"}
                  {category.icon === "shield" && "🛡️"}
                  {category.icon === "credit-card" && "💳"}
                  {category.icon === "book" && "📖"}
                </span>
                {category.name}
              </Link>
              {isActive && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-hairline pl-3">
                  {category.articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/help/${category.id}/${article.slug}`}
                      className={`block rounded px-2 py-1.5 text-[12px] transition-colors ${
                        article.slug === activeSlug
                          ? "bg-cyan/10 font-medium text-cyan"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default async function HelpArticlePage({ params }: Props) {
  const { category, slug } = await params;
  const categoryData = getHelpCategory(category);
  const article = getHelpArticle(category, slug);

  if (!categoryData || !article) notFound();

  const categoryArticles = categoryData.articles;
  const currentIndex = categoryArticles.findIndex((a) => a.slug === slug);
  const prevArticle = currentIndex > 0 ? categoryArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : null;

  return (
    <>
      <section id="help-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-8 pt-14 lg:px-8">
          <Breadcrumb trail={[
            { label: "Support", to: "/support" },
            { label: "Help Center", to: "/help" },
            { label: categoryData.name },
            { label: article.title },
          ]} />
        </div>
      </section>

      <section id="help-content" className="mx-auto max-w-[1400px] px-5 pb-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <HelpSidebar activeCategory={category} activeSlug={slug} />

          <div className="min-w-0 flex-1">
            <article className="rounded-md border border-hairline bg-panel p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span
                  className="rounded-md border border-hairline px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em]"
                  style={{ color: categoryData.color }}
                >
                  {categoryData.name}
                </span>
              </div>
              <h1 className="mt-4 font-display text-[24px] font-bold leading-tight text-ink lg:text-[30px]">
                {article.title}
              </h1>
              <div className="mt-6 space-y-4">
                {article.content.split("\n\n").map((paragraph, i) => {
                  if (paragraph.startsWith("## ")) {
                    return (
                      <h2 key={i} className="mt-8 font-display text-[18px] font-bold text-ink">
                        {paragraph.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith("### ")) {
                    return (
                      <h3 key={i} className="mt-6 font-display text-[15px] font-bold text-ink">
                        {paragraph.replace("### ", "")}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith("- ") || paragraph.startsWith("1. ") || paragraph.startsWith("2. ") || paragraph.startsWith("3. ") || paragraph.startsWith("4. ") || paragraph.startsWith("5. ")) {
                    const items = paragraph.split("\n").filter((line) => line.trim());
                    return (
                      <ul key={i} className="space-y-2">
                        {items.map((item, j) => (
                          <li key={j} className="flex gap-2 text-[14px] leading-relaxed text-muted">
                            <span className="mt-0.5 text-cyan">•</span>
                            <span>{item.replace(/^[-\d.]\s*/, "")}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (paragraph.startsWith("|")) {
                    const rows = paragraph.split("\n").filter((row) => row.trim() && !row.includes("---"));
                    const isHeader = rows[0]?.includes("---");
                    const headerRow = isHeader ? rows[0] : null;
                    const dataRows = isHeader ? rows.slice(1) : rows;
                    return (
                      <div key={i} className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                          {headerRow && (
                            <thead>
                              <tr className="border-b border-hairline">
                                {headerRow.split("|").filter((cell) => cell.trim()).map((cell, j) => (
                                  <th key={j} className="px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
                                    {cell.trim()}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {dataRows.map((row, j) => (
                              <tr key={j} className="border-b border-hairline/50">
                                {row.split("|").filter((cell) => cell.trim()).map((cell, k) => (
                                  <td key={k} className="px-3 py-2 text-muted">
                                    {cell.trim()}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  if (paragraph.startsWith("```")) {
                    const code = paragraph.replace(/```\w*\n?/g, "").replace(/```$/g, "");
                    return (
                      <pre key={i} className="overflow-x-auto rounded-md border border-hairline bg-void p-4 font-mono text-[12px] leading-relaxed text-muted">
                        {code}
                      </pre>
                    );
                  }
                  return (
                    <p key={i} className="text-[14px] leading-[1.85] text-muted">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </article>

            <div className="mt-6 flex items-center justify-between">
              {prevArticle ? (
                <Link
                  href={`/help/${category}/${prevArticle.slug}`}
                  className="rounded-md border border-hairline px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  ← {prevArticle.title}
                </Link>
              ) : <span />}
              {nextArticle ? (
                <Link
                  href={`/help/${category}/${nextArticle.slug}`}
                  className="rounded-md border border-hairline px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  {nextArticle.title} →
                </Link>
              ) : <span />}
            </div>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
