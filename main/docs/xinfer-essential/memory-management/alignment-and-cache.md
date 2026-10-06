# 64-Byte Cache Alignment & TLB Optimization

Modern CPU and NPU architectures rely heavily on SIMD vector units (AVX-512, AVX2, ARM Neon) and multi-level data caches. Misaligned memory addresses cross cache line boundaries, causing split-cache access penalties and serialization delays.

`xinfer-essential` enforces **64-byte cache alignment** and leverages **Linux HugePages** to optimize hardware memory throughput.

---

## 1. Microarchitectural Alignment Fundamentals

```text
MISALIGNED ACCESS (Crosses 64-byte boundary -> 2 Bus Cycles, Latency Penalty):
[ Byte 0 ... Byte 60 ] [ Boundary ] [ Byte 64 ... Byte 127 ]
       └────── 32-Byte Vector Read ──────┘ (Split Cache Line Transaction)

--------------------------------------------------------------------------------

OPTIMAL 64-BYTE ALIGNED ACCESS (Single Bus Cycle, Zero Overhead):
[ Cache Line Start (64-byte aligned) ] ───> [ 64 Bytes Continuous Memory ]
       └────── AVX-512 / Neon 512-bit Load ──────┘
```

---

## 2. Alignment Math Utilities

`xinfer-essential` provides `constexpr` alignment utilities for buffer arithmetic:

```cpp
#include <cstddef>
#include <cstdint>

namespace xinfer {

// Align byte size up to the nearest multiple of alignment
[[nodiscard]] constexpr size_t align_up(size_t size, size_t alignment = 64) noexcept {
    return (size + (alignment - 1)) & ~(alignment - 1);
}

// Verify whether an address is aligned
[[nodiscard]] inline bool is_aligned(const void* ptr, size_t alignment = 64) noexcept {
    return (reinterpret_cast<uintptr_t>(ptr) & (alignment - 1)) == 0;
}

} // namespace xinfer
```

---

## 3. False Sharing Prevention in Multi-Threaded State

In concurrent environments, if two threads on different CPU cores write to independent variables located on the same 64-byte cache line, the CPU invalidates the cache line across both cores repeatedly. This phenomenon—**false sharing**—degrades multi-threaded scaling.

`xinfer-essential` pads internal thread-local state structures using standard C++20 hardware interference constants:

```cpp
#include <new>
#include <atomic>

struct alignas(std::hardware_destructive_interference_size) ThreadExecutionContext {
    // Cache Line 1 (Dedicated to Thread A)
    std::atomic<uint64_t> processed_frames{0};
    uint64_t last_timestamp_ns{0};
};

struct alignas(std::hardware_destructive_interference_size) SchedState {
    // Cache Line 2 (Dedicated to Thread B)
    std::atomic<uint32_t> active_workers{0};
};
```

---

## 4. HugePages Integration (`MAP_HUGETLB`)

Standard Linux virtual memory pages are 4 KB in size. Large models and high-throughput ring buffers create thousands of page entries, overwhelming the CPU's **Translation Lookaside Buffer (TLB)** and causing costly page table walks.

`xinfer-essential` supports Linux 2 MB HugePages to reduce TLB misses:

```cpp
#include <sys/mman.h>
#include <xinfer/memory.hpp>

void* allocate_hugepage_memory(size_t size_bytes) {
    // Round size up to nearest 2 MB boundary
    size_t huge_page_size = 2 * 1024 * 1024;
    size_t aligned_size = xinfer::align_up(size_bytes, huge_page_size);

    void* ptr = ::mmap(
        nullptr,
        aligned_size,
        PROT_READ | PROT_WRITE,
        MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB,
        -1,
        0
    );

    if (ptr == MAP_FAILED) {
        // Fallback to standard 64-byte aligned allocation if HugePages are not configured
        return nullptr;
    }

    return ptr;
}
```

### Verifying System HugePages

Check that the host kernel has pre-allocated 2 MB HugePages available:

```bash
cat /proc/meminfo | grep -i hugepages
```

To configure 512 HugePages (1 GB of pooled physical memory) dynamically:

```bash
echo 512 | sudo tee /proc/sys/vm/nr_hugepages
```
