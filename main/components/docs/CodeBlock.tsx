import React from "react";

type Fam = "c" | "js" | "py" | "sh" | "yaml" | "json" | "ini";

const FAMILY: Record<string, Fam> = {
  c: "c",
  h: "c",
  cpp: "c",
  "c++": "c",
  cc: "c",
  protobuf: "c",
  proto: "c",
  js: "js",
  javascript: "js",
  ts: "js",
  typescript: "js",
  py: "py",
  python: "py",
  sh: "sh",
  bash: "sh",
  shell: "sh",
  console: "sh",
  dockerfile: "sh",
  cmake: "sh",
  nginx: "sh",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  toml: "ini",
};

const KEYWORDS: Record<Fam, string[]> = {
  c: [
    "const", "static", "extern", "inline", "void", "int", "char", "float", "double",
    "long", "short", "unsigned", "signed", "struct", "union", "enum", "class",
    "public", "private", "protected", "virtual", "template", "typename", "namespace",
    "return", "if", "else", "for", "while", "do", "switch", "case", "break",
    "continue", "sizeof", "new", "delete", "true", "false", "nullptr", "using",
    "auto", "bool", "volatile", "register", "typedef",
  ],
  js: [
    "function", "const", "let", "var", "return", "if", "else", "for", "while",
    "do", "switch", "case", "break", "continue", "new", "true", "false", "null",
    "undefined", "import", "export", "from", "default", "await", "async", "try",
    "catch", "throw", "typeof", "in", "of", "this", "class", "extends",
  ],
  py: [
    "def", "class", "return", "if", "elif", "else", "for", "while", "import",
    "from", "as", "True", "False", "None", "and", "or", "not", "in", "is",
    "lambda", "pass", "raise", "try", "except", "finally", "with", "yield",
    "global", "assert", "del",
  ],
  sh: [
    "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "in",
    "function", "return", "exit", "export", "case", "esac", "select", "until",
    "sudo", "apt", "echo",
  ],
  yaml: ["true", "false", "null", "yes", "no", "on", "off"],
  json: ["true", "false", "null"],
  ini: [],
};

const STR = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`;
const NUM = String.raw`\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`;

function patternFor(fam: Fam): { re: RegExp; cls: string[] } {
  const kw = KEYWORDS[fam];
  const kwAlt = kw.length ? `\\b(?:${kw.join("|")})\\b` : "(?!)";
  switch (fam) {
    case "c":
    case "js":
      return {
        re: new RegExp(
          `(^[ \\t]*#[^\\n]*)|(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)|(${STR})|(${kwAlt})|(${NUM})`,
          "gm",
        ),
        cls: ["text-threat", "text-muted", "text-kernel", "text-cyan", "text-telemetry"],
      };
    case "py":
      return {
        re: new RegExp(`(#[^\\n]*)|(${STR})|(${kwAlt})|(${NUM})`, "gm"),
        cls: ["text-muted", "text-kernel", "text-cyan", "text-telemetry"],
      };
    case "sh":
      return {
        re: new RegExp(`(#[^\\n]*)|(${STR})|(\\$\\{[^}]*\\}|\\$[A-Za-z_][A-Za-z0-9_]*)|(${kwAlt})|(${NUM})`, "gm"),
        cls: ["text-muted", "text-kernel", "text-telemetry", "text-cyan", "text-telemetry"],
      };
    case "yaml":
      return {
        re: new RegExp(
          `(#[^\\n]*)|(${STR})|(^[ \\t]*(?:- +)?[A-Za-z0-9_.\\-/]+)(?=:\\s|:$)|(${kwAlt})|(${NUM})`,
          "gm",
        ),
        cls: ["text-muted", "text-kernel", "text-cyan", "text-cyan", "text-telemetry"],
      };
    case "json":
      return {
        re: new RegExp(`(${STR})|(${kwAlt})|(${NUM})`, "gm"),
        cls: ["text-kernel", "text-cyan", "text-telemetry"],
      };
    case "ini":
      return {
        re: new RegExp(`([;#][^\\n]*)|(^[ \\t]*\\[[^\\]\\n]+\\])|(${STR})|(${NUM})`, "gm"),
        cls: ["text-muted", "text-cyan", "text-kernel", "text-telemetry"],
      };
  }
}

/** Split code into colored spans. Unknown languages render plain. */
export function highlight(code: string, lang: string): React.ReactNode[] {
  const fam = FAMILY[(lang || "").toLowerCase()];
  if (!fam) return [code];
  const { re, cls } = patternFor(fam);
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const gi = m.slice(1).findIndex((g) => g !== undefined);
    out.push(
      <span key={i++} className={cls[gi]}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
    // Guard against zero-length matches stalling the scan.
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export default function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <pre className="overflow-x-auto bg-void p-4 font-mono text-[11.5px] leading-[1.75] text-ink">
      <code>{highlight(code, lang)}</code>
    </pre>
  );
}
