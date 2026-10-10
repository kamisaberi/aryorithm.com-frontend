/** Compact download counter: 1420 -> "1.4k", 3100 -> "3.1k". */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  const v = n / 1000;
  return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}k`;
}

/** Byte size: 1482000 -> "1.4 MB". */
export function bytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Fast-path latency: 0.42 -> "< 0.42 µs", null -> "—". */
export function latency(us: number | null | undefined): string {
  if (us === null || us === undefined) return "—";
  return `< ${us} µs`;
}

export function prettyCategory(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function prettyRuntime(runtime: string): string {
  const map: Record<string, string> = {
    NATIVE_CPP20: "Native C++20",
    WASM_SANDBOX: "Wasm Sandbox",
    LUAJIT: "LuaJIT",
    ONNX_NEURAL_WEIGHTS: "ONNX Weights",
  };
  return map[runtime] ?? runtime;
}

export function prettySilicon(silicon: string): string {
  const map: Record<string, string> = {
    UNIVERSAL: "Universal",
    INTEL_OPENVINO: "Intel OpenVINO",
    NVIDIA_TENSORRT: "NVIDIA TensorRT",
    ROCKCHIP_RKNN: "Rockchip RKNN",
    HAILO_HAILORT: "HailoRT",
  };
  return map[silicon] ?? silicon;
}

export function prettyTier(tier: string): string {
  const map: Record<string, string> = {
    OFFICIAL_CORE: "Official Core",
    ENTERPRISE_AUDITED: "Enterprise Audited",
    COMMUNITY_VERIFIED: "Community Verified",
    EXPERIMENTAL: "Experimental",
  };
  return map[tier] ?? tier;
}
