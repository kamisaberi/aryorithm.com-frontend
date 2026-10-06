# Rockchip RKNN Backend (`libxinfer_rknn.so`)

The Rockchip RKNN backend provides hardware acceleration for Rockchip SoCs, including the **RK3588, RK3588S, RK3576, and RV1126**. It communicates directly with the multi-core NPU via the Linux DRM (Direct Rendering Manager) driver subsystem and `librknnrt.so`.

---

## 1. Prerequisites & Platform Requirements

Ensure the Rockchip NPU kernel driver is loaded and initialized:

```bash
# Verify NPU device node availability
ls -l /dev/rknpu*

# Verify NPU frequency governor status
cat /sys/class/devfreq/fdab0000.npu/cur_freq
```

Set the NPU governor to maximum performance for deterministic latency:

```bash
echo performance | sudo tee /sys/class/devfreq/fdab0000.npu/governor
```

---

## 2. Compilation

Cross-compile or natively compile `libxinfer_rknn.so` on an `aarch64` Linux target:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_RKNN=ON \
    -DRKNN_RT_INCLUDE_DIR=/usr/include/rknn \
    -DRKNN_RT_LIB=/usr/lib/librknnrt.so
ninja -C build xinfer_rknn
```

---

## 3. Multi-Core NPU Core Allocation (RK3588)

The RK3588 features three independent NPU cores capable of a collective 6 TOPS of compute. `xinfer-essential` provides explicit core-mask scheduling to support deterministic, multi-threaded pipelines:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/rknn_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.rknn";
config.backend = xinfer::BackendType::RKNN;

xinfer::RKNNOptions rknn_opts;
// Bind model instance exclusively to Core 0 (Options: CORE_0, CORE_1, CORE_2, CORE_ALL)
rknn_opts.core_mask = xinfer::RKNNCoreMask::CORE_0;
config.custom_options = rknn_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();
```

---

## 4. Zero-Copy Memory via Linux Kernel `DMA-BUF`

The RKNN backend supports direct hardware execution from Linux `DMA-BUF` file descriptors. This avoids copying data when reading from high-speed network interfaces (AF_XDP) or V4L2 video streams:

```text
[Linux Kernel Network / Camera Driver]
                  │
                  ▼ Emits DMA-BUF File Descriptor (int fd)
+─────────────────────────────────────────────────────────────+
| rknn_create_mem_from_fd()                                   |
|   - Bypasses user-space virtual memory                      |
|   - Maps physical page addresses directly to RK3588 NPU MMU |
+─────────────────────────────────────────────────────────────+
                  │
                  ▼
[Rockchip Tri-Core NPU Compute Engine]
```

### DMA-BUF Zero-Copy Binding Implementation

```cpp
int dma_fd = acquire_kernel_dma_buffer_fd();
size_t buffer_bytes = 512 * 512 * 3;

// Map external DMA-BUF directly to the inference input handle
auto input_tensor = xinfer::Tensor::create_from_dmabuf(
    desc,
    dma_fd,
    buffer_bytes
);

engine.bind_input("image_input", input_tensor);

// Execute inference with zero intermediate memory copies
engine.forward();
```

---

## 5. Performance Diagnostics & Sizing

| Workload | Input Dimension | Active Cores | Precision | Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Tabular NetFlow** | $1 \times 32$ | 1 Core | INT8 | **$8.9\,\mu\text{s}$** |
| **YOLOv8s Detection** | $640 \times 640 \times 3$ | 3 Cores | INT8 | **$12.3\,\text{ms}$** |
| **Industrial SCADA AE**| $1 \times 64$ | 1 Core | FP16 | **$14.2\,\mu\text{s}$** |

