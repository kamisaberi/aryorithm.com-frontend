import type { Metadata } from "next";
import CopyButton from "@/components/ui/CopyButton";
import { SDK_DOCS } from "@/data/sdkDocs";

export const metadata: Metadata = {
  title: "SDK & Documentation | Aryorithm Hub",
  description:
    "Build extensions: C++20 dissector SDK, Wasm micro-rules, LuaJIT scripting, ONNX packaging, memory-safety rules.",
};

/** SDK documentation portal (§2.5): sticky nav, content, in-page TOC. */
export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
        {"// Developer Documentation & SDK"}
      </p>
      <h1 className="mt-2 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
        Build extensions that survive the fast path.
      </h1>
      <p className="mt-3 max-w-2xl text-[14.5px] leading-[1.75] text-muted">
        One track per runtime engine — pick yours and ship.
      </p>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-60">
          <nav aria-label="SDK sections" className="rounded-md border border-hairline bg-panel p-4 lg:sticky lg:top-24">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">Tracks</p>
            <ul className="mt-3 space-y-1.5">
              {SDK_DOCS.map((d) => (
                <li key={d.id}>
                  <a
                    href={`#${d.id}`}
                    className="block rounded px-2 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-cyan/[0.05] hover:text-cyan"
                  >
                    {d.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          {SDK_DOCS.map((d) => (
            <article key={d.id} id={d.id} className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6">
              <h2 className="font-display text-[19px] font-bold text-ink">{d.title}</h2>
              <p className="mt-2 text-[13.5px] leading-[1.8] text-muted">{d.intro}</p>
              <ul className="mt-3 space-y-1.5">
                {d.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[13px] leading-[1.8] text-muted">
                    <span className="text-cyan">·</span>
                    {p}
                  </li>
                ))}
              </ul>
              {d.snippet && (
                <div className="mt-4 overflow-hidden rounded-md border border-hairline bg-void">
                  <div className="flex items-center justify-between border-b border-hairline bg-void/70 px-4 py-2">
                    <span className="font-mono text-[10.5px] text-muted">{d.snippet.lang}</span>
                    <CopyButton text={d.snippet.code} label="Copy" />
                  </div>
                  <pre className="code-fade overflow-x-auto p-4 font-mono text-[11.5px] leading-[1.75] text-ink">
                    <code>{d.snippet.code}</code>
                  </pre>
                </div>
              )}
            </article>
          ))}
        </div>

        <aside className="hidden w-52 shrink-0 xl:block">
          <nav aria-label="On this page" className="rounded-md border border-hairline bg-panel p-4 lg:sticky lg:top-24">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">On This Page</p>
            <ul className="mt-3 space-y-1.5">
              {SDK_DOCS.map((d) => (
                <li key={d.id}>
                  <a
                    href={`#${d.id}`}
                    className="block text-[12px] leading-snug text-muted transition-colors hover:text-cyan"
                  >
                    {d.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
