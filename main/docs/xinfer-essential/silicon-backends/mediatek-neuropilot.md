# MediaTek NeuroPilot Backend (`libxinfer_neuropilot.so`)

The MediaTek NeuroPilot backend enables hardware acceleration on MediaTek systems-on-chip equipped with the **MediaTek AI Processing Unit (APU)**, such as the Dimensity 9300/9400 and Genio 1200/700/500 edge IoT platforms.

---

## 1. Prerequisites & Environment Setup

Verify that the MediaTek APU driver nodes and ION memory managers are initialized:

```bash
# Verify APU hardware node
ls -l /dev/apu*

# Verify ION memory allocator interface
ls -l /dev/ion
```

Export paths to the MediaTek NeuroPilot runtime libraries:

```bash
export NEUROPILOT_SDK=/opt/mediatek/neuropilot
export LD_LIBRARY_PATH=$NEUROPILOT_SDK/lib64:$LD_LIBRARY_PATH
```

---

## 2. Compilation

Compile the NeuroPilot backend plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_NEUROPILOT=ON \
    -DNEUROPILOT_ROOT=$NEUROPILOT_SDK
ninja -C build xinfer_neuropilot
```

---

## 3. Configuration & Code Example

The backend loads compiled Deep Learning Accelerator (`.dla`) or PyTorch Executable (`.pte`) artifacts:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/neuropilot_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.dla";
config.backend = xinfer::BackendType::MEDIATEK_NEUROPILOT;
config.precision = xinfer::Precision::INT8;

xinfer::NeuroPilotOptions np_opts;
np_opts.apu_boost_value = 100; // Lock APU clock to maximum frequency
np_opts.enable_low_power = false;
config.custom_options = np_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();

engine.forward();
```

---

## 4. Zero-Copy Execution via Linux ION Allocator

MediaTek APUs share system memory via the Linux ION allocator or modern DMA-BUF heap brokers (`/dev/dma_heap/reserved-apu`). `libxinfer_neuropilot.so` coordinates buffer sharing directly through these descriptors:

```text
[Linux ION / DMA-BUF Broker (/dev/ion)]
                 │
                 ▼ Allocates Hardware-Contiguous Pages
+─────────────────────────────────────────────────────────────+
| xinfer::Tensor (DMA-BUF File Descriptor Shared Handle)       |
+─────────────────────────────────────────────────────────────+
                 │
                 ▼ Direct Hardware Bus Access (Zero Copy)
[MediaTek APU Direct Memory Controller]
```

### Direct Buffer Construction

```cpp
int ion_fd = acquire_ion_buffer_fd(buffer_bytes);

auto tensor = xinfer::Tensor::create_from_dmabuf(
    desc,
    ion_fd,
    buffer_bytes
);

engine.bind_input("flow_features", tensor);
engine.forward();
```

---

## 5. Performance Sizing

| SoC Model | APU Generation | Compute Rating | NetFlow Evaluation Latency |
| :--- | :--- | :--- | :--- |
| **Genio 700 (MT8390)** | APU 3.0 | 4.0 TOPS | **$14.5\,\mu\text{s}$** |
| **Genio 1200 (MT8395)**| APU 4.0 | 4.8 TOPS | **$10.2\,\mu\text{s}$** |
| **Dimensity 9300** | APU 790 | 45.0 TOPS | **$3.8\,\mu\text{s}$** |

