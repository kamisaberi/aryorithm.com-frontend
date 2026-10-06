# Ambarella CVFlow Backend (`libxinfer_cvflow.so`)

The Ambarella CVFlow backend targets ultra-low-power vision and industrial edge processors, including the **CV2x, CV5x, and CV7x series**. It communicates with the Ambarella Vector Processor (VP) using the Linux Cavalry kernel driver (`/dev/cavalry`) and Cavalry userspace runtime.

---

## 1. Prerequisites & Driver Initialization

Verify that the Cavalry driver node is active and that the CVFlow microcode is loaded:

```bash
# Verify Cavalry driver device
ls -l /dev/cavalry

# Check firmware microcode status via Cavalry utility
cavalry_log -v
```

### System Dependencies

* **Ambarella Toolchain:** Linaro GCC `aarch64-linux-gnu` toolchain.
* **Ambarella Flexible Parser Engine (FPE) SDK:** Version `>= 2.5`.
* **Cavalry Userspace Libraries:** `libcavalry_mem.so`, `libnn_arm.so`.

---

## 2. Compilation

Cross-compile the CVFlow plugin for Ambarella ARM64 Linux:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_CVFLOW=ON \
    -DCMAKE_TOOLCHAIN_FILE=../cmake/toolchains/aarch64-ambarella.cmake \
    -DCVALRY_SDK_PATH=/opt/ambarella/cavalry_sdk
ninja -C build xinfer_cvflow
```

---

## 3. Configuration & Execution Workflow

The CVFlow backend loads compiled Cavalry binary packages (`.cavalry`):

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/cvflow_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.cavalry";
config.backend = xinfer::BackendType::AMBARELLA_CVFLOW;
config.precision = xinfer::Precision::INT8;

xinfer::CVFlowOptions cv_opts;
cv_opts.vp_core_id = 0;              // Primary Vector Processor core
cv_opts.use_cavalry_mem_pool = true; // Allocate from continuous physical memory
config.custom_options = cv_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();

engine.forward();
```

---

## 4. Zero-Copy Architecture via Cavalry Physical Contiguous Memory

The CVFlow Vector Processor requires memory allocated in physically contiguous address spaces. `libxinfer_cvflow.so` interfaces with the Cavalry memory broker to avoid user-space cache flushing and translation copies:

```text
[Ambarella Hardware Video Subsystem / Sensor Interface]
                           │
                           ▼ Contiguous Physical Frame Buffer
+─────────────────────────────────────────────────────────────+
| cavalry_mem_alloc()                                         |
|   - Physical Address passed directly to Vector Processor    |
|   - Virtual Address mapped for optional CPU access          |
+─────────────────────────────────────────────────────────────+
                           │
                           ▼
[Ambarella CVFlow Vector Processor Core (VP)]
```

### Direct Buffer Mapping

```cpp
// Allocate physically contiguous buffer via Cavalry allocator
void* virt_addr = nullptr;
uint32_t phys_addr = 0;
cavalry_mem_alloc(buffer_size, &virt_addr, &phys_addr);

// Bind physical address to the tensor handle
auto tensor = xinfer::Tensor::create_from_physical_address(
    tensor_desc,
    virt_addr,
    phys_addr,
    buffer_size
);

engine.bind_input("image_input", tensor);
engine.forward();
```

---

## 5. Performance Sizing

| SoC Model | Process Node | Vector Processor Tops | NetFlow Latency ($N=1$) |
| :--- | :--- | :--- | :--- |
| **CV25** | 10nm | 1.0 TOPS | **$21.4\,\mu\text{s}$** |
| **CV22** | 10nm | 3.5 TOPS | **$12.1\,\mu\text{s}$** |
| **CV5**  | 5nm  | 25.0 TOPS | **$8.2\,\mu\text{s}$** |

