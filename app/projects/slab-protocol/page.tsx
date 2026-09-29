import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import PageSidebar from "@/components/layout/PageSidebar";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "SLAB Protocol — Zero-Allocation Binary Wire Protocol | Aryorithm",
  description: "Synchronous Lightweight Air-gapped Binary wire protocol. Fixed-size frames, zero heap allocations, deterministic serialization for air-gapped environments.",
};

export default function SlabProtocolPage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "SLAB Protocol" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-threat">[</span> Open Standard <span className="text-threat">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            SLAB Protocol
          </h1>
          <p className="mt-2 font-mono text-[13px] text-threat">Synchronous Lightweight Air-gapped Binary</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            A zero-allocation binary wire protocol for air-gapped environments. Fixed-size frames, zero heap
            allocations, deterministic serialization — designed for environments where every allocation is a liability.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/research/sentinel-lab#slab-protocol" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Specification ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v1.0.0"], ["Throughput", "2.3M fps"], ["Allocations", "0"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What Is SLAB?</h2>
            <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
              <p>
                SLAB (Synchronous Lightweight Air-gapped Binary) is a wire protocol specification designed for air-gapped
                environments where traditional serialization frameworks introduce unacceptable overhead. It is a fixed-size,
                zero-allocation binary format that achieves 2.3M frames/second on a single core.
              </p>
              <p>
                The protocol was designed for the Aryorithm appliance fleet, where inter-appliance communication must be
                deterministic, verifiable, and free of heap allocations. It has been open-sourced as a single 40-page
                specification document with reference implementations in C and Rust.
              </p>
              <p>
                SLAB is not a replacement for Protobuf or FlatBuffers in all contexts. It is a specialized tool for
                environments where the constraints of air-gapped operation — no heap, no variable-length encoding, no
                external dependencies — make traditional frameworks unsuitable.
              </p>
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Overview", href: "#overview" },
                  { label: "Design Properties", href: "#design" },
                  { label: "Performance", href: "#performance" },
                  { label: "Specification", href: "#specification" },
                  { label: "Use Cases", href: "#use-cases" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Sentinel-Lab", href: "/projects/sentinel-lab", meta: "v2.4.0" },
                  { label: "Sentinel Nexus", href: "/projects/sentinel-nexus", meta: "v3.1.0" },
                  { label: "Blackbox Core", href: "/projects/blackbox-core", meta: "v2.8.3" },
                ],
              },
            ]}
            cta={{ label: "View Specification", href: "/research/sentinel-lab#slab-protocol" }}
          />
        </div>
      </section>

      <section id="design" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Design Properties"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Three Core Properties.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Zero-Allocation", desc: "SLAB frames are fixed-size and stack-allocated. No heap, no malloc, no garbage collection. Every frame has a known, fixed size.", metric: "0" },
            { title: "Deterministic", desc: "No variable-length encoding, no compression, no surprises. Every frame is exactly the same size, every time.", metric: "100%" },
            { title: "Air-Gapped", desc: "No external dependencies, no code generation, no schema registry. The specification is a single 40-page document.", metric: "0 deps" },
          ].map((item) => (
            <div key={item.title} className="rounded-md border border-hairline bg-panel p-6">
              <p className="font-display text-[24px] font-bold text-cyan">{item.metric}</p>
              <h3 className="mt-2 font-display text-[15px] font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="performance" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Performance"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Benchmark Results.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The SLAB benchmark harness measures serialization throughput, deserialization throughput, and round-trip
            latency on a single core. Results are published as p99, not mean, because the tail is what matters for
            critical infrastructure.
          </p>
          <p>
            On the reference hardware (Intel Xeon E-2388G, 3.2 GHz, single core), SLAB achieves 2.3M frames/second
            for serialization and 2.1M frames/second for deserialization. This compares to 340K for Protobuf and 890K
            for FlatBuffers on the same hardware.
          </p>
          <p>
            The performance advantage comes from three factors: fixed-size frames (no length encoding), stack
            allocation (no heap), and zero-copy deserialization (frames are read directly from the wire buffer).
          </p>
        </div>
      </section>

      <section id="specification" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Specification"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">40 Pages. No Dependencies.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            The SLAB specification is a single 40-page document that covers the frame format, the type system, the
            conformance requirements, and the reference implementations. There is no schema registry, no code
            generation, and no external dependencies.
          </p>
          <p>
            The specification includes conformance test vectors — a set of known inputs and expected outputs that
            implementations must produce. These test vectors are available in the Sentinel-Lab repository and are
            used to validate new implementations.
          </p>
          <p>
            Reference implementations are provided in C and Rust. Both implementations are Apache-2.0 licensed and
            are designed to be embedded in larger systems without modification. The C implementation is suitable for
            kernel-level use; the Rust implementation is suitable for userspace and tooling.
          </p>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Use Cases"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Where SLAB Fits.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { title: "Appliance Fleet Communication", desc: "Inter-appliance threat correlation and policy distribution within the air-gapped enclave." },
            { title: "Kernel-to-Userspace Handoff", desc: "AF_XDP frame delivery from kernel to userspace without copies or syscalls." },
            { title: "Evidence Carving Export", desc: "PCAP and flow record export in a deterministic, verifiable format." },
            { title: "OTA Update Manifests", desc: "Signed firmware update manifests with fixed-size, verifiable structure." },
          ].map((u) => (
            <div key={u.title} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[14px] font-bold text-ink">{u.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
