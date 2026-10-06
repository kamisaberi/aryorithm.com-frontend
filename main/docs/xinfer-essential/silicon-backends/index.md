# Silicon Compatibility Matrix & Hardware Overview

`xinfer-essential` abstracts heterogeneous hardware backends behind the unified `IInferencePlugin` interface. This allows edge security and industrial daemons to run across micro-edge NPUs, embedded SoCs, discrete GPUs, and FPGA coprocessors without code modifications.

---

## 1. Master Compatibility Matrix

| Backend Identifier | Silicon Family | Driver / Subsystem | Supported Model Formats | Zero-Copy Primitives | Typical Inference SLA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `nvidia_tensorrt` | Jetson Orin Nano/AGX, RTX A4000+, Ada/Blackwell | CUDA 12+, TensorRT 8.6–10.x | `.engine`, `.plan`, `.onnx` | `cudaHostAlloc`, Managed Memory | $< 4.2\,\mu\text{s}$ |
| `intel_openvino` | Core Ultra (Meteor/Lunar Lake), Xeon, Arc | Intel Level Zero, NPU Driver, i915 | OpenVINO IR (`.xml`/`.bin`), `.onnx` | `ov::RemoteTensor`, Host-Pinned | $< 11.4\,\mu\text{s}$ |
| `rockchip_rknn` | RK3588, RK3588S, RK3576 | RKNPU2, Linux DRM / IOCTL | `.rknn` | Linux Kernel `DMA-BUF` | $< 8.9\,\mu\text{s}$ |
| `qualcomm_qnn` | Snapdragon X Elite, SA8295P, 8 Gen 2/3 | Hexagon FastRPC, QNN 2.18+ | QNN Context Binary (`.bin`) | FastRPC ION / DMA-BUF | $< 6.8\,\mu\text{s}$ |
| `amd_vitis_ai` | Versal AI Edge, Kria K26, Zynq UltraScale+ | Xilinx Runtime (XRT), DPU | `.xmodel` | XRT Contiguous Memory (BO) | $< 9.5\,\mu\text{s}$ |
| `apple_coreml` | Apple Silicon (M1, M2, M3, M4 Series) | Metal Performance Shaders, ANE | `.mlmodelc` | Metal Shared Unified Buffers | $< 5.1\,\mu\text{s}$ |
| `amd_ryzen_ai` | Ryzen 7040/8040, Strix Point | AMD XDNA Driver, DirectML/ONNX | `.onnx` | DirectML Shared Committed Memory | $< 12.0\,\mu\text{s}$ |
| `mediatek_neuropilot` | Dimensity 9300, Genio 1200 | APU Direct Driver, NeuroPilot SDK | `.dla`, `.pte` | ION Linux Memory Broker | $< 10.2\,\mu\text{s}$ |
| `hailo_hailort` | Hailo-8, Hailo-8L M.2 Coprocessors | PCIe Driver (`/dev/hailo0`), HailoRT | `.hef` | HailoRT Zero-Copy Host Buffers | $< 7.5\,\mu\text{s}$ |
| `ambarella_cvflow` | CV2x, CV5x, CV7x Edge AI SoCs | Cavalry Driver (`/dev/cavalry`) | `.cavalry` | Cavalry Physical Contiguous RAM | $< 8.2\,\mu\text{s}$ |
| `samsung_enn` | Exynos 990, 2200, 2400 | Exynos Neural Network (ENN) Driver| `.nnc` | ENN Unified Shared Memory | $< 13.5\,\mu\text{s}$ |
| `google_coral` | Edge TPU (PCIe, M.2, USB Accelerator) | `libedgetpu1-std`, Gasket Driver | Edge TPU Compiled `.tflite` | Paged Physical Direct RAM | $< 28.0\,\mu\text{s}$ |
| `intel_fpga_ai` | Agilex 7, Arria 10, Cyclone V | Intel FPGA AI Suite, OpenCL BSP | Compiled Bitstream (`.aocx`) | FPGA PCIe DMA Ring Buffers | $< 6.1\,\mu\text{s}$ |
| `microchip_vectorblox`| PolarFire SoC FPGA | CoreVectorBlox AXI IP Driver | VectorBlox Model (`.blob`) | AXI4 Non-Cached Scratchpad | $< 34.0\,\mu\text{s}$ |
| `lattice_sensai` | iCE40 UltraPlus, CrossLink-NX | Direct SPI / Wishbone Driver | sensAI Binary (`.bin`) | SPI FIFO Double-Buffering | $< 115.0\,\mu\text{s}$ |

---

## 2. Compilation Flags Reference

Enable or disable backend plugins during CMake configuration using explicit compiler flags:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_TENSORRT=ON \
    -DXINFER_ENABLE_OPENVINO=ON \
    -DXINFER_ENABLE_RKNN=ON \
    -DXINFER_ENABLE_QNN=ON
```

---

## 3. Dynamic Hardware Dispatch & Fallback Order

When `config.backend = xinfer::BackendType::AUTO` is set, `xinfer-essential` discovers physical devices at runtime and selects the fastest backend using this priority order:

```text
 1. Dedicated Hardware Discrete Coprocessor (PCIe / Embedded NPU)
    [TensorRT] ──> [HailoRT] ──> [RKNN] ──> [Qualcomm QNN] ──> [Vitis AI]
                          │
                          ▼ (If coprocessor is unavailable)
 2. Integrated SoC Acceleration Engine
    [Intel OpenVINO NPU] ──> [Apple ANE] ──> [AMD Ryzen AI XDNA]
                          │
                          ▼ (If SoC NPU is uninitialized)
 3. Integrated or Desktop GPU Pipeline
    [Intel OpenVINO iGPU / Level Zero] ──> [CUDA GPU] ──> [Apple Metal]
                          │
                          ▼ (Ultimate deterministic fallback)
 4. Native Reference CPU SIMD Engine
    [AVX-512] ──> [AVX2 / FMA] ──> [ARM Neon] ──> [Standard POSIX C++]
```

If an edge NPU experiences a hardware bus reset or thermal throttling event during initialization, the engine drops to the next available tier without interrupting host daemon execution.

