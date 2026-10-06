# Intel OpenVINO Backend (`libxinfer_openvino.so`)

The Intel OpenVINO backend enables native execution across Intel Core Ultra NPUs (Meteor Lake, Lunar Lake, Arrow Lake), 11th–14th Gen Intel Core processors, Xeon Scalable server CPUs, and Intel Arc discrete GPUs. It interfaces with hardware using the Intel Level Zero compute runtime.

---

## 1. Prerequisites & Driver Verification

Ensure the Intel oneAPI Level Zero driver and OpenVINO runtime are installed:

```bash
# Check Intel NPU driver status
ls -l /dev/accel/accel*

# Verify Level Zero loader discovery
zestat
```

### System Dependencies (Ubuntu 24.04 / 22.04 LTS)

```bash
sudo apt-get install -y \
    intel-openvino-runtime-ubuntu24-2024.1.0 \
    intel-level-zero-gpu \
    level-zero
```

---

## 2. Compilation

Compile the OpenVINO backend plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_OPENVINO=ON \
    -DOpenVINO_DIR=/opt/intel/openvino_2024/runtime/cmake
ninja -C build xinfer_openvino
```

---

## 3. Direct NPU Initialization & Code Example

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/openvino_config.hpp>

xinfer::EngineConfig config;
// Supports both OpenVINO IR (.xml) and direct ONNX files
config.model_path = "/opt/models/network_threat_v2.xml";
config.backend = xinfer::BackendType::OPENVINO;
config.precision = xinfer::Precision::FP16;

// Specify target device: "NPU", "GPU", or "CPU"
xinfer::OpenVINOOptions ov_opts;
ov_opts.target_device = "NPU";
ov_opts.performance_hint = xinfer::OpenVINOPerformanceHint::LATENCY;
ov_opts.num_streams = 1; // Lowest deterministic jitter
config.custom_options = ov_opts.serialize();

xinfer::InferenceEngine engine;
engine.configure(config);
engine.initialize();

std::cout << "[xInfer] Bound to Hardware: " << engine.get_active_backend_name() << std::endl;
```

---

## 4. Zero-Copy Integration via `ov::RemoteTensor`

To achieve sub-microsecond data delivery without copying into `ov::Tensor` objects, `xinfer-essential` maps host-pinned RAM into Level Zero shared virtual allocations:

```text
[Host Pinned RAM (zeDriverAllocHostMem)]
                     │
                     ▼ Direct Pointer Aliasing (Zero-Copy)
[ov::Tensor (Wrapped with external memory pointer)]
                     │
                     ▼
[Intel Core Ultra NPU Compute Engine (via Level Zero direct DMA)]
```

### Implementation

```cpp
// Allocate aligned buffer accessible to the Level Zero runtime
void* aligned_buffer = nullptr;
posix_memalign(&aligned_buffer, 64, tensor_size_bytes);

// Wrap external memory into an xinfer::Tensor view without copying
auto zero_copy_tensor = xinfer::Tensor::create_from_raw_host(
    tensor_desc,
    aligned_buffer,
    tensor_size_bytes
);

engine.bind_input("flow_features", zero_copy_tensor);
engine.forward();
```

---

## 5. Performance Optimization Guidelines

* **NPU Power Profile:** Ensure the system NPU driver is not placed into aggressive power-saving states by adding the kernel argument `intel_vpu.power_profile=1` to `/etc/default/grub`.
* **Precision Selection:** Intel NPUs achieve optimal throughput and lowest latency using `Precision::FP16` or `Precision::INT8`. If `Precision::FP32` is supplied, `libxinfer_openvino.so` automatically inserts transparent precision conversion layers.

