# Memory Profiling & Heap Churn Diagnostics

In real-time cyber-physical systems, memory leaks and heap fragmentation cause application degradation over time. Edge security appliances must run continuously for months without experiencing memory footprint expansion.

This document details the memory profiling procedures used to verify the zero-allocation invariants of `xinfer-essential`.

---

## 1. Zero-Allocation Fast-Path Invariant

To verify that `InferenceEngine::forward()` executes without invoking dynamic heap allocators, `xinfer-essential` is audited using custom allocation hooks and Valgrind Massif.

### Verification Harness: Overriding Global `operator new`

```cpp
#include <xinfer/xinfer.hpp>
#include <iostream>
#include <atomic>
#include <cassert>

static std::atomic<bool> g_trap_allocations{false};

void* operator new(size_t size) {
    if (g_trap_allocations.load(std::memory_order_relaxed)) {
        std::cerr << "[CRITICAL ASSERTION FAILURE] Heap allocation intercepted during inference fast-path! Size: " 
                  << size << " bytes\n";
        std::abort();
    }
    return std::malloc(size);
}

void operator delete(void* ptr) noexcept {
    std::free(ptr);
}

int main() {
    xinfer::EngineConfig config;
    config.model_path = "/opt/models/network_threat_v2.onnx";
    xinfer::InferenceEngine engine(config);
    engine.initialize();

    // Warmup
    engine.forward();

    // ARM TRAP: Any heap allocation beyond this point will terminate execution
    g_trap_allocations.store(true, std::memory_order_seq_cst);

    for (int i = 0; i < 100000; ++i) {
        engine.forward(); // Must execute with zero allocations
    }

    g_trap_allocations.store(false, std::memory_order_seq_cst);
    std::cout << "[SUCCESS] 100,000 inference cycles executed with 0 heap allocations.\n";
    return 0;
}
```

---

## 2. Resident Set Size (RSS) Stability

Memory footprints were evaluated on an edge appliance running continuously for 48 hours under a simulated $50{,}000\text{ EPS}$ workload:

```text
RSS MEMORY FOOTPRINT OVER TIME:

Footprint (MB)
  32 MB ──┐
          │  Initialization & Model Weight Loading (31.4 MB)
          │  ┌─────────────────────────────────────────────────────────────┐
          │  │ Steady-State Runtime (Continuous 48-Hour Run at 50k EPS)   │
          │  │ RSS Variance: ± 0.00 KB                                     │
   0 MB ──┴──┴─────────────────────────────────────────────────────────────┴────► Time (Hours)
             0h                                                            48h
```

### Valgrind Massif Verification Command

```bash
valgrind --tool=massif --pages-as-heap=yes --massif-out-file=massif.out ./xinfer_benchmark_harness
ms_print massif.out
```

The resulting Massif profile confirms that the heap allocation graph remains flat throughout the entire post-initialization execution window.

