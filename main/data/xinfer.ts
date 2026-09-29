export interface SiliconPlatform {
  id: string;
  n: string;
  vendor: string;
  name: string;
  klass: string;
  artifacts: string[];
  memory: string;
  backend: string;
  accel: string;
  latency: number;
  dma: string[];
  note: string;
}

export const SILICON_CLASSES = [
  { id: "gpu", label: "GPU / Unified", color: "#00FFA3" },
  { id: "npu", label: "NPU / SoC", color: "#00E5FF" },
  { id: "asic", label: "Dedicated ASIC", color: "#FFB800" },
  { id: "fpga", label: "FPGA / Bitstream", color: "#FF3366" },
];

export const PLATFORMS: SiliconPlatform[] = [
  { id: "tensorrt", n: "01", vendor: "NVIDIA", name: "TensorRT", klass: "gpu", artifacts: [".engine", ".onnx"], memory: "Unified Memory / Host Pinned", backend: "libnvinfer + CUDA 12 stream executor", accel: "NVIDIA L4 / A2 / Jetson Orin Tensor Cores", latency: 12.4, dma: ["Host pinned staging (cudaHostAlloc)", "Unified virtual addressing", "Device tensor arena", "Tensor Core kernel"], note: "Pinned host allocations are mapped into the device address space, so the NetFlow feature vector is consumed by Tensor Cores without a staging memcpy." },
  { id: "openvino", n: "02", vendor: "Intel", name: "OpenVINO", klass: "gpu", artifacts: [".xml + .bin", ".onnx"], memory: "Direct Pointer Pass", backend: "Inference Engine core + oneDNN primitives", accel: "Xeon AVX-512 / Iris Xe iGPU / Movidius VPU", latency: 18.2, dma: ["Application feature buffer", "ov::Tensor wraps raw pointer", "oneDNN primitive graph", "AVX-512 / VPU execute"], note: "ov::Tensor is constructed directly over the caller's buffer pointer. No allocation, no copy — the runtime reads the appliance's own memory in place." },
  { id: "rknn", n: "03", vendor: "Rockchip", name: "RKNN", klass: "npu", artifacts: [".rknn"], memory: "DMA-BUF Direct Map", backend: "librknnrt NPU service", accel: "RK3588 6 TOPS tri-core NPU", latency: 24.1, dma: ["DMA-BUF fd allocation", "NPU IOMMU import", "Zero-copy tensor bind", "Tri-core NPU execute"], note: "The feature buffer is allocated as a DMA-BUF file descriptor and imported straight into the NPU IOMMU domain — the CPU never touches the payload again." },
  { id: "qnn", n: "04", vendor: "Qualcomm", name: "QNN", klass: "npu", artifacts: [".bin", ".so"], memory: "RPC Shared Memory", backend: "Qualcomm Neural Network SDK / HTP backend", accel: "Hexagon HTP DSP + Adreno", latency: 21.7, dma: ["ION / rpcmem_alloc region", "FastRPC shared mapping", "Hexagon DSP tensor", "HTP vector execute"], note: "rpcmem allocations are shared between the application processor and the Hexagon DSP, so inference crosses the FastRPC boundary by reference." },
  { id: "vitis", n: "05", vendor: "AMD / Xilinx", name: "Vitis AI", klass: "fpga", artifacts: [".xmodel"], memory: "Dedicated PCIe DMA", backend: "VART runtime + XRT driver stack", accel: "Alveo U55C / Zynq UltraScale+ DPU", latency: 31.6, dma: ["XRT buffer object (BO)", "PCIe scatter-gather DMA", "DPU instruction queue", "Programmable logic execute"], note: "XRT buffer objects are pre-registered once at graph load; per-inference cost is a descriptor push, not a data transfer." },
  { id: "coreml", n: "06", vendor: "Apple", name: "Silicon CoreML", klass: "gpu", artifacts: [".mlmodelc"], memory: "Unified Silicon RAM", backend: "CoreML framework + MPSGraph", accel: "M-series Neural Engine (16-core ANE)", latency: 14.8, dma: ["Unified memory allocation", "MLMultiArray no-copy wrap", "ANE command buffer", "Neural Engine execute"], note: "On unified memory silicon there is no discrete device pool at all — CPU, GPU and Neural Engine address the identical physical page." },
  { id: "ryzenai", n: "07", vendor: "AMD", name: "Ryzen AI", klass: "npu", artifacts: [".onnx"], memory: "Shared Buffer Mapping", backend: "Vitis AI EP for ONNX Runtime", accel: "XDNA NPU (Ryzen AI 300 series)", latency: 19.9, dma: ["Shared host buffer", "XDNA aperture mapping", "Column-partitioned tiles", "AIE array execute"], note: "The XDNA aperture maps host pages into the AI engine array, letting the NPU stream tiles from the application buffer with no intermediate staging." },
  { id: "neuropilot", n: "08", vendor: "MediaTek", name: "NeuroPilot", klass: "npu", artifacts: [".dla", ".pte"], memory: "Ion Memory Allocator", backend: "NeuroPilot SDK / Neuron runtime", accel: "Genio APU 3.0", latency: 26.3, dma: ["ION heap allocation", "APU MMU import", "Neuron tensor handle", "APU MAC array execute"], note: "ION heaps give contiguous physical memory addressable by the APU MMU, which is what keeps the copy count at zero on constrained SoCs." },
  { id: "hailort", n: "09", vendor: "Hailo", name: "HailoRT", klass: "asic", artifacts: [".hef"], memory: "Zero-Copy Driver Buffer", backend: "HailoRT + PCIe kernel driver", accel: "Hailo-8 26 TOPS dataflow processor", latency: 16.5, dma: ["Driver-allocated DMA pool", "vDMA descriptor chain", "Dataflow ingress stream", "Structure-driven execute"], note: "HailoRT exposes its own driver-owned DMA pool; the appliance writes feature vectors directly into descriptor-chained pages the ASIC already owns." },
  { id: "cvflow", n: "10", vendor: "Ambarella", name: "CVflow", klass: "asic", artifacts: [".cavalry"], memory: "Hardware Memory Ring", backend: "Cavalry / CVflow SDK", accel: "CV72 / CV5 vision DSP", latency: 22.8, dma: ["Cavalry ring slot claim", "Hardware ring descriptor", "CVflow DAG dispatch", "Vision DSP execute"], note: "A hardware-managed ring buffer hands slots between producer and accelerator, so pipelining costs a slot index rather than a buffer copy." },
  { id: "enn", n: "11", vendor: "Samsung", name: "ENN", klass: "npu", artifacts: [".nnc"], memory: "Direct Android ION", backend: "Exynos Neural Network SDK", accel: "Exynos NPU + DSP cluster", latency: 27.4, dma: ["Android ION allocation", "ENN buffer registration", "NPU/DSP tensor bind", "Exynos NPU execute"], note: "ENN registers ION file descriptors once per session; subsequent inferences reuse the registration, avoiding per-call mapping overhead." },
  { id: "coral", n: "12", vendor: "Google", name: "Coral Edge TPU", klass: "asic", artifacts: [".tflite"], memory: "USB / PCIe Memory Map", backend: "libedgetpu + TFLite delegate", accel: "Edge TPU 4 TOPS ASIC", latency: 29.2, dma: ["Host mapped region", "USB bulk / PCIe BAR map", "Int8 tensor transfer", "Edge TPU systolic execute"], note: "Requires full int8 quantisation via xInfer Forge; the mapped BAR window keeps transfer overhead flat regardless of vector batch size." },
  { id: "intel-fpga", n: "13", vendor: "Intel", name: "FPGA AI Suite", klass: "fpga", artifacts: [".aocx"], memory: "Altera PCIe Direct DMA", backend: "OpenCL / oneAPI FPGA runtime", accel: "Agilex 7 / Arria 10 soft DLA", latency: 34.1, dma: ["Pinned host buffer", "Altera PCIe DMA engine", "Soft DLA input FIFO", "Bitstream pipeline execute"], note: "The soft DLA IP is synthesised per deployment; latency is fully deterministic because the datapath is fixed silicon logic, not a scheduler." },
  { id: "polarfire", n: "14", vendor: "Microchip", name: "PolarFire VectorBlox", klass: "fpga", artifacts: [".blob"], memory: "AXI Bus Shared RAM", backend: "VectorBlox SDK / RISC-V host", accel: "PolarFire SoC MIVA vector engine", latency: 38.7, dma: ["Shared LPDDR region", "AXI4 master burst", "MIVA vector registers", "Vector engine execute"], note: "Host and accelerator share one AXI-attached DDR region, which is why even a low-power radiation-tolerant part holds a sub-40 µs budget." },
  { id: "lattice", n: "15", vendor: "Lattice", name: "sensAI", klass: "fpga", artifacts: [".bin"], memory: "Direct SPI / SRAM Pass", backend: "sensAI / Propel CNN accelerator IP", accel: "CertusPro-NX / ECP5 CNN core", latency: 44.3, dma: ["On-chip SRAM block", "SPI streaming ingress", "CNN coefficient cache", "Fabric MAC execute"], note: "The smallest supported target. Weights live in on-chip SRAM, so the entire inference happens without touching external memory at all." },
];

