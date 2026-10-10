import React from "react";

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-${i++}`} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <code
          key={`${keyPrefix}-${i++}`}
          className="rounded bg-void px-1 py-0.5 font-mono text-[12px] text-kernel"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      const sep = tok.indexOf("](");
      if (sep < 0) {
        parts.push(tok);
      } else {
        const label = tok.slice(1, sep);
        const href = tok.slice(sep + 2, -1);
        const external = /^https?:\/\//.test(href);
        parts.push(
          <a
            key={`${keyPrefix}-${i++}`}
            href={href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="text-cyan hover:underline"
          >
            {label}
          </a>
        );
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Minimal readme renderer: headings, bold, code, links, lists. */
export default function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];

  const flushFence = () => {
    const code = fenceBuf.join("\n");
    out.push(
      <div key={key++} className="overflow-hidden rounded-md border border-hairline bg-panel">
        {fenceLang && (
          <div className="border-b border-hairline bg-void/70 px-4 py-2 font-mono text-[10.5px] text-muted">
            {fenceLang}
          </div>
        )}
        <pre className="code-fade overflow-x-auto bg-void p-4 font-mono text-[11.5px] leading-[1.75] text-ink">
          <code>{code}</code>
        </pre>
      </div>
    );
    fenceBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceLang = fence[1] || "";
      } else {
        inFence = false;
        flushFence();
      }
      i++;
      continue;
    }
    if (inFence) {
      fenceBuf.push(line);
      i++;
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^(#{1,3})/)![1].length;
      const text = line.replace(/^#{1,3}\s+/, "");
      const cls =
        level === 1
          ? "font-display text-[22px] font-bold text-ink"
          : level === 2
            ? "mt-2 font-display text-[17px] font-bold text-ink"
            : "mt-1 font-display text-[14px] font-bold text-ink";
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      out.push(
        <Tag key={key++} className={cls}>
          {inline(text, `h${key}`)}
        </Tag>
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={key++} className="space-y-1.5">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 text-[13px] leading-[1.8] text-muted">
              <span className="text-cyan">·</span>
              <span>{inline(it, `b${key}-${ii}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={key++} className="list-decimal space-y-1.5 pl-6">
          {items.map((it, ii) => (
            <li key={ii} className="text-[13px] leading-[1.8] text-muted">
              {inline(it, `n${key}-${ii}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.trim() === "" || line.trim() === "---") {
      if (line.trim() === "---") out.push(<hr key={key++} className="border-hairline" />);
      i++;
      continue;
    }
    const para = line;
    i++;
    out.push(
      <p key={key++} className="text-[13.5px] leading-[1.85] text-muted">
        {inline(para, `p${key}`)}
      </p>
    );
  }
  return <div className="space-y-4">{out}</div>;
}
