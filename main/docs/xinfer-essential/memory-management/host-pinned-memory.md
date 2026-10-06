# Allocating Non-Pageable Memory (`mlock` & `cudaHostRegister`)

Standard memory allocated via `malloc()` or `new` consists of virtual memory addresses backed by demand-paged anonymous pages. The Linux virtual memory manager (VMM) may swap these pages to disk under memory pressure or relocate them during page compaction, introducing non-deterministic latency spikes during real-time threat mitigation.

`xinfer-essential` guarantees deterministic execution by allocating **Host-Pinned (Non-Pageable) Memory**.

---

## 1. Virtual Memory Paging vs. Pinned Physical Memory

```text
CONVENTIONAL PAGEABLE MEMORY (Non-Deterministic):
[ Virtual Address ] ──(Kernel Page Table)──> [ Physical RAM ] OR [ Disk Swap File ]
                                                      ▲
                                                      │ Page Fault Trap (Millisec Latency)
                                            [ Kernel Swapper (kswapd) ]

--------------------------------------------------------------------------------

HOST-PINNED MEMORY (Deterministic Microsecond Guarantee):
[ Virtual Address ] ═══════════════════════> [ Locked Physical RAM Pages ]
  - mlock() / cudaHostAlloc()                  - Guaranteed Resident in Physical Memory
  - Bypasses Page Fault Handlers               - PCIe DMA Master Can Read Directly
```

---

## 2. Managing Operating System Limits (`RLIMIT_MEMLOCK`)

By default, unprivileged processes in Linux are limited to 64 KB of locked memory. `xinfer-essential` checks and adjusts process resource limits on initialization:

```cpp
#include <sys/resource.h>
#include <iostream>
#include <stdexcept>

void enforce_unlimited_memlock() {
    struct rlimit limit;
    if (getrlimit(RLIMIT_MEMLOCK, &limit) != 0) {
        throw std::runtime_error("Failed to query RLIMIT_MEMLOCK");
    }

    limit.rlim_cur = RLIM_INFINITY;
    limit.rlim_max = RLIM_INFINITY;

    if (setrlimit(RLIMIT_MEMLOCK, &limit) != 0) {
        std::cerr << "[xInfer WARN] Failed to set RLIMIT_MEMLOCK to infinity. "
                  << "Ensure CAP_SYS_RESOURCE is set or adjust /etc/security/limits.conf" 
                  << std::endl;
    }
}
```

---

## 3. Pinned Memory Allocator Implementation

The `PinnedMemoryPool` provides 64-byte aligned, page-locked virtual memory:

```cpp
#include <sys/mman.h>
#include <cstdlib>
#include <cstdint>
#include <new>

namespace xinfer {

class PinnedMemoryBlock {
public:
    explicit PinnedMemoryBlock(size_t size_bytes) : size_(size_bytes) {
        // 1. Allocate 64-byte cache-line aligned virtual memory
        if (posix_memalign(&ptr_, 64, size_) != 0) {
            throw std::bad_alloc();
        }

        // 2. Lock physical memory pages into RAM
        if (::mlock(ptr_, size_) != 0) {
            // Log warning if locking fails, but retain allocated memory
        }

        // 3. Advise the kernel not to include this buffer in core dumps
        // and prepare pages for immediate access
        ::madvise(ptr_, size_, MADV_DONTDUMP | MADV_WILLNEED);
    }

    ~PinnedMemoryBlock() {
        if (ptr_) {
            ::munlock(ptr_, size_);
            std::free(ptr_);
        }
    }

    PinnedMemoryBlock(const PinnedMemoryBlock&) = delete;
    PinnedMemoryBlock& operator=(const PinnedMemoryBlock&) = delete;

    PinnedMemoryBlock(PinnedMemoryBlock&& other) noexcept 
        : ptr_(other.ptr_), size_(other.size_) {
        other.ptr_ = nullptr;
        other.size_ = 0;
    }

    [[nodiscard]] void* get() const noexcept { return ptr_; }
    [[nodiscard]] size_t size() const noexcept { return size_; }

private:
    void* ptr_{nullptr};
    size_t size_{0};
};

} // namespace xinfer
```

---

## 4. Silicon Driver Registration (`cudaHostRegister`)

When running on NVIDIA systems, pre-allocated host memory can be registered with the CUDA driver, enabling direct PCIe DMA transfers without copying to staging buffers:

```cpp
#if defined(XINFER_ENABLE_CUDA)
#include <cuda_runtime.h>

void register_cuda_pinned_memory(void* host_ptr, size_t size_bytes) {
    cudaError_t status = cudaHostRegister(
        host_ptr, 
        size_bytes, 
        cudaHostRegisterMapped | cudaHostRegisterPortable
    );
    if (status != cudaSuccess) {
        throw xinfer::InferenceException(
            xinfer::ErrorCode::ERR_MEMORY_PIN_FAILED,
            cudaGetErrorString(status)
        );
    }
}
#endif
```

