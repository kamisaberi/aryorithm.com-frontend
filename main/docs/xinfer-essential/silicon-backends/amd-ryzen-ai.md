# AMD Ryzen AI Backend (`libxinfer_ryzen_ai.so`)

The AMD Ryzen AI backend provides hardware acceleration for AMD mobile and desktop processors equipped with the **AMD XDNA Neural Processing Unit (NPU)**, including Ryzen 7040 (Phoenix), 8040 (Hawk Point), and Strix Point processors.

---

## 1. Prerequisites & Linux Kernel Driver

Support for AMD XDNA NPUs on Linux requires the out-of-tree or kernel-integrated `amdxdna` accelerator driver:

```bash
# Verify the XDNA accelerator character device is registered
ls -l /dev/accel/accel*

# Confirm driver linkage in dmesg
dmesg | grep amdxdna
```

### Required Software Components

* **Linux Kernel:** Version `>= 6.7` with `CONFIG_DRM_ACCEL` enabled.
* **XDNA Driver:** AMD XDNA driver and firmware package (`xrt_plugin_xdna`).
* **Vitis AI ONNX Runtime Engine / DirectML:** Built with XDNA target support.

---

## 2. Compilation

Compile the Ryzen AI plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_RYZEN_AI=ON \
    -DAMDXDNA_ROOT=/opt/amd/xdna
ninja -C build xinfer_ryzen_ai
```

---

## 3. Configuration & Model Ingestion

The Ryzen AI backend accepts quantized ONNX models with embedded DPU instructions:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/ryzen_ai_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2_amd.onnx";
config.backend = xinfer::BackendType::AMD_RYZEN_AI;
config.precision = xinfer::Precision::INT8;

xinfer::RyzenAIOptions ryzen_opts;
ryzen_opts.npu_core_profile = "default_singletasking";
config.custom_options = ryzen_opts.serialize();

xinfer::InferenceEngine engine;
engine.configure(config);
engine.initialize();

std::cout << "[xInfer] Bound to AMD XDNA NPU Engine" << std::endl;
```

---

## 4. Memory Pinned Subsystem

AMD XDNA utilizes direct system memory mapping over internal high-speed fabric. `libxinfer_ryzen_ai.so` uses host-pinned physical memory blocks registered directly with the XDNA kernel driver:

```cpp
// Allocate cache-aligned host memory
void* npu_accessible_ptr = xinfer::allocate_pinned_memory(buffer_bytes);

// Wrap memory block inside tensor view
auto input_tensor = xinfer::Tensor::create_from_raw_host(
    desc,
    npu_accessible_ptr,
    buffer_bytes
);

engine.bind_input("input_features", input_tensor);
engine.forward();
```

---

## 5. Performance Diagnostics

| Processor Generation | NPU Architecture | Compute Capability | Tabular Latency ($N=1$) |
| :--- | :--- | :--- | :--- |
| **Ryzen 7 7840U** | AMD XDNA Gen 1 | 10 TOPS | **$13.8\,\mu\text{s}$** |
| **Ryzen 7 8840HS** | AMD XDNA Gen 1 | 16 TOPS | **$12.0\,\mu\text{s}$** |
| **Ryzen AI 9 HX 370** | AMD XDNA Gen 2 | 50 TOPS | **$4.9\,\mu\text{s}$** |

