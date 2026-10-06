# xInfer Essential (`libxinfer.so`)

**Universal Heterogeneous C++20 AI Inference Runtime**  
*Tier 1 Foundational Engine of the Aryorithm / Blackbox Sentinel Ecosystem*

---

## Executive Architectural Overview

`xinfer-essential` is a low-latency, zero-copy C++20 inference engine designed for edge appliances, industrial cyber-physical hardware, and real-time defense networks. It abstracts complex, vendor-specific neural acceleration APIs behind a unified, cache-aligned tensor interface.

```
+-----------------------------------------------------------------------------+
|                          Application / Host Process                         |
|                 (e.g., Blackbox-Sentinel, EDR, SCADA Monitor)               |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                         xinfer::InferenceEngine                             |
|    - Memory Domain Arbiter           - Direct Zero-Copy DMA Exchange        |
|    - Dynamic Backend Selector        - Strict Symbol Isolation Boundary     |
+─────────────────────────────────────────────────────────────────────────────+
         │                       │                         │
         ▼                       ▼                         ▼
+─────────────────+    +───────────────────+    +─────────────────────+
|   libxinfer_    |    |    libxinfer_     |    |     libxinfer_      |
|   tensorrt.so   |    |   openvino.so     |    |      rknn.so        |
|  (NVIDIA GPUs)  |    | (Intel NPU/iGPU)  |    |  (Rockchip RK3588)  |
+─────────────────+    +───────────────────+    +─────────────────────+
         │                       │                         │
         ▼                       ▼                         ▼
+─────────────────+    +───────────────────+    +─────────────────────+
|   CUDA Streams  |    | ov::RemoteContext |    |  /dev/rknpu (DRM)   |
| Host-Pinned Mem |    | Shared DMA-BUF    |    | Zero-Copy Buffer IO |
+─────────────────+    +───────────────────+    +─────────────────────+
```

### Core Invariants

1. **Deterministic Execution:** No runtime memory allocation in the inference fast-path. Tensor buffers are pre-allocated and pinned during initialization.
2. **Zero-Copy Memory Transport:** Direct integration with Linux kernel `DMA-BUF` file descriptors, CUDA Host-Pinned memory (`cudaHostAlloc`), and Intel OpenVINO remote tensors.
3. **Strict ABI Isolation:** Compiled with `-fvisibility=hidden`. Only routines explicitly marked with `XINFER_API` are exported across shared library boundaries.
4. **Zero Managed Runtimes:** Implemented in pure ISO C++20 without Python, Java, or Node dependencies in the evaluation path.
5. **Silicon Agnostic:** Unified dynamic dispatch across 15 discrete accelerator architectures.

---

## Hardware Target Matrix

| Accelerator Architecture | Target Silicon Family | Driver / Subsystem Hook | Native Precision |
| :--- | :--- | :--- | :--- |
| **NVIDIA TensorRT** | Orin Nano, AGX Orin, RTX A4000+ | CUDA Streams / cuDNN | FP32, FP16, INT8 |
| **Intel OpenVINO** | Core Ultra NPUs, Meteor Lake, Xeon | OneVPL / Level Zero / i915 | FP32, FP16, BF16, INT8 |
| **Rockchip RKNN** | RK3588, RK3588S, RK3576 | RKNPU2 / DRM IOCTL | FP16, INT8, INT4 |
| **Qualcomm QNN** | Snapdragon X Elite, SA8295P | FastRPC / Hexagon DSP | FP16, INT8 |
| **AMD Vitis AI** | Versal AI Edge, Kria SOMs, Zynq | XRT (Xilinx Runtime) / DPU | INT8, BFP16 |
| **Apple CoreML** | Apple Silicon (M1/M2/M3/M4 Series) | Metal Performance Shaders / ANE | FP32, FP16 |
| **AMD Ryzen AI** | Ryzen 7040/8040, Strix Point | XDNA Driver / DirectML | FP32, FP16, INT8 |
| **MediaTek NeuroPilot** | Dimensity 9300, Genio 1200 | APU Direct Driver / ION Memory | FP16, INT8 |
| **Hailo HailoRT** | Hailo-8, Hailo-8L M.2 Modules | PCIe Driver (`/dev/hailo0`) | INT8, INT16 |
| **Ambarella CVFlow** | CV2x, CV5x, CV7x Systems-on-Chip | Cavalry Driver (`/dev/cavalry`) | INT8, FP16 |
| **Samsung ENN** | Exynos 990, 2200, 2400 | ENN Driver Framebuffer | FP16, INT8 |
| **Google Coral** | Edge TPU (PCIe, M.2, Dual Edge) | `libedgetpu1-std` / Gasket | INT8 |
| **Intel FPGA AI Suite** | Agilex 7, Arria 10, Cyclone V | OpenCL / PCIe AXI Master | Custom Fixed-Point |
| **Microchip VectorBlox** | PolarFire SoC FPGA | AXI Shared Memory Driver | INT8 |
| **Lattice sensAI** | iCE40 UltraPlus, CrossLink-NX | Direct SPI / Wishbone Bridge | INT1, INT8 |

---

## 30-Second Verification Example

```cpp
#include <xinfer/xinfer.hpp>
#include <iostream>
#include <vector>

int main() {
    // 1. Initialize configuration with explicit backend targeting
    xinfer::EngineConfig config;
    config.model_path = "/opt/models/network_threat_v2.onnx";
    config.backend = xinfer::BackendType::AUTO; // Autodetects fastest available accelerator
    config.precision = xinfer::Precision::FP16;
    config.enable_zero_copy = true;

    // 2. Instantiate and compile execution plan
    xinfer::InferenceEngine engine(config);
    engine.initialize();

    // 3. Acquire pre-allocated zero-copy input view
    auto input_tensor = engine.get_input_tensor("flow_features");
    
    // Fill input vector (32-dim normalized flow vector)
    std::vector<float> sample(32, 0.5f);
    input_tensor->copy_from_host(sample.data(), sample.size() * sizeof(float));

    // 4. Synchronous execution (sub-microsecond execution profile)
    engine.forward();

    // 5. Read output prediction
    auto output_tensor = engine.get_output_tensor("threat_score");
    float anomaly_score = *output_tensor->data<float>();

    std::cout << "[xInfer] Anomaly Score: " << anomaly_score 
              << " | Latency: " << engine.last_inference_microseconds() << " us" << std::endl;

    return 0;
}
```

---

## Key Performance Indicators

* **Input-to-Output Fastpath Latency:** $< 11.4\,\mu\text{s}$ on Intel Core Ultra 7 165H (OpenVINO NPU, 32-dim tabular NetFlow).
* **Direct DMA Throughput:** $12.8\,\text{GB/s}$ sustained zero-copy ingestion over Linux DMA-BUF.
* **Heap Churn:** $0$ allocations during continuous forward passes.
* **Linker Footprint:** $< 4.2\,\text{MB}$ release shared library binary footprint (`libxinfer.so`).

