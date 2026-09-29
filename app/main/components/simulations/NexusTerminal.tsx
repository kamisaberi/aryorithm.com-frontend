"use client";

import { useEffect, useRef, useState } from "react";
import { CLI_COMMANDS } from "@/data/home";

interface HistLine {
  type: "sys" | "cmd" | "out";
  text: string;
  cls?: string;
}

const CLS: Record<string, string> = {
  ok: "text-kernel",
  warn: "text-telemetry",
  bad: "text-threat",
  dim: "text-muted",
  ink: "text-ink",
  acc: "text-cyan",
};

export default function NexusTerminal() {
  const [history, setHistory] = useState<HistLine[]>([
    { type: "sys", text: "nexus-ctl sandbox — interactive telemetry shell. Pick a preset or type help.", cls: "dim" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const run = (raw: string) => {
    const cmd = raw.trim().replace(/^nexus-ctl\s+/, "");
    const full = raw.trim().startsWith("nexus-ctl") ? raw.trim() : `nexus-ctl ${raw.trim()}`;
    if (!cmd) return;
    setHistory((h) => [...h, { type: "cmd", text: `$ ${full}` }]);
    const key = Object.keys(CLI_COMMANDS).find((k) => k === full || k === `nexus-ctl ${cmd}`);
    if (cmd === "help") {
      setHistory((h) => [...h, { type: "out", text: `available: ${Object.keys(CLI_COMMANDS).join(" | ")}`, cls: "dim" }]);
      return;
    }
    if (!key) {
      setHistory((h) => [
        ...h,
        { type: "out", text: `unknown command: ${cmd}`, cls: "bad" },
        { type: "out", text: `available: ${Object.keys(CLI_COMMANDS).join(" | ")}`, cls: "dim" },
      ]);
      return;
    }
    setBusy(true);
    let delay = 0;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    for (const line of CLI_COMMANDS[key].lines) {
      delay += line.d;
      const snapshot = line;
      timers.current.push(
        window.setTimeout(() => {
          setHistory((h) => [...h, { type: "out", text: snapshot.t, cls: snapshot.c }]);
        }, delay),
      );
    }
    timers.current.push(
      window.setTimeout(() => setBusy(false), delay + 150),
    );
  };

  return (
    <div id="nexus-cli-sandbox" className="scroll-mt-24 overflow-hidden rounded-md border border-hairline bg-panel">
      <div className="flex items-center gap-3 border-b border-hairline bg-void/70 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-threat/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-telemetry/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-kernel/70" />
        </span>
        <span className="flex-1 font-mono text-[10.5px] text-muted">nexus-ctl — live sandbox</span>
        <span className={`font-mono text-[9.5px] uppercase tracking-[0.12em] ${busy ? "text-telemetry" : "text-kernel"}`}>
          {busy ? "● streaming" : "○ idle"}
        </span>
      </div>
      <div className="grid lg:grid-cols-[220px_1fr]">
        <div className="space-y-2 border-b border-hairline bg-void/50 p-4 lg:border-b-0 lg:border-r">
          {Object.keys(CLI_COMMANDS).map((k) => (
            <button
              key={k}
              type="button"
              disabled={busy}
              onClick={() => run(k)}
              className="block w-full rounded-md border border-hairline px-3 py-2 text-left font-mono text-[10.5px] text-muted transition-colors hover:border-cyan/60 hover:text-cyan disabled:opacity-40"
            >
              <span className="block text-cyan">$ nexus-ctl {CLI_COMMANDS[k].label}</span>
              <span className="mt-0.5 block text-[10px]">{CLI_COMMANDS[k].hint}</span>
            </button>
          ))}
        </div>
        <div>
          <div ref={bodyRef} className="terminal-body h-[320px] overflow-y-auto p-4 font-mono text-[11.5px] leading-relaxed">
            {history.map((h, i) => (
              <p key={i} className={h.type === "cmd" ? "text-cyan" : CLS[h.cls ?? "ink"] ?? "text-ink"}>
                {h.text || " "}
              </p>
            ))}
            {busy && <span className="caret text-cyan">▊</span>}
          </div>
          <form
            className="flex items-center gap-2 border-t border-hairline bg-void/70 px-4 py-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) {
                run(input);
                setInput("");
              }
            }}
          >
            <span className="font-mono text-[12px] text-cyan">$</span>
            <input
              id="cli-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="nexus-ctl fleet list"
              spellCheck={false}
              className="w-full bg-transparent font-mono text-[12px] text-ink placeholder:text-muted/40 focus:outline-none disabled:opacity-40"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
