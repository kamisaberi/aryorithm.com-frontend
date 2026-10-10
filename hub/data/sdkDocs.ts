export interface SdkDoc {
  id: string;
  title: string;
  intro: string;
  points: string[];
  snippet?: { lang: string; code: string };
}

/** §2.5 — SDK portal content: one entry per runtime track. */
export const SDK_DOCS: SdkDoc[] = [
  {
    id: "quickstart",
    title: "Quickstart & Environment Setup",
    intro:
      "Ship your first extension in an afternoon: scaffold, build against the pinned toolchain, validate locally, publish to the registry.",
    points: [
      "Install the pinned C++20 / Wasmtime / LuaJIT toolchains from the SDK bundle.",
      "Scaffold with sentinel-hub init — manifest, README, and CI stub included.",
      "Validate offline with sentinel-hub lint before every publish.",
    ],
    snippet: {
      lang: "bash",
      code: "# scaffold, build, lint, publish\nsentinel-hub init my-dissector --runtime NATIVE_CPP20\nsentinel-hub build ./my-dissector\nsentinel-hub lint ./my-dissector/splugin.yaml",
    },
  },
  {
    id: "cpp-sdk",
    title: "C++20 Native Dissector SDK (IDissectorPlugin)",
    intro:
      "Implement IDissectorPlugin against zero-copy packet views. No heap allocation on the fast path — arenas are caller-owned.",
    points: [
      "Parse from borrowed spans; never retain packet pointers past return.",
      "Declare eBPF maps, capabilities, and memory ceiling in splugin.yaml.",
      "Match the pinned ABI version or the loader refuses the object.",
    ],
    snippet: {
      lang: "cpp",
      code: '// my_dissector.cpp — Native C++20 dissector\n#include <sentinel/IDissectorPlugin.hpp>\n\nclass S7Dissector final : public sentinel::IDissectorPlugin {\n public:\n  sentinel::Verdict inspect(sentinel::PacketView pkt) override {\n    if (!pkt.starts_with(/* TPKT magic */ 0x03)) return sentinel::Verdict::kPass;\n    return check_cotp(pkt) ? sentinel::Verdict::kPass : sentinel::Verdict::kDrop;\n  }\n};',
    },
  },
  {
    id: "wasm-rules",
    title: "WebAssembly Micro-Rules (Wasmtime Runtime)",
    intro:
      "Ship graded canary checks as sandboxed Wasm modules: deterministic fuel metering, zero host access by default.",
    points: [
      "Keep modules under 1 MB and handlers under 50 µs wall time.",
      "Declare every host import up front — undeclared imports fail closed.",
      "Stage through canary cohorts before fleet-wide promotion.",
    ],
    snippet: {
      lang: "bash",
      code: "# pack a micro-rule\nsentinel-hub pack ./canary-rule --runtime WASM_SANDBOX\nsentinel plugin install canary-vendor/graded-canary:1.0.0",
    },
  },
  {
    id: "luajit",
    title: "LuaJIT Rapid Threat Scripting",
    intro:
      "Prototype detection logic in hours with LuaJIT scripts, then promote hot paths to native or Wasm when they prove out.",
    points: [
      "Scripts run JIT-compiled with strict instruction budgets.",
      "No socket, file, or subprocess access from the sandbox.",
      "Version scripts like any other extension — changelogs required.",
    ],
  },
  {
    id: "onnx-models",
    title: "Neural Weight Packaging (ONNX Opset 17)",
    intro:
      "Distribute anomaly scorers as versioned ONNX graphs with pinned opsets and calibrated thresholds.",
    points: [
      "Export Opset 17; other opsets are rejected at publish time.",
      "Bundle calibration statistics and the evaluation dataset hash.",
      "Declare target silicon — UNIVERSAL falls back to CPU reference.",
    ],
    snippet: {
      lang: "bash",
      code: "# stage a model for fleet canary\nnexus-ctl plugin deploy flow-research/netflow-autoencoder:2.4.0 --fleet-wide",
    },
  },
  {
    id: "memory-safety",
    title: "Memory Safety & Zero-Allocation Guidelines",
    intro:
      "The fast path never allocates. Pre-size every buffer, prove every bound, and keep the verifier happy.",
    points: [
      "Declare max_memory_mb honestly — the loader enforces the ceiling.",
      "Zero heap allocation between packet ingress and verdict.",
      "Fuzz harnesses are mandatory for NATIVE_CPP20 submissions.",
    ],
  },
];
