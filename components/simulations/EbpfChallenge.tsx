"use client";

import { useState } from "react";
import Link from "next/link";
import CodeViewer from "@/components/ui/CodeViewer";
import { BUGGY_CODE, FIXED_CODE, VERIFIER_FAIL, VERIFIER_PASS } from "@/data/team";

export default function EbpfChallenge() {
  const [patched, setPatched] = useState(false);
  const [inspected, setInspected] = useState(false);

  return (
    <div id="ebpf-challenge" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6 lg:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// The eBPF Terminal Challenge"}</p>
      <h3 className="mt-2 font-display text-[20px] font-bold text-ink">Find The Memory Hazard. Earn The Interview.</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        Hazard <span className="font-mono text-[12px] text-telemetry">EBPF-XDP-2026</span> — a real class of bug. Inspect
        the hazard, then apply the alignment fix.
      </p>

      <div className="mt-5">
        <CodeViewer
          key={patched ? "fixed" : "buggy"}
          code={patched ? FIXED_CODE : BUGGY_CODE}
          lang="cpp"
          filename={patched ? "kernel/xdp_parse.c — PATCHED" : "kernel/xdp_parse.c — CANDIDATE EXERCISE"}
          note={
            patched
              ? "Pointers re-loaded after adjust_head · bounds checks prove safety · memcpy avoids unaligned access."
              : "Two defects present: a stale packet pointer and an unaligned 32-bit packet access."
          }
        />
      </div>

      <div
        className={`mt-4 rounded-md border px-4 py-3 font-mono text-[11.5px] leading-relaxed ${
          patched ? "border-kernel/50 text-kernel" : "border-threat/50 text-threat"
        }`}
      >
        <pre className="whitespace-pre-wrap">{patched ? VERIFIER_PASS : VERIFIER_FAIL}</pre>
      </div>

      {inspected && !patched && (
        <div className="rise-in mt-4 space-y-3 rounded-md border border-telemetry/40 bg-void/60 p-5 text-[13px] leading-relaxed text-muted">
          <p>
            <span className="font-mono text-[12px] text-telemetry">01 — Stale pointer.</span> `bpf_xdp_adjust_head`
            invalidates `data`/`data_end`. Every pointer derived before the call is garbage afterwards.
          </p>
          <p>
            <span className="font-mono text-[12px] text-telemetry">02 — Unaligned access.</span> `*(__u32
            *)&ip-&gt;saddr` assumes 4-byte alignment on a packet pointer the verifier cannot prove aligned.
          </p>
          <p>
            <span className="font-mono text-[12px] text-telemetry">03 — Missing bounds check.</span> No re-validated
            `(void *)(ip + 1) &gt; data_end` guard, so the verifier reports `off=+18 size=4` out of range.
          </p>
          <p className="text-ink">
            Why it matters: this runs in kernel context at line rate. The verifier is the only thing standing between
            a pointer mistake and a kernel panic on a substation appliance.
          </p>
        </div>
      )}

      {patched && (
        <div className="rise-in mt-4 rounded-md border border-kernel/50 bg-kernel/[0.05] p-5 text-center">
          <p className="font-mono text-[13px] font-bold text-kernel">PASS · 0 verifier errors · 0 misaligned loads</p>
          <p className="mt-2 font-mono text-[11.5px] text-muted">
            Quote code <span className="text-kernel">EBPF-XDP-2026</span> — you start at the technical round.
          </p>
          <Link
            href="mailto:careers@aryorithm.com?subject=EBPF-XDP-2026%20—%20application"
            className="mt-3 inline-block rounded-md bg-kernel px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void"
          >
            [ Apply With Code EBPF-XDP-2026 ]
          </Link>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setInspected(true)}
          disabled={patched}
          className="rounded-md border border-telemetry/60 px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-telemetry transition-colors hover:bg-telemetry/10 disabled:opacity-40"
        >
          [ Inspect Vulnerability ]
        </button>
        <button
          type="button"
          onClick={() => setPatched(true)}
          className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
        >
          [ Apply Pointer Alignment Fix ]
        </button>
        {(patched || inspected) && (
          <button
            type="button"
            onClick={() => {
              setPatched(false);
              setInspected(false);
            }}
            className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
          >
            [ Reset Challenge ]
          </button>
        )}
      </div>
    </div>
  );
}
