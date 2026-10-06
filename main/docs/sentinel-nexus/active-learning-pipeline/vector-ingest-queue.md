# Concurrent Lock-Free Vector Ingest Queue (200k Capacity)

To ingest high-frequency telemetry streams from up to 5,000 concurrent appliances without lock contention, `sentinel-nexus` utilizes a **Multi-Producer Single-Consumer (MPSC) lock-free ring buffer** with a capacity of **200,000 vectors**.

---

## 1. Queue Architecture

```text
 5,000 Edge Appliances (Multiple Producer Threads over gRPC)
    │                     │                     │
    ▼ try_enqueue()       ▼ try_enqueue()       ▼ try_enqueue()
 ┌─────────────────────────────────────────────────────────────┐
 │ VectorIngestQueue (Pre-Allocated 262,144 Slots - Power of 2)│
 │  - 64-Byte Cache-Line Aligned Atomic Heads and Tails        │
 │  - Contiguous Memory Allocation: 262,144 * 128B = ~33.5 MB  │
 └──────────────────────────────┬──────────────────────────────┘
                                │ try_dequeue() (Single Consumer)
                                ▼
           [ DatasetCurator Worker Thread (CPU Core 6) ]
```

---

## 2. In-Memory Implementation (`VectorIngestQueue.hpp`)

```cpp
#pragma once

#include <atomic>
#include <array>
#include <cstdint>
#include <span>

namespace sentinel::nexus {

struct alignas(64) IngestSlot {
    uint64_t sequence{0};
    uint64_t timestamp_ns{0};
    uint32_t source_node_id{0};
    float features[32]{0.0f}; // 32 continuous dimensions
};

class VectorIngestQueue {
public:
    static constexpr size_t CAPACITY = 262144; // Power of two (2^18)
    static constexpr size_t INDEX_MASK = CAPACITY - 1;

    VectorIngestQueue() {
        for (size_t i = 0; i < CAPACITY; ++i) {
            slots_[i].sequence = i;
        }
    }

    // Thread-safe Multi-Producer Enqueue
    bool try_enqueue(uint32_t node_id, std::span<const float, 32> vec, uint64_t ts_ns) noexcept {
        uint64_t pos = write_cursor_.load(std::memory_order_relaxed);

        while (true) {
            IngestSlot& slot = slots_[pos & INDEX_MASK];
            uint64_t seq = slot.sequence;
            int64_t diff = static_cast<int64_t>(seq) - static_cast<int64_t>(pos);

            if (diff == 0) {
                // Claim slot atomically
                if (write_cursor_.compare_exchange_weak(pos, pos + 1, std::memory_order_relaxed)) {
                    slot.timestamp_ns = ts_ns;
                    slot.source_node_id = node_id;
                    std::copy(vec.begin(), vec.end(), slot.features);
                    // Mark slot ready for consumer
                    slot.sequence = pos + 1;
                    return true;
                }
            } else if (diff < 0) {
                // Ring buffer is full: Tail Drop
                drop_counter_.fetch_add(1, std::memory_order_relaxed);
                return false;
            } else {
                pos = write_cursor_.load(std::memory_order_relaxed);
            }
        }
    }

    // Single-Consumer Dequeue
    bool try_dequeue(IngestSlot& out_slot) noexcept {
        uint64_t pos = read_cursor_.load(std::memory_order_relaxed);
        IngestSlot& slot = slots_[pos & INDEX_MASK];
        uint64_t seq = slot.sequence;
        int64_t diff = static_cast<int64_t>(seq) - static_cast<int64_t>(pos + 1);

        if (diff == 0) {
            read_cursor_.store(pos + 1, std::memory_order_relaxed);
            out_slot = slot;
            slot.sequence = pos + CAPACITY;
            return true;
        }
        return false;
    }

private:
    alignas(64) std::atomic<uint64_t> write_cursor_{0};
    alignas(64) std::atomic<uint64_t> read_cursor_{0};
    alignas(64) std::atomic<uint64_t> drop_counter_{0};
    std::unique_ptr<IngestSlot[]> slots_{new IngestSlot[CAPACITY]};
};

} // namespace sentinel::nexus
```