export const CPP_SNIPPET = `// Tier 1 zero-copy inference: OpenVINO backend, direct pointer pass.
// No Python, no JVM, no managed allocator in the hot path.

using namespace std::chrono;

int main() {
  // 1. Select the silicon backend. Resolved at load time via dlopen.
  xinfer::Engine engine{
      xinfer::Backend::OpenVINO,
      "/opt/aryorithm/models/netflow_mae.xml"};

  // 2. Claim a DMA-mapped region owned by the caller, not the runtime.
  //    ov::Tensor will wrap this pointer in place — zero copies.
  xinfer::DmaBuffer<float> features = engine.map_dma_buffer(32);

  // 3. Fill the 32-dim NetFlow feature vector from the ring buffer.
  std::span<float> vec = features.span();
  blackbox::extract_netflow_features(ring.next_event(), vec);

  // 4. Execute. The accelerator reads our buffer directly.
  const auto t0 = steady_clock::now();
  const xinfer::Status st = engine.infer(features);
  const auto elapsed = duration_cast<microseconds>(
      steady_clock::now() - t0);

  if (!st.ok()) return 1;

  // 5. Read the reconstruction error straight from device memory.
  const float novelty = engine.output<float>(0);

  // Typical: inference complete in 12 us, 0 memcpy, 0 allocations.
  xinfer::log("inference {} us | novelty {:.3f}", elapsed.count(), novelty);
  return 0;
}`;
