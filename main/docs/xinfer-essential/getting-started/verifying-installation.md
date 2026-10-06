# Verifying Your Installation

Validate the installation of `xinfer-essential` using the bundled diagnostics utility (`xinfer-diag`) and self-test harness.

---

## 1. Running the System Diagnostics Utility

The `xinfer-diag` tool discovers local acceleration hardware, tests driver permissions, and verifies plugin linkage:

```bash
xinfer-diag --verbose
```

### Sample Output

```text
================================================================================
                      XINFER SYSTEM HARDWARE DIAGNOSTICS
================================================================================
xInfer Version         : 1.0.0 (Release Build)
Git Commit Hash        : e9a2c31
Target ABI             : x86_64-linux-gnu-c++20
Host Linux Kernel      : 6.8.0-31-generic (glibc 2.39)
DMA-BUF Zero-Copy      : Supported (/dev/dma_heap available)

-------------------------------- DISCOVERED BACKENDS ---------------------------
 [01] CPU Reference     : Available (AVX-512, Neon: N/A, Threads: 16)
 [02] Intel OpenVINO    : Available
      -> Device: NPU.3720 (Intel Core Ultra 7 165H NPU)
      -> OpenVINO Version: 2024.1.0-15008-f4bb004a43
 [03] NVIDIA TensorRT   : Unavailable (No active CUDA driver detected)
 [04] Rockchip RKNN     : Unavailable (Host architecture is not aarch64)
 [05] Hailo-8 HailoRT   : Unavailable (Device /dev/hailo0 not found)

-------------------------------- MEMORY ARBITRATION ----------------------------
 Host Pinned Memory    : Functional (Locked Pages Limit: Unlimited)
 Page Size             : 4096 bytes
 Cache Line Alignment  : 64 bytes verified

================================================================================
Status: 2 Backends Ready. Engine verification SUCCESSFUL.
================================================================================
```

---

## 2. Testing Memory Locking Limits (`mlock`)

`xinfer-essential` locks physical RAM pages to prevent operating system swapping on edge nodes. If `mlock` limits are too low, you may encounter `ERR_MEMORY_PIN_FAILED` warnings during initialization.

Verify your limits:

```bash
ulimit -l
```

If the output is not `unlimited`, update `/etc/security/limits.conf`:

```text
*    soft    memlock    unlimited
*    hard    memlock    unlimited
```

Reload your user session after modifying this file.

---

## 3. Running Unit and Regression Tests

If you compiled `xinfer-essential` with `-DXINFER_BUILD_TESTS=ON`, run the automated GoogleTest regression suite:

```bash
cd build
ctest --output-on-failure -V
```

The test pass covers:
* Tensor dimension arithmetic and strides.
* Dynamic plugin loading and error symbol trapping.
* Cache-aligned allocator boundaries.
* Synchronous and asynchronous inference execution tracks.

