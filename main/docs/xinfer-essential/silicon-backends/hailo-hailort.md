# Hailo-8 HailoRT Backend (`libxinfer_hailo.so`)

The Hailo backend provides hardware-accelerated inference for the **Hailo-8 and Hailo-8L** M.2, Mini-PCIe, and USB acceleration modules. It operates via the native HailoRT C/C++ runtime library (`libhailort.so`), utilizing compiled Hailo Executable Format (`.hef`) files.

---

## 1. Prerequisites & Driver Verification

Ensure the Hailo PCIe driver is loaded and the hardware module is detected:

```bash
# Verify kernel module is operational
lsmod | grep hailo_pci

# Query firmware status and chip temperature using HailoRT CLI
hailortcli fw-control identify
```

### Expected Output

```text
Firmware Version : 4.16.0 (release)
Device ID        : 0000:01:00.0
Serial Number    : HLL8...
Part Number      : HM218B1C2FA
```

---

## 2. Compilation

Compile the Hailo backend plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_HAILO=ON \
    -DHAILORT_ROOT=/usr/local/hailort
ninja -C build xinfer_hailo
```

---

## 3. Configuration & VStream Pipeline

Hailo-8 processes tensors through virtual streaming pipelines (VStreams) that feed data directly over PCIe DMA rings to on-chip compute clusters:

```text
[Host Pinned RAM] ──(PCIe DMA)──> [Input VStream] ──> [Hailo-8 Core] ──> [Output VStream] ──(PCIe DMA)──> [Host RAM]
```

### Code Example

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/hailo_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.hef";
config.backend = xinfer::BackendType::HAILO_HAILORT;
config.precision = xinfer::Precision::INT8;

xinfer::HailoOptions hailo_opts;
hailo_opts.device_id = "0000:01:00.0"; // Explicit PCIe BDF routing
hailo_opts.batch_size = 1;
config.custom_options = hailo_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();

std::cout << "[xInfer] Connected to Hailo-8 Coprocessor" << std::endl;
```

---

## 4. Zero-Copy Host Buffers

HailoRT supports zero-copy host transfers by configuring PCIe DMA mappings directly over physical host memory pages:

```cpp
// Allocate 64-byte aligned host memory buffer
void* aligned_input_buffer = nullptr;
posix_memalign(&aligned_input_buffer, 64, input_size_bytes);

// Construct zero-copy tensor binding
auto input_tensor = xinfer::Tensor::create_from_raw_host(
    desc,
    aligned_input_buffer,
    input_size_bytes
);

engine.bind_input("packet_features", input_tensor);

// Dispatches directly to Hailo-8 DMA rings without staging buffers
engine.forward();
```

---

## 5. Thermal & Power Profiling

The Hailo-8 processor provides sustained high-density compute under low-power constraints:

* **Idle Power Consumption:** $< 0.45\,\text{W}$.
* **Active Compute Power (26 TOPS Saturation):** $\sim 2.5\,\text{W} - 3.2\,\text{W}$.
* **Tabular Inference Latency ($N=1$):** **$7.5\,\mu\text{s}$**.
* **YOLOv8s Line-Rate Throughput:** $\approx 185\,\text{FPS}$ sustained.
