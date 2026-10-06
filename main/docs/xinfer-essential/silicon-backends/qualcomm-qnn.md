# Qualcomm QNN Backend (`libxinfer_qnn.so`)

The Qualcomm QNN backend enables hardware execution across Snapdragon processors (Snapdragon X Elite, SA8295P Automotive, Snapdragon 8 Gen 2/3). It runs models directly on the Qualcomm Hexagon DSP and Hexagon Tensor Processor (HTP) via the FastRPC kernel bridge.

---

## 1. Prerequisites & Environment Setup

Verify that the Qualcomm Neural Network (QNN) SDK (v2.18+) is available and that the FastRPC driver nodes are accessible:

```bash
# Check Qualcomm FastRPC character device access
ls -l /dev/adsprpc-smd

# Confirm Hexagon runtime architecture
uname -m # Returns aarch64
```

Export the QNN library paths to ensure dynamic resolution of the HTP backend provider:

```bash
export QNN_SDK_ROOT=/opt/qcom/qnn-sdk-2.18
export LD_LIBRARY_PATH=$QNN_SDK_ROOT/lib/aarch64-ubuntu-gcc11.4:$LD_LIBRARY_PATH
export ADSP_LIBRARY_PATH="$QNN_SDK_ROOT/lib/hexagon-v68/unsigned;/usr/lib/rfsa/adsp"
```

---

## 2. Compilation

Compile the QNN backend plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_QNN=ON \
    -DQNN_SDK_ROOT=$QNN_SDK_ROOT
ninja -C build xinfer_qnn
```

---

## 3. Hexagon HTP Performance Profiles & Code Example

The Qualcomm HTP backend supports dynamic clock and power voting via FastRPC. `xinfer-essential` exposes performance profiles to balance execution latency against thermal budgets:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/qnn_config.hpp>

xinfer::EngineConfig config;
// Pre-compiled context binary generated via qnn-context-binary-generator
config.model_path = "/opt/models/network_threat_v2_htp.bin";
config.backend = xinfer::BackendType::QUALCOMM_QNN;

xinfer::QNNOptions qnn_opts;
// Performance profile: BURST, HIGH_PERFORMANCE, SUSTAINED_HIGH_PERFORMANCE, BALANCED
qnn_opts.performance_profile = xinfer::QNNPerfProfile::BURST;
qnn_opts.target_backend_lib = "libQnnHtp.so"; // Route directly to Hexagon Tensor Processor
config.custom_options = qnn_opts.serialize();

xinfer::InferenceEngine engine;
engine.configure(config);
engine.initialize();
```

---

## 4. Zero-Copy Shared Memory Architecture (FastRPC Shared ION)

Passing data between the ARM host CPU and the Hexagon DSP can become a bottleneck over standard user-space RPC. `xinfer-essential` registers shared memory pools with the Hexagon MMU via FastRPC memory mapping (`QnnMem_register`):

```text
[ARM64 Host User Space]
           │
           │  FastRPC RPC Memory Register (ION / DMA-BUF)
           ▼
+─────────────────────────────────────────────────────────────+
| FastRPC Shared Memory Domain (Hexagon Page Tables)           |
+─────────────────────────────────────────────────────────────+
           │
           ▼ Direct Shared Memory Ingestion
[Qualcomm Hexagon Tensor Processor (HTP)]
```

### Zero-Copy Memory Registration

```cpp
// Allocate an aligned memory buffer registered with FastRPC
void* shared_ion_buffer = xinfer::allocate_fastrpc_buffer(buffer_size_bytes);

// Wrap pointer in an xinfer::Tensor handle
auto qnn_tensor = xinfer::Tensor::create_from_raw_host(
    tensor_desc,
    shared_ion_buffer,
    buffer_size_bytes
);

engine.bind_input("flow_vector", qnn_tensor);
engine.forward();
```

---

## 5. Deployment Guidelines

1. **Context Binaries:** For deterministic startup times ($< 50\,\text{ms}$), deploy pre-compiled `.bin` context models instead of compiling ONNX models on the edge node.
2. **Thermal Dissipation:** Sustained execution under `BURST` mode on fanless edge appliances may trigger thermal mitigation. For steady-state workloads, use `SUSTAINED_HIGH_PERFORMANCE`.
