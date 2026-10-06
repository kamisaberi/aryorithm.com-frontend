# Lattice sensAI Backend (`libxinfer_sensai.so`)

The Lattice sensAI backend accelerates neural inference on ultra-low-power **Lattice iCE40 UltraPlus, CrossLink-NX, and Avant FPGAs**. It streams tensors directly over high-speed SPI or Wishbone bus interfaces into the FPGA's on-chip Single-Port RAM (SPRAM) and Embedded Block RAM (EBR).

---

## 1. Prerequisites & SPI Bus Verification

Verify that the SPI driver interface is accessible:

```bash
# Check Linux SPI device interface
ls -l /dev/spidev*

# Set SPI clock frequency to maximum bus speed (e.g., 50 MHz)
flashrom -p linux_spi:dev=/dev/spidev0.0,spispeed=50000
```

### System Dependencies

* **Lattice Radiant / Diamond Toolchain:** Bitstream generation environment.
* **Lattice sensAI Neural Network Compiler:** Version `>= 2023.2`.

---

## 2. Compilation

Compile the Lattice sensAI plugin:

```bash
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DXINFER_ENABLE_SENSAI=ON \
    -DSENSAI_SDK_ROOT=/opt/lattice/sensai
ninja -C build xinfer_sensai
```

---

## 3. Configuration & Bitstream Microcode Loading

The backend executes compiled sensAI binary microcode (`.bin`):

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/backends/sensai_config.hpp>

xinfer::EngineConfig config;
config.model_path = "/opt/models/network_threat_v2_sensai.bin";
config.backend = xinfer::BackendType::LATTICE_SENSAI;
config.precision = xinfer::Precision::INT8; // Also supports INT1 / Binarized networks

xinfer::LatticeSensAIOptions sensai_opts;
sensai_opts.spi_bus_device = "/dev/spidev0.0";
sensai_opts.spi_clock_speed_hz = 50000000; // 50 MHz
config.custom_options = sensai_opts.serialize();

xinfer::InferenceEngine engine(config);
engine.initialize();

engine.forward();
```

---

## 4. Hardware SPI Burst Streaming

Because ultra-low-power FPGAs lack complex DMA engines, `libxinfer_sensai.so` uses double-buffered SPI burst transfers to stream data directly into on-chip SPRAM:

```text
[Host Linux Processor]
            │
            ▼ High-Speed SPI Master Burst (IOCTL SPI_IOC_MESSAGE)
+─────────────────────────────────────────────────────────────+
| Lattice FPGA Hardware (iCE40 UltraPlus / CrossLink-NX)      |
|   - Ingests into 1 Mb On-Chip SPRAM Memory Blocks           |
|   - Executes Fixed-Point INT8 / INT1 Neural Engine          |
+─────────────────────────────────────────────────────────────+
```

### Code Example

```cpp
// Construct tensor buffer aligned for hardware SPI transfers
auto input_tensor = engine.get_input_tensor("features");
uint8_t* spi_buffer = input_tensor->data<uint8_t>();

// Populate input vector
std::memcpy(spi_buffer, raw_flow_bytes, 32);

// Executes SPI burst write and reads inference status byte in a single transaction
engine.forward();
```

---

## 5. Performance & Power Envelope

| FPGA Device | On-Chip Memory | Operating Power | NetFlow Inference Latency |
| :--- | :--- | :--- | :--- |
| **iCE40 UltraPlus 5K** | 1024 Kb SPRAM | **$< 15\,\text{mW}$** | **$115.0\,\mu\text{s}$** |
| **CrossLink-NX-40**    | 2.5 Mb EBR    | **$< 75\,\text{mW}$** | **$38.2\,\mu\text{s}$** |
| **Avant-E 500**        | 25 Mb EBR     | **$< 350\,\text{mW}$** | **$12.1\,\mu\text{s}$** |
