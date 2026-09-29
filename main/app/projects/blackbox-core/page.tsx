import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import PageSidebar from "@/components/layout/PageSidebar";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Blackbox Core — eBPF/XDP Kernel Mitigation Engine | Aryorithm",
  description: "libblackbox.so — the kernel-level fast-path inspection and mitigation engine. 0.84µs worst-case drop latency using XDP hooks and AF_XDP zero-copy drivers.",
};

export default function BlackboxCorePage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Blackbox Core" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Tier 2 Kernel Engine <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Blackbox Core
          </h1>
          <p className="mt-2 font-mono text-[13px] text-cyan">eBPF/XDP Kernel Mitigation Engine</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            libblackbox.so — the kernel-level fast-path inspection and mitigation engine. Achieves 0.84µs worst-case
            drop latency using XDP hooks and AF_XDP zero-copy drivers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/technology/blackbox" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Technology ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v2.8.3"], ["Drop Latency", "0.84 µs"], ["Kernel Support", "5.15–6.11"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What Is Blackbox Core?</h2>
            <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
              <p>
                Blackbox Core is the kernel-level engine that powers Blackbox Sentinel's fast-path mitigation. It operates
                at the XDP (eXpress Data Path) layer — the earliest possible point in the Linux kernel networking stack —
                where frames are inspected and dropped before they reach the TCP/IP stack.
              </p>
              <p>
                The engine is implemented as a set of eBPF (extended Berkeley Packet Filter) programs that are loaded into
                the kernel and attached to network interfaces. These programs run in a sandboxed virtual machine within
                the kernel, with the BPF verifier ensuring memory safety and termination guarantees.
              </p>
              <p>
                The AF_XDP zero-copy driver provides a high-performance path for frames that need deeper inspection.
                Captured frames are mapped directly into userspace via UMEM (user memory) rings, eliminating the
                traditional kernel-to-userspace copy overhead.
              </p>
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Overview", href: "#overview" },
                  { label: "Fast-Path Architecture", href: "#fast-path" },
                  { label: "Verifier Compatibility", href: "#verifier" },
                  { label: "AF_XDP Zero-Copy", href: "#af-xdp" },
                  { label: "Performance Metrics", href: "#metrics" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "xInfer Engine", href: "/projects/xinfer-engine", meta: "v4.2.0" },
                  { label: "Sentinel-Lab", href: "/projects/sentinel-lab", meta: "v2.4.0" },
                ],
              },
            ]}
            cta={{ label: "View Technology", href: "/technology/blackbox" }}
          />
        </div>
      </section>

      <section id="fast-path" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Fast-Path Architecture"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Frame Lifecycle To XDP_DROP.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            When a frame arrives at the network interface, the XDP hook is the first code to execute. Blackbox Core's
            XDP program performs a series of checks in a strict order, designed to minimize the number of instructions
            executed for each frame.
          </p>
          <p>
            <span className="text-ink">Stage 1 — L2/L3 header validation:</span> The program validates Ethernet and IP
            headers, checking for malformed packets, invalid lengths, and known-bad source addresses. This stage
            drops the majority of malicious frames.
          </p>
          <p>
            <span className="text-ink">Stage 2 — Protocol dissector dispatch:</span> For frames that pass Stage 1,
            the appropriate protocol dissector is invoked. Each dissector is a separate eBPF program that can be
            loaded and unloaded independently.
          </p>
          <p>
            <span className="text-ink">Stage 3 — Physical constraint validation:</span> The dissector checks the
            command against the physical constraint map. If the commanded state is mechanically impossible for the
            target equipment, the frame is dropped.
          </p>
          <p>
            <span className="text-ink">Stage 4 — AF_XDP handoff:</span> For frames that require deeper inspection
            (e.g., payload analysis, ML inference), the frame is handed off to userspace via the AF_XDP zero-copy
            ring. This is the only stage that involves userspace, and it is used for a small fraction of frames.
          </p>
        </div>
      </section>

      <section id="verifier" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Verifier Compatibility"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Kernel 5.15 Through 6.11.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The BPF verifier is the kernel component that ensures eBPF programs are memory-safe and guaranteed to
            terminate. Verifier behavior changes between kernel versions — new checks are added, helper function
            signatures change, and map type restrictions evolve.
          </p>
          <p>
            Blackbox Core maintains a verifier-compatibility test suite that validates every BPF program we ship
            across kernel versions 5.15 through 6.11. This suite includes 2,400+ test cases covering verifier
            behavior, map types, helper functions, and program types.
          </p>
          <p>
            The suite has caught real bugs: verifier behavior changes between kernel versions, helper function
            signature changes, and map type restrictions that differ across distributions. We open-sourced this suite
            because the ecosystem needs a shared conformance baseline.
          </p>
        </div>
      </section>

      <section id="af-xdp" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// AF_XDP Zero-Copy"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Zero-Copy Packet Path.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            AF_XDP is a Linux kernel socket type that provides zero-copy access to network frames at the driver
            level. Blackbox Core uses AF_XDP to hand off frames that require deeper inspection to userspace without
            the traditional kernel-to-userspace copy overhead.
          </p>
          <p>
            The UMEM (user memory) area is a shared memory region mapped into both kernel and userspace. Frames are
            placed into UMEM rings by the kernel and read directly by userspace — no copies, no syscalls, no
            context switches on the hot path.
          </p>
          <p>
            This architecture achieves 2.3M frames/second on a single core, compared to 340K for traditional AF_PACKET
            and 890K for DPDK on the same hardware. The zero-copy path is what makes sub-millisecond mitigation
            possible even for frames that require userspace inspection.
          </p>
        </div>
      </section>

      <section id="metrics" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Performance Metrics"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Measured, Not Averaged.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { metric: "0.84 µs", label: "Worst-Case Drop", desc: "Hard upper bound, not average" },
            { metric: "2.3M fps", label: "AF_XDP Throughput", desc: "Frames per second, single core" },
            { metric: "0", label: "Heap Allocations", desc: "On the XDP hot path" },
            { metric: "14", label: "Instructions", desc: "Typical XDP program size" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-hairline bg-panel p-5 text-center">
              <p className="font-display text-[28px] font-bold text-cyan">{s.metric}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">{s.label}</p>
              <p className="mt-1 text-[11px] text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
