# Microchip VectorBlox Backend (`libxinfer_vectorblox.so`)

The Microchip VectorBlox backend accelerates neural networks on **Microchip PolarFire SoC FPGAs** using the CoreVectorBlox IP processor core. It operates via the Linux UIO (Userspace I/O) driver subsystem and direct AXI memory-mapped registers.

---

## 1. Prerequisites & UIO Driver Verification

Verify that the CoreVectorBlox UIO kernel driver is bound to the FPGA hardware fabric:

```bash
# Verify UIO device registration
ls -l /dev/uio*

# Confirm FPGA fabric interrupts
cat /proc/interrupts | grep -i vectorblox
```

### System Dependencies

* **PolarFire SoC Linux BSP:** Buildroot or Yocto ARM64 / RISC-V (`rv64gc`).
* **Microchip VectorBlox SDK:** Version `>= 2.0`.

---

## 2. Compilation

Compile the VectorBlox backend using the RISC-V or ARM cross-compilation toolchain:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_VECTORBLOX=ON \
    -DVECTORBLOX_SDK_ROOT=/opt/microchip/vectorblox
ninja -C build xinfer_vectorblox
```

---

## 3. Configuration & Blob Execution

The backend executes compiled VectorBlox Model Binary (`.blob`) files:

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/vectorblox_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2.blob";
config.backend = xinfer::BackendType::MICROCHIP_VECTORBLOX;
config.precision = xinfer::Precision::INT8;

xinfer::VectorBloxOptions vb_opts;
vb_opts.uio_device_node = "/dev/uio0";
vb_opts.axi_base_address = 0x60000000;
config.custom_options = vb_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();

engine.forward();
```

---

## 4. Zero-Copy AXI Shared Scratchpad RAM

CoreVectorBlox fetches activations directly from non-cached DDR or on-chip AXI scratchpad SRAM (`/dev/mem` or UIO mapping):

```text
[PolarFire SoC RISC-V Core]
               │
               ▼ Direct Memory Mapped AXI Bus Write
+─────────────────────────────────────────────────────────────+
| CoreVectorBlox AXI4 Non-Cached Scratchpad Memory             |
|   - Physical contiguous hardware memory                      |
|   - Direct access without cache coherence overhead          |
+─────────────────────────────────────────────────────────────+
               │
               ▼
[VectorBlox Neural Processing Unit IP Core in FPGA Fabric]
```

### Buffer Binding Implementation

```cpp
// Map physical AXI non-cached memory directly to input tensor
void* axi_scratchpad_ptr = mmap_uio_buffer(uio_fd, buffer_size);

auto tensor = xinfer::Tensor::create_from_raw_host(
    desc,
    axi_scratchpad_ptr,
    buffer_size
);

engine.bind_input("flow_features", tensor);
engine.forward();
```

---

## 5. Performance Diagnostics

| Target Platform | FPGA Family | Frequency | Power Consumption | Tabular Latency ($N=1$) |
| :--- | :--- | :--- | :--- | :--- |
| **PolarFire MPFS250T** | PolarFire SoC | 150 MHz | **$1.8\,\text{W}$** | **$34.0\,\mu\text{s}$** |
| **PolarFire MPFS095T** | PolarFire SoC | 125 MHz | **$1.2\,\text{W}$** | **$48.5\,\mu\text{s}$** |

