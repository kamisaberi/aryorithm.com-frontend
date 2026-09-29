export const BIBTEX = `@article{aryorithm2026subms,
  title   = {Autonomous Cyber-Physical Threat Mitigation: A Sub-Millisecond
             Active Defense Architecture on Heterogeneous Silicon},
  author  = {{Aryorithm Systems Lab}},
  journal = {IEEE/ACM Transactions on Dependable and Secure Computing},
  year    = {2026},
  note    = {Preprint. Under review.},
  keywords = {eBPF, XDP, cyber-physical systems, edge inference,
              zero-copy, TPM 2.0, industrial control systems},
  url     = {https://aryorithm.com/research/sentinel-lab}
}`;

export const PREPRINT_SHA = "c47d91e0a8b3f6259d14708ce2ab5f3097b62d84a15e0fc39b7d248e6a05cb17";

export interface SlabField {
  id: string;
  label: string;
  type: string;
  bytes: number | null;
  offset: number;
  detail: string;
}

export const SLAB_FIELDS: SlabField[] = [
  { id: "magic", label: "MAGIC", type: '"SLAB"', bytes: 4, offset: 0, detail: "Four ASCII bytes 0x53 0x4C 0x41 0x42. Validated before any further parsing, so a malformed or foreign stream is rejected on its first word rather than being speculatively decoded." },
  { id: "eventid", label: "EventID", type: "uint64", bytes: 8, offset: 4, detail: "Monotonic 64-bit event counter assigned by the producer. Lets the harness correlate a verdict back to an exact replayed record without carrying a string identifier on the wire." },
  { id: "truth", label: "GroundTruth", type: "int32", bytes: 4, offset: 12, detail: "Signed label for supervised evaluation: 0 benign, 1..n attack class, -1 unlabeled. Present only in benchmark replay; production streams transmit -1 because no ground truth exists at the edge." },
  { id: "numfeat", label: "NumFeatures", type: "uint32", bytes: 4, offset: 16, detail: "Declares the length of the trailing array. The reader uses this to compute the exact frame size up front, which is what makes a single-read, zero-allocation ingest possible." },
  { id: "features", label: "Features Array", type: "float32[]", bytes: null, offset: 20, detail: "Contiguous little-endian float32 flow vector — 32, 42 or 80 dimensions depending on the feature set. Because it is already the accelerator's expected memory layout, it is passed to libxinfer by pointer with no transformation." },
];

export interface HarnessLine {
  t: string;
  c?: string;
  d: number;
}

export const HARNESS_LINES: HarnessLine[] = [
  { t: "$ python examples/run_full_evaluation.py --dataset cic-ids-2017 --subset portscan", d: 60 },
  { t: "", d: 30 },
  { t: "Sentinel-Lab evaluation harness 1.8.0", c: "text-muted", d: 90 },
  { t: "loading dataset … CIC-IDS-2017 PortScan  (77 MB, 286,467 flows)", c: "text-muted", d: 220 },
  { t: "feature extraction … 32-dim vectors  [OK]", c: "text-muted", d: 180 },
  { t: "SLAB replay socket bound → 127.0.0.1:9700  (zero-copy, 0 allocs/event)", c: "text-muted", d: 170 },
  { t: "", d: 40 },
  { t: "── backend 1/2 · Intel OpenVINO (Xeon D-1747NTE, AVX-512) ─────────────", c: "text-cyan", d: 150 },
  { t: "replaying   60,412 EPS ······························· done", c: "text-muted", d: 260 },
  { t: "  accuracy        0.9971", c: "text-kernel", d: 120 },
  { t: "  recall          0.9948", c: "text-kernel", d: 110 },
  { t: "  precision       0.9982", c: "text-kernel", d: 110 },
  { t: "  f1              0.9965", c: "text-kernel", d: 110 },
  { t: "  latency  p50    14.9 µs", d: 110 },
  { t: "  latency  p99    18.2 µs   (sub-millisecond ✓)", d: 130 },
  { t: "", d: 40 },
  { t: "── backend 2/2 · NVIDIA TensorRT (L4, CUDA 12.4) ──────────────────────", c: "text-cyan", d: 150 },
  { t: "replaying   61,088 EPS ······························· done", c: "text-muted", d: 260 },
  { t: "  accuracy        0.9974", c: "text-kernel", d: 120 },
  { t: "  recall          0.9953", c: "text-kernel", d: 110 },
  { t: "  precision       0.9984", c: "text-kernel", d: 110 },
  { t: "  f1              0.9968", c: "text-kernel", d: 110 },
  { t: "  latency  p50    10.1 µs", d: 110 },
  { t: "  latency  p99    12.4 µs   (sub-millisecond ✓)", d: 130 },
  { t: "", d: 40 },
  { t: "DELTA  TensorRT vs OpenVINO:  p99 −5.8 µs (−31.9%) · accuracy +0.0003", c: "text-telemetry", d: 160 },
  { t: "Both backends satisfy the < 1.0 ms mitigation SLA with >31× headroom.", c: "text-kernel", d: 140 },
  { t: "", d: 30 },
  { t: "artefacts written → results/portscan_2026-09-22/{metrics.json,latency.csv}", c: "text-muted", d: 110 },
  { t: "reproducibility hash  sha256:6b1e4f889a03c7d2 … verified against release", c: "text-cyan", d: 120 },
];
