# Samsung ENN Backend (`libxinfer_samsung_enn.so`)

The Samsung ENN backend provides hardware-accelerated inference across **Samsung Exynos SoCs** equipped with the Exynos Neural Processing Unit (NPU), such as the Exynos 990, 2100, 2200, and 2400. It interfaces directly with the Exynos Neural Network (ENN) kernel driver (`/dev/enn_framework`) and `libenn_client.so`.

---

## 1. Prerequisites & Environment Setup

Verify access to the Samsung ENN kernel character devices:

```bash
# Check ENN device node permissions
ls -l /dev/enn_framework
ls -l /dev/vertex*

# Verify ENN client library availability
ldconfig -p | grep libenn
```

Set the ENN library search paths:

```bash
export ENN_SDK_ROOT=/opt/samsung/enn-sdk
export LD_LIBRARY_PATH=$ENN_SDK_ROOT/lib64:$LD_LIBRARY_PATH
```

---

## 2. Compilation

Compile the Samsung ENN plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_SAMSUNG_ENN=ON \
    -DENN_SDK_DIR=$ENN_SDK_ROOT
ninja -C build xinfer_samsung_enn
```

---

## 3. Configuration & Code Example

The backend consumes compiled Neural Network Compiled (`.nnc`) model binaries:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/samsung_enn_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.nnc";
config.backend = xinfer::BackendType::SAMSUNG_ENN;
config.precision = xinfer::Precision::INT8;

xinfer::ENNOptions enn_opts;
enn_opts.core_affinity = xinfer::ENNCore::NPU_0;
enn_opts.boost_frequency = true;
config.custom_options = enn_opts.serialize();

xinfer::InferenceEngine engine;
engine.configure(config);
engine.initialize();

engine.forward();
```

---

## 4. Zero-Copy Execution via ENN Shared Memory

The Samsung ENN driver supports unified buffer sharing across the CPU, GPU, and NPU via Linux ION/DMA-BUF buffers:

```text
[System RAM / ION Memory /dev/ion]
                 │
                 ▼ Shared Memory Descriptor (ION FD)
+─────────────────────────────────────────────────────────────+
| enn_register_buffer(ion_fd, size, direction)                |
|   - Maps buffer directly to Exynos NPU MMU                  |
|   - Eliminates user/kernel memory marshaling                |
+─────────────────────────────────────────────────────────────+
                 │
                 ▼
[Samsung Exynos Dual/Tri-Core NPU]
```

### Shared Buffer Binding

```cpp
int ion_fd = acquire_shared_ion_fd(buffer_size);

auto tensor = xinfer::Tensor::create_from_dmabuf(
    tensor_desc,
    ion_fd,
    buffer_size
);

engine.bind_input("flow_features", tensor);
engine.forward();
```

---

## 5. Performance Sizing

| SoC Model | NPU Architecture | Compute Performance | Tabular Latency ($N=1$) |
| :--- | :--- | :--- | :--- |
| **Exynos 990**  | Dual-Core NPU + DSP | 10 TOPS | **$18.2\,\mu\text{s}$** |
| **Exynos 2200** | Dual-Core NPU (Gen 2) | 16 TOPS | **$13.5\,\mu\text{s}$** |
| **Exynos 2400** | Quad-Core NPU (Gen 3) | 44 TOPS | **$5.1\,\mu\text{s}$** |

