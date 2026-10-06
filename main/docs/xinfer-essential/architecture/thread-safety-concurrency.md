# Thread Safety, Concurrency & Re-Entrancy

`xinfer-essential` is designed for high-concurrency environments, such as multi-threaded network engines and distributed security daemons. It avoids global locks in favor of re-entrant execution contexts and lock-free rings.

---

## 1. Concurrency Model: Shared Weights, Private Contexts

Neural network weights and execution plans are strictly read-only and shared across all threads. Dynamic state (such as intermediate activations, output buffers, and scratchpads) is kept in thread-local execution contexts:

```text
                          +──────────────────────────+
                          │ xinfer::InferenceEngine  │
                          │   (Immutable Weights)    │
                          +──────────────────────────+
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
+─────────────────+           +─────────────────+           +─────────────────+
| ExecutionContext|           | ExecutionContext|           | ExecutionContext|
|    (Thread 1)   |           |    (Thread 2)   |           |    (Thread N)   |
| Scratchpad A    |           | Scratchpad B    |           | Scratchpad C    |
| Stream Handle 1 |           | Stream Handle 2 |           | Stream Handle N |
+─────────────────+           +─────────────────+           +─────────────────+
         │                             │                             │
         ▼                             ▼                             ▼
[CUDA Stream / Q1]            [CUDA Stream / Q2]            [CUDA Stream / QN]
```

---

## 2. Multi-Threaded Execution Example

```cpp
#include <xinfer/xinfer.hpp>
#include <thread>
#include <vector>

void worker_thread(xinfer::InferenceEngine& engine, size_t thread_id) {
    // 1. Acquire an isolated execution context (re-entrant, lock-free)
    auto context = engine.create_execution_context();

    // 2. Map thread-specific inputs
    auto input = context->get_input_tensor(0);
    fill_thread_telemetry_vector(input->data<float>(), thread_id);

    // 3. Execute inference without taking global locks
    context->forward();

    // 4. Extract thread-specific outputs
    auto output = context->get_output_tensor(0);
    evaluate_thread_predictions(output->data<float>());
}

int main() {
    xinfer::EngineConfig config{ .model_path = "/opt/models/ids_classifier.onnx" };
    xinfer::InferenceEngine engine(config);
    engine.initialize();

    // Spawn 8 worker threads sharing the same underlying model weights
    std::vector<std::jthread> workers;
    for (size_t i = 0; i < 8; ++i) {
        workers.emplace_back(worker_thread, std::ref(engine), i);
    }

    return 0; // jthreads join automatically on scope exit
}
```

---

## 3. Re-Entrancy Guarantees

| Component | Concurrency Guarantee | Notes |
| :--- | :--- | :--- |
| `xinfer::InferenceEngine` | **Thread-Safe** (Read-Only) | Multiple threads can invoke `create_execution_context()` concurrently. |
| `xinfer::ExecutionContext`| **Thread-Confined** | Must not be shared across threads without explicit synchronization. |
| `xinfer::Tensor` | **Conditionally Safe** | Concurrent reads are safe; concurrent writes to the same indices require external synchronization. |
| `xinfer::ModelHub` | **Thread-Safe** | Concurrent requests for the same model hash block on a unified cache lock. |
| `xinfer::PluginManager` | **Thread-Safe** | Plugin registry uses internal read-write spinlocks. |

---

## 4. Integration with SPMC Ring Buffers

To maintain sustained throughput ($> 1,250,000\text{ EPS}$), `xinfer-essential` interfaces directly with Single-Producer Multi-Consumer (SPMC) ring buffers, such as the `blackbox-essential` `EventRingBuffer`.

```text
[eBPF Kernel Collector]
          │
          ▼  atomic enqueue
+──────────────────────────────────────────────────────────+
|      Lock-Free SPMC EventRingBuffer (libblackbox.so)      |
+──────────────────────────────────────────────────────────+
    │                     │                     │
    ▼ atomic dequeue      ▼ atomic dequeue      ▼ atomic dequeue
[Worker Thread 1]     [Worker Thread 2]     [Worker Thread 3]
  ExecutionContext       ExecutionContext       ExecutionContext
        │                     │                     │
        ▼                     ▼                     ▼
[xInfer NPU Engine]   [xInfer NPU Engine]   [xInfer NPU Engine]
```

### Invariants for Lock-Free Operation

* **Zero Memory Footprint Expansion:** Workers process events sequentially within their pre-allocated tensor memory regions.
* **Cache-Padded Ring Indices:** Producer and consumer heads are isolated on distinct 64-byte cache lines to eliminate CPU cache invalidation loops (false sharing).

