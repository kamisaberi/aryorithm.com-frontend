# System Requirements & Prerequisites

Review the toolchain, operating system, and silicon driver requirements before compiling or running `xinfer-essential`.

---

## 1. Host Operating System & Architecture

`xinfer-essential` requires a 64-bit POSIX-compliant operating system with modern kernel DMA-BUF and asynchronous I/O capabilities.

| Operating System | Minimum Version | Recommended Target | Supported Architectures |
| :--- | :--- | :--- | :--- |
| **Ubuntu Linux** | 22.04 LTS | 24.04 LTS / 26.04 Devel | `x86_64`, `aarch64` |
| **Debian** | 12 (Bookworm) | 12 (Bookworm) | `x86_64`, `aarch64` |
| **Red Hat Enterprise Linux** | 9.0 | 9.4 | `x86_64`, `aarch64` |
| **macOS** | 13.0 (Ventura) | 14.0+ (Sonoma) | `arm64` (Apple Silicon) |

!!! note "Linux Kernel Requirements"
    Linux kernel versions **>= 5.15** are required. Kernels **>= 6.5** are recommended to use the latest `dma-buf` zero-copy primitives and Intel Level Zero direct memory export routines.

---

## 2. Compiler & Toolchain Standards

`xinfer-essential` utilizes ISO C++20 features, including concepts, designated initializers, `std::span`, and formatting routines.

* **GCC:** Version **12.1.0** or newer.
* **Clang/LLVM:** Version **16.0.0** or newer.
* **CMake:** Version **3.24.0** or newer.
* **Ninja Build:** Version **1.10.0+** (recommended for parallel compilation).
* **GNU C Library (glibc):** Version **2.35+** (tested up to `glibc 2.43`).

---

## 3. Hardware Accelerator Toolkits & Drivers

To enable target-specific execution backends, ensure the corresponding user-space libraries and kernel drivers are installed on the build or deployment host:

### Intel Platforms (OpenVINO / NPU / iGPU)
* **Intel OpenVINO Toolkit:** Version `2024.1.0` or higher.
* **Intel Level Zero Driver:** Version `1.15.1+`.
* **Intel OneVPL:** `2023.3+` (for hardware-accelerated video decoding).

### NVIDIA Platforms (CUDA / TensorRT)
* **NVIDIA Driver:** Version `>= 535.104.05`.
* **CUDA Toolkit:** Version `12.0` or higher.
* **TensorRT:** Version `8.6` through `10.x`.

### Rockchip Embedded (RK3588, RK3576)
* **RKNPU2 Driver:** Version `>= 1.6.0`.
* **Rockchip DRM Kernel Driver:** Built with `CONFIG_DRM_ROCKCHIP=y`.

### Qualcomm Platforms
* **Qualcomm Neural Processing SDK:** Version `2.18+`.
* **Hexagon DSP Compute Driver:** FastRPC kernel subsystem enabled.

### Hailo Platforms
* **HailoRT:** Version `4.16.0+`.
* **PCIe Driver Module:** `hailo_pci` running and verified via `hailortcli fw-control identify`.

---

## 4. Hardware Sizing Guidelines

```
+--------------------------------------------------------------------------+
| Micro Edge Configuration (Rockchip RK3588 / Hailo-8 M.2 / Raspberry Pi 5)|
|  - RAM: 4 GB minimum (Unified Memory)                                    |
|  - Storage: 16 GB eMMC / NVMe SSD                                        |
|  - Throughput: Up to 15,000 Inference Ops/Second                        |
+--------------------------------------------------------------------------+

+--------------------------------------------------------------------------+
| Enterprise High-Throughput Edge Node (Intel Xeon / Dual RTX A4000)       |
|  - RAM: 32 GB DDR5 (ECC Supported)                                       |
|  - PCIe: Gen 4 x16 / Gen 5 x16                                           |
|  - Storage: 100 GB Enterprise NVMe SSD                                    |
|  - Throughput: Up to 1,250,000 Inference Ops/Second                      |
+--------------------------------------------------------------------------+
```

