# Comparative Studies: xInfer vs. Industry Frameworks

To evaluate the architectural efficiency of `xinfer-essential`, we benchmarked the engine against three widely adopted industry runtimes: **ONNX Runtime (Microsoft)**, **LibTorch (Meta/PyTorch Foundation)**, and **Native Intel OpenVINO / NVIDIA TensorRT standalone**.

All tests evaluated identical weights (`network_threat_v2.onnx` / 32-dim tabular vector) on identical bare-metal hardware.

---

## 1. Latency & Tail Jitter Comparison

**Testbed:** Intel Core Ultra 7 165H (Ubuntu 24.04 LTS, Clang 16, Performance Governor).

```text
INFERENCE LATENCY COMPARISON (Lower is Better):

LibTorch C++ (CPU)         : ═══════════════════════════════════════ 84.5 µs
ONNX Runtime 1.18 (CPU)     : ═════════════════════ 42.1 µs
ONNX Runtime (OpenVINO EP) : ══════════════ 28.4 µs
Intel OpenVINO Native C++  : ══════ 14.8 µs
xInfer-Essential (Zero-Copy): ════ 8.4 µs
```

### Detailed Metric Breakdown

| Framework | Ingestion Mode | Mean Latency | p99 Latency | p99.9 Latency | Heap Allocations per Call |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LibTorch C++ (v2.3)** | Dynamic `at::Tensor` copy | $84.5\,\mu\text{s}$ | $145.2\,\mu\text{s}$ | $312.0\,\mu\text{s}$ | 4 allocations |
| **ONNX Runtime (CPU)** | `Ort::Value::CreateTensor` | $42.1\,\mu\text{s}$ | $68.4\,\mu\text{s}$ | $124.5\,\mu\text{s}$ | 2 allocations |
| **ONNX Runtime (OV EP)** | User-Allocated Memory | $28.4\,\mu\text{s}$ | $45.1\,\mu\text{s}$ | $95.2\,\mu\text{s}$ | 1 allocation |
| **OpenVINO Native C++** | `ov::Tensor` pointer wrap | $14.8\,\mu\text{s}$ | $19.2\,\mu\text{s}$ | $35.0\,\mu\text{s}$ | 0 allocations |
| **xInfer-Essential** | **Direct Pinned Zero-Copy**| **$8.4\,\mu\text{s}$** | **$11.2\,\mu\text{s}$** | **$14.1\,\mu\text{s}$** | **0 allocations** |

---

## 2. Why Does `xInfer` Outperform Generic Frameworks?

### 1. Zero Framework Operator Dispatch Overhead
Generic engines (like ONNX Runtime and LibTorch) route tensor inputs through abstract execution providers, validating dimension ranks, verifying symbolic shape constraints, and traversing internal operator graphs on every call. `xinfer-essential` performs graph validation once during `initialize()`, binding hardware input ports directly to physical addresses for subsequent passes.

### 2. Elimination of Dynamic Heap Churn
Generic runtimes often allocate small dynamic objects (such as metadata descriptors, status strings, or internal tracking nodes) during `Run()`. In high-throughput settings, this triggers lock contention in thread-local heaps. `xinfer-essential` performs zero heap allocations during `forward()`.

### 3. Binary Footprint & Attack Surface Isolation

| Runtime Engine | Shared Library Size | Dynamic Linker Symbols Exported | Embedded Dependencies |
| :--- | :--- | :--- | :--- |
| **LibTorch C++** | $\sim 210\,\text{MB}$ | $> 120{,}000$ | Protobuf, BLAS, OpenMP, Python ABI |
| **ONNX Runtime** | $\sim 38\,\text{MB}$ | $> 15{,}000$ | Protobuf, Flatbuffers, Re2 |
| **xInfer-Essential**| **$< 4.2\,\text{MB}$** | **$< 25$ (`XINFER_API`)** | **None (Decoupled dynamic plugins)** |

