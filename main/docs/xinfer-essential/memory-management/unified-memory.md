# Unified Virtual Address Spaces on Heterogeneous SoCs

Integrated Systems-on-Chip (SoCs)—such as the **Apple Silicon M-series, Rockchip RK3588, and Intel Lunar Lake**—share physical LPDDR5/DDR5 system memory across the host CPU, GPU, and Neural Processing Unit (NPU). 

`xinfer-essential` uses unified memory architectures to eliminate PCIe serialization and bus-copy overhead entirely.

---

## 1. Discrete Bus Architecture vs. Unified Memory SoC

```text
DISCRETE ARCHITECTURE (e.g., Intel Xeon + NVIDIA RTX):
[ CPU System RAM ] ────(PCIe Gen 4/5 Bus ~32-64 GB/s)────> [ GPU Dedicated VRAM ]
    - Requires cudaMemcpy or Host Pinned Staging Buffers
    - Higher transfer latency penalty

--------------------------------------------------------------------------------

UNIFIED MEMORY SOC (e.g., Apple M4, Rockchip RK3588, Intel Lunar Lake):
+─────────────────────────────────────────────────────────────────────────────+
|               Unified Physical Memory Pool (LPDDR5 / 100-800 GB/s)          |
+─────────────────────────────────────────────────────────────────────────────+
         ▲                                   ▲                               ▲
         │ Direct Pointer                    │ Direct Pointer                │ Direct Pointer
[ Host CPU (C++20) ]                [ Embedded GPU ]                [ Embedded NPU ]
```

---

## 2. Unified Pointer Coherence & Cache Sychronization

On unified memory platforms, while physical memory is shared, CPU and NPU hardware cache hierarchies (L1/L2 caches) are often separate and non-snooping. Reading from or writing to shared pointers without synchronization can lead to memory incoherency.

`xinfer-essential` handles cache synchronization across heterogeneous SoC cores:

```cpp
namespace xinfer {

enum class CacheSyncDirection {
    CPU_TO_DEVICE,
    DEVICE_TO_CPU
};

void synchronize_unified_cache(void* ptr, size_t size_bytes, CacheSyncDirection direction) {
#if defined(__aarch64__)
    // Direct ARMv8-A cache cleaning instructions
    char* addr = static_cast<char*>(ptr);
    const size_t line_size = 64; // Standard ARM64 cache line size

    if (direction == CacheSyncDirection::CPU_TO_DEVICE) {
        // Clean data cache by Virtual Address to Point of Coherency (PoC)
        for (size_t offset = 0; offset < size_bytes; offset += line_size) {
            asm volatile("dc cvac, %0" : : "r"(addr + offset) : "memory");
        }
    } else {
        // Invalidate data cache by Virtual Address to Point of Coherency (PoC)
        for (size_t offset = 0; offset < size_bytes; offset += line_size) {
            asm volatile("dc ivac, %0" : : "r"(addr + offset) : "memory");
        }
    }
    asm volatile("dsb sy" : : : "memory"); // Enforce full system memory barrier
#endif
}

} // namespace xinfer
```

---

## 3. Allocating Unified Pointers via POSIX System Calls

On Linux ARM64 systems (such as the RK3588), unified memory accessible to both the CPU and NPU can be created using anonymous shared memory maps:

```cpp
#include <sys/mman.h>
#include <xinfer/memory.hpp>

void* allocate_unified_soc_buffer(size_t size_bytes) {
    // Allocate shared, anonymous, page-aligned virtual memory
    void* ptr = ::mmap(
        nullptr,
        size_bytes,
        PROT_READ | PROT_WRITE,
        MAP_SHARED | MAP_ANONYMOUS,
        -1,
        0
    );

    if (ptr == MAP_FAILED) {
        throw xinfer::InferenceException(
            xinfer::ErrorCode::ERR_OUT_OF_MEMORY,
            "Unified SoC mmap allocation failed"
        );
    }

    // Advise kernel to reserve contiguous physical pages immediately
    ::madvise(ptr, size_bytes, MADV_WILLNEED);
    return ptr;
}
```

