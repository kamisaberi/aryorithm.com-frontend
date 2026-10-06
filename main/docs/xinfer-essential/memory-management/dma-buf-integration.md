# Direct Mapping of Linux Kernel DMA-BUF Descriptors

In high-frequency cyber-physical systems, transferring network packets or camera sensor data across PCIe and system memory buses using standard `read()`, `write()`, or `memcpy()` primitives degrades performance. `xinfer-essential` integrates with the Linux kernel **DMA-BUF** and **DMA-Heap** subsystems to map physical memory directly into accelerator hardware MMUs.

---

## 1. Linux DMA-BUF Architecture

```text
[ Linux Kernel Subsystem: AF_XDP / V4L2 / DRM ]
                         │
                         ▼ Allocates contiguous physical memory pages
+─────────────────────────────────────────────────────────────+
| Kernel DMA-BUF Exporter (/dev/dma_heap/system)              |
|   - Exposes buffer handle as standard file descriptor (int fd)|
|   - Eliminates kernel-to-user memory transitions            |
+─────────────────────────────────────────────────────────────+
                         │
                         ▼ Transfers raw file descriptor
+─────────────────────────────────────────────────────────────+
| xinfer::Tensor (DMA-BUF Direct Importer)                    |
|   - Imports descriptor into accelerator page tables         |
|   - Maintains zero-copy view of physical RAM                |
+─────────────────────────────────────────────────────────────+
         │                                       │
         ▼ (Hardware MMU Direct Access)          ▼ (Hardware MMU Direct Access)
[ Rockchip RKNN NPU Core ]              [ Intel Level Zero / DRM i915 ]
```

---

## 2. Kernel Interface & Synchronization IOCTLs

Because CPU caches and accelerator memory buses can become desynchronized, `xinfer-essential` executes cache management commands directly against the file descriptor using `linux/dma-buf.h` primitives:

```cpp
#include <linux/dma-buf.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include <stdexcept>
#include <cstdint>

namespace xinfer {

class DmaBufferHandle {
public:
    explicit DmaBufferHandle(int fd, size_t size) 
        : fd_(fd), size_(size) {}

    ~DmaBufferHandle() {
        if (fd_ >= 0) {
            ::close(fd_);
        }
    }

    // Flush CPU caches before accelerator read
    void sync_start_device_read() const {
        struct dma_buf_sync sync = {
            .flags = DMA_BUF_SYNC_START | DMA_BUF_SYNC_READ
        };
        if (::ioctl(fd_, DMA_BUF_IOCTL_SYNC, &sync) < 0) {
            throw std::runtime_error("Failed to start DMA_BUF device sync");
        }
    }

    // Invalidate CPU caches before CPU read
    void sync_end_device_write() const {
        struct dma_buf_sync sync = {
            .flags = DMA_BUF_SYNC_END | DMA_BUF_SYNC_WRITE
        };
        if (::ioctl(fd_, DMA_BUF_IOCTL_SYNC, &sync) < 0) {
            throw std::runtime_error("Failed to end DMA_BUF device sync");
        }
    }

    [[nodiscard]] int get_fd() const noexcept { return fd_; }
    [[nodiscard]] size_t size() const noexcept { return size_; }

private:
    int fd_{-1};
    size_t size_{0};
};

} // namespace xinfer
```

---

## 3. Allocating from `/dev/dma_heap`

For edge nodes running Linux kernel 5.10+, buffers are allocated directly from the kernel DMA-Heap character devices:

```cpp
#include <linux/dma-heap.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include <xinfer/memory.hpp>

int allocate_dma_heap_buffer(size_t size_bytes) {
    int heap_fd = ::open("/dev/dma_heap/system", O_RDWR | O_CLOEXEC);
    if (heap_fd < 0) {
        // Fallback to CMA (Contiguous Memory Allocator) heap if system heap is absent
        heap_fd = ::open("/dev/dma_heap/linux,cma", O_RDWR | O_CLOEXEC);
        if (heap_fd < 0) {
            throw xinfer::InferenceException(
                xinfer::ErrorCode::ERR_INITIALIZATION_FAILED,
                "Unable to open Linux DMA heap device node"
            );
        }
    }

    struct dma_heap_allocation_data alloc_data = {
        .len = size_bytes,
        .fd_flags = O_RDWR | O_CLOEXEC,
        .heap_flags = 0
    };

    if (::ioctl(heap_fd, DMA_HEAP_IOCTL_ALLOC, &alloc_data) < 0) {
        ::close(heap_fd);
        throw xinfer::InferenceException(
            xinfer::ErrorCode::ERR_OUT_OF_MEMORY,
            "Kernel DMA heap allocation failed"
        );
    }

    ::close(heap_fd);
    return alloc_data.fd; // Direct DMA-BUF file descriptor
}
```

---

## 4. Binding to an `xinfer::Tensor`

```cpp
// 1. Acquire raw file descriptor from AF_XDP or DMA-Heap
int dma_fd = allocate_dma_heap_buffer(1024 * 1024);

// 2. Define tensor dimensions
xinfer::TensorDescriptor desc{
    .dimensions = {1, 32},
    .precision = xinfer::Precision::FP32,
    .memory_type = xinfer::MemoryType::DMA_BUF
};

// 3. Construct zero-copy tensor instance wrapping the descriptor
auto tensor = xinfer::Tensor::create_from_dmabuf(desc, dma_fd, 1024 * 1024);

// 4. Bind directly to inference input port
engine.bind_input("flow_vector", tensor);
engine.forward();
```

