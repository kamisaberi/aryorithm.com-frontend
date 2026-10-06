# Google Coral Edge TPU Backend (`libxinfer_coral.so`)

The Google Coral backend supports all form factors of the **Google Coral Edge TPU** (M.2, Mini PCIe, Dual Edge TPU, and USB Accelerator). It runs on top of the Gasket kernel driver (`/dev/apex_0`) and the native runtime `libedgetpu1-std`.

---

## 1. Prerequisites & Hardware Verification

Verify that the Gasket/Apex kernel driver is loaded and the hardware device nodes exist:

```bash
# Verify Gasket PCIe/M.2 driver node
ls -l /dev/apex*

# Verify USB Accelerator (if using USB form factor)
lsusb | grep 1a6e:089a # Google Inc.
```

### Required Packages (Debian / Ubuntu)

```bash
sudo apt-get install -y libedgetpu1-std libedgetpu-dev
```

---

## 2. Compilation

Compile the Coral plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_CORAL=ON
ninja -C build xinfer_coral
```

---

## 3. Configuration & Model Ingestion

The Edge TPU backend requires models pre-compiled with the Google `edgetpu_compiler` into custom TensorFlow Lite (`.tflite`) flatbuffers:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/coral_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2_edgetpu.tflite";
config.backend = xinfer::BackendType::GOOGLE_CORAL;
config.precision = xinfer::Precision::INT8;

xinfer::CoralOptions coral_opts;
coral_opts.device_type = xinfer::CoralDeviceType::PCIe; // PCIe or USB
coral_opts.device_index = 0;                            // Index 0 or 1 for Dual Edge TPU
config.custom_options = coral_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();

std::cout << "[xInfer] Bound to Coral Edge TPU Accelerator" << std::endl;
```

---

## 4. Zero-Copy Custom Allocator & Page Locking

The Apex driver requires physical RAM pages to be locked (`mlock`) to facilitate continuous DMA transactions over the PCIe bus without OS paging interruptions:

```cpp
// Allocate page-aligned memory block
void* pinned_ptr = xinfer::allocate_pinned_memory(tensor_bytes);

// Wrap mapped memory inside tensor handle
auto tensor = xinfer::Tensor::create_from_raw_host(
    tensor_desc,
    pinned_ptr,
    tensor_bytes
);

engine.bind_input("flow_features", tensor);
engine.forward();
```

---

## 5. Dual Edge TPU Load Balancing

For deployments with dual-core Coral modules (e.g., M.2 E-key Dual Edge TPU), `xinfer-essential` supports round-robin worker bindings across `/dev/apex_0` and `/dev/apex_1`:

```cpp
// Create context bound to Core 0
xinfer::CoralOptions opts_core0{ .device_index = 0 };
auto engine_core0 = xinfer::InferenceEngine::create_with_options(opts_core0);

// Create context bound to Core 1
xinfer::CoralOptions opts_core1{ .device_index = 1 };
auto engine_core1 = xinfer::InferenceEngine::create_with_options(opts_core1);
```

---

## 6. Performance Diagnostics

| Form Factor | Bus Interface | Precision | Tabular Latency ($N=1$) | Power Draw |
| :--- | :--- | :--- | :--- | :--- |
| **Coral USB**  | USB 3.0 Gen 1 | INT8 | **$42.0\,\mu\text{s}$** | $2.5\,\text{W}$ |
| **Coral M.2**  | PCIe Gen 2 x1  | INT8 | **$28.0\,\mu\text{s}$** | $2.0\,\text{W}$ |
| **Dual Edge TPU**| Dual PCIe Gen 2 | INT8 | **$18.5\,\mu\text{s}$** (Aggregate) | $4.0\,\text{W}$ |

