# Memory Domains & Address Space Arbiter

Hardware accelerators operate across distinct address spaces: discrete host RAM, dedicated GPU VRAM, system shared memory, or specialized device scratchpad SRAM. 

`xinfer-essential` abstracts this complexity through an internal arbiter called the **Memory Domain Subsystem**.

---

## 1. Supported Memory Domains

```text
                   +──────────────────────────────────+
                   │    xinfer::MemoryDomainArbiter   │
                   +──────────────────────────────────+
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
 ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
 │  HOST_PAGEABLE│           │  HOST_PINNED  │           │    DEVICE     │
 │  Standard RAM │           │ Non-swappable │           │ Discrete VRAM │
 └───────────────┘           └───────────────┘           └───────────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
 ┌───────────────┐                                       ┌───────────────┐
 │    DMA_BUF    │                                       │    UNIFIED    │
 │ Linux Kernel  │                                       │ Single Address│
 └───────────────┘                                       └───────────────┘
```

---

## 2. Memory Classification Matrix

| Domain Type | Enum Value | Description | Typical Target Hardware | Accessible by CPU? | Accessible by NPU/GPU? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Host Pageable** | `MemoryType::HOST` | Standard dynamic allocation (`malloc`). Subject to swap. | System CPU fallback | Yes | No (requires staging copy) |
| **Host Pinned** | `MemoryType::HOST_PINNED` | Virtual memory locked in physical RAM. Bypasses paging. | NVIDIA discrete GPUs, Intel NPUs | Yes | Yes (via PCIe DMA) |
| **Device VRAM** | `MemoryType::DEVICE` | High-bandwidth dedicated memory physically on accelerator. | RTX A4000, Jetson Orin VRAM | No (via bus only) | Yes (maximum bandwidth) |
| **DMA-BUF** | `MemoryType::DMA_BUF` | Linux kernel descriptor reference shared across drivers. | Embedded Linux, RK3588, V4L2 | Optional (mmap) | Yes (direct hardware read) |
| **Unified** | `MemoryType::UNIFIED` | Single address space accessible to both CPU and accelerator. | Apple Silicon, RK3588, Lunar Lake | Yes | Yes |

---

## 3. The Memory Arbiter Implementation

The memory arbiter resolves transfers between incompatible memory domains:

```cpp
namespace xinfer {

class MemoryDomainArbiter {
public:
    static void synchronize_buffers(const Tensor& src, Tensor& dst) {
        if (src.get_memory_type() == dst.get_memory_type()) {
            if (src.get_raw_pointer() == dst.get_raw_pointer()) {
                // Identity mapping: Pure zero-copy execution path
                return;
            }
        }

        // Domain conversion logic
        if (src.get_memory_type() == MemoryType::HOST_PINNED &&
            dst.get_memory_type() == MemoryType::DEVICE) {
            // Asynchronous high-speed DMA blit
            execute_dma_transfer(src.get_raw_pointer(), dst.get_raw_pointer(), src.size_bytes());
            return;
        }

        if (src.get_memory_type() == MemoryType::DMA_BUF) {
            // Memory-map file descriptor into destination address space
            map_dmabuf_descriptor(src.get_dma_fd(), dst);
            return;
        }

        throw InferenceException(
            ErrorCode::ERR_INCOMPATIBLE_MEMORY_DOMAINS,
            "Unsupported memory domain transition requested"
        );
    }
};

} // namespace xinfer
```

---

## 4. Cache Coherency and Serialization

Heterogeneous SoCs often lack hardware-enforced cache coherency across CPU and NPU cores. 

To prevent data corruption without adding execution overhead, `xinfer-essential` executes cache management commands directly against the Linux DRM/DMA subsystem:

1. **Prior to NPU Execution:** Invokes `DMA_BUF_IOCTL_SYNC` with `DMA_BUF_SYNC_START` and `DMA_BUF_SYNC_WRITE` flags. CPU dirty cache lines are flushed to system RAM.
2. **Post NPU Execution:** Invokes `DMA_BUF_IOCTL_SYNC` with `DMA_BUF_SYNC_END` and `DMA_BUF_SYNC_READ` flags. Accelerator write lines are invalidated, ensuring CPU reads see current results.

