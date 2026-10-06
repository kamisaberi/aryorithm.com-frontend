# NVIDIA TensorRT Backend (`libxinfer_tensorrt.so`)

The NVIDIA TensorRT backend provides hardware-accelerated inference across NVIDIA Jetson systems (Orin Nano, Orin NX, AGX Orin) and discrete enterprise GPUs (RTX A4000, L40S, H100). It executes models directly within CUDA asynchronous streams, bypassing host CPU synchronization bottlenecks.

---

## 1. Prerequisites & Host Driver Verification

Ensure the host environment satisfies the driver and toolkit dependencies:

```bash
# Verify NVIDIA kernel driver
nvidia-smi

# Check CUDA Toolkit compiler version (CUDA >= 12.0 required)
nvcc --version
```

Verify that the following shared libraries are discoverable in `LD_LIBRARY_PATH`:
* `libnvinfer.so` (TensorRT Core Engine)
* `libnvinfer_plugin.so` (Custom Plugin Layers)
* `libcudart.so` (CUDA Runtime Library)

---

## 2. Compilation & Plugin Configuration

To compile `libxinfer_tensorrt.so`:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_TENSORRT=ON \
    -DCUDA_TOOLKIT_ROOT_DIR=/usr/local/cuda \
    -DTENSORRT_ROOT_DIR=/usr/lib/x86_64-linux-gnu
ninja -C build xinfer_tensorrt
```

---

## 3. Runtime Architecture & Execution Pipeline

```text
+─────────────────────────────────────────────────────────────────────────────+
|                          xinfer::InferenceEngine                            |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                         TensorRTPlugin Execution                            |
|  - cudaStream_t stream_             - Host-Pinned Input Buffers             |
|  - nvinfer1::IExecutionContext*     - Direct Device VRAM Output             |
+─────────────────────────────────────────────────────────────────────────────+
         │                                                     │
         ▼ (Async Enqueue: enqueueV3)                          ▼ (Zero-Copy)
+─────────────────────────────────────────────────────────────────────────────+
|                              NVIDIA CUDA GPU                                |
|  - Tensor Cores (FP16 / INT8)       - Asynchronous Completion Event Trap   |
+─────────────────────────────────────────────────────────────────────────────+
```

### In-Memory Model Deserialization

`xinfer-essential` loads pre-compiled `.engine` or `.plan` binaries directly from encrypted memory rings without staging temporary unencrypted files to disk:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/tensorrt_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.engine";
config.backend = xinfer::BackendType::TENSORRT;
config.precision = xinfer::Precision::FP16;
config.device_id = 0; // GPU 0

// Backend-specific configuration options
xinfer::TensorRTOptions trt_opts;
trt_opts.enable_cuda_graphs = true; // Captures CUDA graph for sub-microsecond enqueue
trt_opts.dla_core = -1;              // Run on GPU Tensor Cores (Use 0 or 1 for Jetson DLA)
config.custom_options = trt_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();
```

---

## 4. Zero-Copy CUDA Memory Mechanisms

To eliminate host-to-device memory copies (`cudaMemcpy`), use pinned host allocations:

```cpp
// Acquire the pre-allocated host-pinned tensor buffer
auto input_tensor = engine.get_input_tensor("network_features");

// input_tensor->data<float>() points to memory allocated via cudaHostAlloc()
float* host_pinned_ptr = input_tensor->data<float>();

// Ingest network packet vector directly into pinned RAM
std::memcpy(host_pinned_ptr, raw_packet_features, 32 * sizeof(float));

// Enqueue inference asynchronously; GPU reads host RAM directly over PCIe bus
engine.forward_async();

// Wait for stream completion only when reading results
engine.synchronize();
```

---

## 5. Performance Tuning & Best Practices

1. **Enable CUDA Graphs:** For fixed-size input tensors (e.g., 32-dim tabular flows), setting `enable_cuda_graphs = true` reduces CPU enqueue overhead from $\sim 8.2\,\mu\text{s}$ down to $< 1.1\,\mu\text{s}$.
2. **Jetson Unified Memory:** On Jetson AGX Orin, avoid discrete VRAM allocations. Use `cudaMallocManaged()` with `cudaMemAdviseSetPreferredLocation` targeting `cudaCpuDeviceId` to allow the GPU Tensor Cores and CPU to share the same physical LPDDR5 bus.

