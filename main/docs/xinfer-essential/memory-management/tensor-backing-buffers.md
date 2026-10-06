# Tensor Backing Buffers & Persistent Allocation Pools

Invoking dynamic heap memory allocations (`malloc`, `free`, `new`, `delete`) during runtime inference introduces thread contention, memory fragmentation, and latency variability.

`xinfer-essential` guarantees deterministic runtimes by using **pre-allocated, persistent backing stores** and **reusable memory pools**.

---

## 1. Tensor Buffer Ownership Models

`xinfer::Tensor` supports two distinct memory management models:

```text
 1. OWNING BACKING STORE (xinfer::TensorPool managed)
    ┌──────────────────────┐
    │    xinfer::Tensor    │──► Owns internal PinnedMemoryBlock
    └──────────────────────┘     Lifetime managed via RAII

 2. NON-OWNING BORROWED VIEW (External DMA / Hardware Map)
    ┌──────────────────────┐
    │    xinfer::Tensor    │──► Points to external memory (e.g., AF_XDP ring, V4L2)
    └──────────────────────┘     Zero-copy; relies on caller for lifetime management
```

---

## 2. Lock-Free Pre-Allocated Tensor Pool

For high-throughput workloads ($> 1,000,000\text{ EPS}$), `xinfer-essential` uses a lock-free fixed-capacity pool to recycle tensor buffers without making runtime kernel allocations:

```cpp
#include <xinfer/tensor.hpp>
#include <atomic>
#include <vector>
#include <memory>

namespace xinfer {

class TensorPool {
public:
    TensorPool(const TensorDescriptor& desc, size_t pool_size)
        : desc_(desc), capacity_(pool_size), free_index_(0) {
        
        buffers_.reserve(pool_size);
        for (size_t i = 0; i < pool_size; ++i) {
            buffers_.push_back(Tensor::create_owning(desc_));
        }
    }

    // Acquire an idle tensor buffer (Lock-free acquire)
    std::shared_ptr<Tensor> acquire() {
        size_t current = free_index_.fetch_add(1, std::memory_order_relaxed);
        if (current >= capacity_) {
            // Pool exhausted: reset and throw exception to maintain deterministic SLAs
            free_index_.fetch_sub(1, std::memory_order_relaxed);
            throw InferenceException(
                ErrorCode::ERR_OUT_OF_MEMORY, 
                "Tensor backing buffer pool exhausted"
            );
        }
        return buffers_[current];
    }

    // Return buffer to pool
    void release() noexcept {
        free_index_.fetch_sub(1, std::memory_order_release);
    }

    void reset() noexcept {
        free_index_.store(0, std::memory_order_release);
    }

private:
    TensorDescriptor desc_;
    size_t capacity_;
    std::atomic<size_t> free_index_;
    std::vector<std::shared_ptr<Tensor>> buffers_;
};

} // namespace xinfer
```

---

## 3. Double-Buffering for Asynchronous Pipelines

To maximize compute utilization, `xinfer-essential` implements double-buffering across inference runs. The host prepares buffer $N+1$ while the hardware accelerator processes buffer $N$:

```text
Time Step T:
   Host CPU:            [ Populate Input Buffer B (Pinned RAM) ]
   Accelerator Core:    [ Executing Compute on Buffer A (Device SRAM) ]

Time Step T+1:
   Host CPU:            [ Populate Input Buffer A (Pinned RAM) ]
   Accelerator Core:    [ Executing Compute on Buffer B (Device SRAM) ]
```

### Double-Buffering Code Example

```cpp
// Initialize double-buffered tensor references
auto buffer_A = engine.create_input_tensor("flow_in");
auto buffer_B = engine.create_input_tensor("flow_in");

bool toggle = false;

while (is_running) {
    auto current_input = toggle ? buffer_A : buffer_B;
    
    // Ingest data into the active staging buffer
    fill_packet_telemetry(current_input->data<float>());

    // Dispatch inference asynchronously on current buffer
    engine.forward_async(current_input);

    // Flip buffer toggle
    toggle = !toggle;
}
```

