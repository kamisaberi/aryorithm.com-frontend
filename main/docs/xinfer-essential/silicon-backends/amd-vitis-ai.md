# AMD Vitis AI Backend (`libxinfer_vitis_ai.so`)

The AMD Vitis AI backend targets adaptive SoCs and FPGAs, including the **AMD Versal AI Edge, Kria K26/KV260 SOMs, and Zynq UltraScale+ MPSoC**. It interfaces directly with the hardware Deep Learning Processing Unit (DPU) via the Xilinx Runtime (XRT) userspace library and kernel driver.

---

## 1. Prerequisites & Hardware Discovery

Verify that the Xilinx Runtime (XRT) kernel modules are loaded and that the target DPU bitstream is programmed into the FPGA fabric:

```bash
# Check XRT device status and PCIe/AXI connectivity
xbutil examine

# Verify available DPU IP blocks
ls -l /dev/dri/renderD*
```

### System Dependencies

* **XRT (Xilinx Runtime):** Version `>= 2023.2`.
* **Vitis AI Runtime (VART):** Version `>= 3.5`.
* **Target Bitstream (`.xclbin`):** Pre-loaded into the FPGA configuration memory.

---

## 2. Compilation

Compile the Vitis AI backend plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_VITIS_AI=ON \
    -DXRT_DIR=/opt/xilinx/xrt \
    -DVART_DIR=/install/reference/vart
ninja -C build xinfer_vitis_ai
```

---

## 3. Runtime Architecture & Execution Workflow

```text
+─────────────────────────────────────────────────────────────────────────────+
|                          xinfer::InferenceEngine                            |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                          VitisAIPlugin Execution                            |
|  - vart::Runner Handle              - Compiled Architecture (.xmodel)       |
|  - xrt::bo Direct Buffer Objects    - AXI Master Interconnect               |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼ (Direct Memory Access via AXI)
+─────────────────────────────────────────────────────────────────────────────+
|                         Hardware DPU (e.g., DPUCZDX8G)                       |
|  - Peak INT8 Compute Engine         - Hardware Convolutions & Activations   |
+─────────────────────────────────────────────────────────────────────────────+
```

### Configuration and Model Loading

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/vitis_ai_config.hpp>

xinfer::EngineConfig config;
// Compiled architecture binary targeting the specific FPGA DPU core footprint
config.model_path = "/opt/models/network_threat_v2.xmodel";
config.backend = xinfer::BackendType::AMD_VITIS_AI;
config.precision = xinfer::Precision::INT8;

xinfer::VitisAIOptions vitis_opts;
vitis_opts.xclbin_path = "/opt/firmware/dpu.xclbin";
vitis_opts.dpu_subgraph = "subgraph_conv2d";
config.custom_options = vitis_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();
```

---

## 4. Zero-Copy Architecture via XRT Buffer Objects (`xrt::bo`)

To bypass CPU memory staging, `libxinfer_vitis_ai.so` maps XRT Buffer Objects (`xrt::bo`) directly into physical contiguous device memory, synchronized via hardware cache flushes:

```cpp
// Acquire pointer to physically contiguous DPU input buffer
auto input_tensor = engine.get_input_tensor("features");
void* host_virt_addr = input_tensor->data<void>();

// Write data directly into mapped memory
std::memcpy(host_virt_addr, raw_feature_vector, 32 * sizeof(int8_t));

// Flush cache lines to ensure DPU sees modified data over the AXI bus
input_tensor->flush_cache();

// Run hardware execution
engine.forward();

// Invalidate CPU cache before reading DPU outputs
auto output_tensor = engine.get_output_tensor("predictions");
output_tensor->invalidate_cache();
```

---

## 5. Performance Diagnostics

| SoC / Target Board | DPU Architecture | Clock Frequency | Workload Precision | Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Kria KV260 SOM** | DPUCZDX8G (B4096) | 300 MHz | INT8 | **$9.5\,\mu\text{s}$** |
| **Versal AI Edge VE2302** | DPUCVDX8G | 700 MHz | INT8 / BFP16 | **$3.1\,\mu\text{s}$** |
| **Zynq ZU9EG MPSoC** | DPUCZDX8G (B4096x2)| 333 MHz | INT8 | **$7.8\,\mu\text{s}$** |

