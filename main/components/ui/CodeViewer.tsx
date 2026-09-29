type SyntaxKind = "comment" | "string" | "preproc" | "keyword" | "number" | "type" | "key" | "punct" | "plain";

const SYNTAX: Record<string, Record<string, RegExp>> = {
  cpp: {
    comment: /\/\/[^\n]*/,
    string: /"(?:[^"\\]|\\.)*"|<[A-Za-z0-9_./]+>(?=\s*$)/,
    preproc: /^\s*#\s*[a-z]+/,
    keyword: /\b(?:auto|const|constexpr|namespace|using|return|if|else|for|while|struct|class|public|private|void|int|size_t|uint8_t|uint16_t|uint32_t|uint64_t|float|double|bool|true|false|nullptr|static|inline|noexcept|template|typename|co_await|span|expected)\b/,
    number: /\b\d+(?:\.\d+)?(?:[uUlLfF]|us|ms|ns)?\b/,
    type: /\b(?:xinfer|blackbox|Engine|Tensor|DmaBuffer|InferenceRequest|Backend|Status|std|chrono|vector|string_view|array)\b/,
    punct: /[{}()[\];,<>:&*=+\-/.!|]/,
  },
  yaml: {
    comment: /#[^\n]*/,
    key: /^\s*-?\s*[A-Za-z0-9_.-]+(?=\s*:)/,
    string: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
    number: /\b\d+(?:\.\d+)?\b/,
    keyword: /\b(?:true|false|null|required|abort|pass)\b/,
    punct: /[:\-[\]{},]/,
  },
};

const SYNTAX_COLORS: Record<SyntaxKind, string> = {
  comment: "#5A6B82",
  string: "#00FFA3",
  preproc: "#FFB800",
  keyword: "#00E5FF",
  number: "#FFB800",
  type: "#F0F4F8",
  key: "#00E5FF",
  punct: "#8A99AD",
  plain: "#C3CEDB",
};

function highlightLine(line: string, lang?: string): { text: string; kind: SyntaxKind }[] {
  const rules = (lang && SYNTAX[lang]) || null;
  if (!rules) return [{ text: line, kind: "plain" }];
  const order = Object.keys(rules);
  const out: { text: string; kind: SyntaxKind }[] = [];
  let rest = line;
  let guard = 0;
  while (rest.length && guard++ < 400) {
    let best: { index: number; text: string; kind: SyntaxKind } | null = null;
    for (const kind of order) {
      const m = rules[kind].exec(rest);
      if (m && m[0].length && (best === null || m.index < best.index)) {
        best = { index: m.index, text: m[0], kind: kind as SyntaxKind };
        if (m.index === 0) break;
      }
    }
    if (!best) {
      out.push({ text: rest, kind: "plain" });
      break;
    }
    if (best.index > 0) out.push({ text: rest.slice(0, best.index), kind: "plain" });
    out.push({ text: best.text, kind: best.kind });
    rest = rest.slice(best.index + best.text.length);
  }
  return out;
}

export default function CodeViewer({
  code,
  lang,
  filename,
  note,
}: {
  code: string;
  lang?: string;
  filename: string;
  note?: string;
}) {
  const lines = code.replace(/\s+$/, "").split("\n");
  return (
    <figure className="m-0 overflow-hidden rounded-md border border-hairline bg-panel">
      <figcaption className="flex items-center gap-3 border-b border-hairline bg-void/70 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-threat/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-telemetry/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-kernel/70" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted">{filename}</span>
      </figcaption>
      <div className="terminal-scroll overflow-x-auto bg-void">
        <pre className="m-0 px-0 py-3 font-mono text-[11.5px] leading-[1.75] sm:text-[12px]">
          <code>
            {lines.map((line, li) => (
              <div key={li} className="flex px-4 hover:bg-cyan/[0.03]">
                <span className="tabular mr-4 w-[22px] shrink-0 select-none text-right text-muted/45" aria-hidden="true">
                  {li + 1}
                </span>
                <span className="whitespace-pre">
                  {highlightLine(line, lang).map((tok, ti) => (
                    <span key={ti} style={{ color: SYNTAX_COLORS[tok.kind] ?? SYNTAX_COLORS.plain }}>
                      {tok.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
      {note && <div className="border-t border-hairline bg-void/60 px-4 py-2.5 font-mono text-[10px] text-muted">{note}</div>}
    </figure>
  );
}
