import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import CodeViewer from "@/components/ui/CodeViewer";
import { StatStrip } from "@/components/ui/StatusBadge";
import { FastPathDiagram, IdentityEngine, RingVisual } from "@/components/simulations/FastPathSim";
import BlackboxDives from "@/components/simulations/BlackboxDives";
import { RING_SNIPPET, XDP_SNIPPET } from "@/data/blackbox";

export const metadata: Metadata = {
  title: "Blackbox Core — Tier 2 Kernel Engine | Aryorithm",
  description: "Linux eBPF/XDP kernel interception, lock-free thread IPC, and adaptive hardware attestation at wire speed.",
};

export default function BlackboxPage() {
  return (
    <>
      <section id="blackbox-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Technology" }, { label: "Blackbox Core" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Tier 2 Kernel Engine <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Blackbox Core (libblackbox.so): <span className="text-cyan text-glow">Driver-Level Mitigation.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Linux eBPF/XDP kernel interception, lock-free thread IPC, and adaptive hardware attestation engine operating
            at pure wire-speed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/blackbox#fast-path" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ Trace A Frame To XDP_DROP ]
            </Link>
            <Link href="/technology/blackbox#kernel-deep-dives" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Read Kernel Internals ]
            </Link>
          </div>
          <div className="mt-8 grid max-w-4xl gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-hairline bg-panel p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Interception Depth · Linux Network Stack</p>
              <ul className="mt-3 space-y-1.5 font-mono text-[11px]">
                {[
                  ["Application socket — too late", false, false],
                  ["TCP / IP stack — too late", false, false],
                  ["Netfilter / iptables — sk_buff exists", false, false],
                  ["Traffic Control (tc) — sk_buff exists", false, false],
                  ["XDP driver hook — BLACKBOX CORE", true, false],
                  ["NIC driver ring — wire", true, true],
                ].map(([l, hot, wire]) => (
                  <li key={l as string} className={hot ? "text-kernel" : "text-muted"}>
                    {hot ? "▸" : "·"} {l as string}{wire ? " · wire" : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-hairline bg-panel p-5">
              <StatStrip items={[["Drop Path", "0.84 µs", "#00FFA3"], ["sk_buff", "never", "#00E5FF"], ["Line Rate", "10GbE"]]} />
              <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-muted">
                The verdict executes before the kernel allocates a socket buffer. Everything above XDP is forensics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="fast-path" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Six-Stage Fast Path"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Frame Lifecycle To XDP_DROP.</h2>
        <div className="mt-6">
          <FastPathDiagram />
        </div>
      </section>

      <section id="kernel-deep-dives" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Kernel Deep Dives"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Internals, With Source.</h2>
        <div className="mt-6">
          <BlackboxDives />
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <CodeViewer code={XDP_SNIPPET} lang="cpp" filename="kernel/xdp_filter.c — clang -O2 -target bpf -c" note="Loaded with bpf(BPF_PROG_LOAD), attached in XDP_FLAGS_DRV_MODE." />
          <CodeViewer code={RING_SNIPPET} lang="cpp" filename="include/blackbox/event_ring_buffer.hpp" note="Power-of-two capacity — slot index is a bitwise AND, never a modulo." />
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <RingVisual />
          <div className="rounded-md border border-hairline bg-panel p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Three-Tier Adaptive Hardware Identity</p>
            <div className="mt-4"><IdentityEngine /></div>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
