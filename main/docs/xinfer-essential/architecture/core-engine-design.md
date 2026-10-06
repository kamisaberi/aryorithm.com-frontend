# Core Engine Design & Execution Pipeline

The core execution pipeline of `xinfer-essential` isolates client orchestration from hardware-specific dispatch. It provides deterministic latency, zero dynamic heap allocations in the critical path, and fault-isolated backend execution.

---

## 1. Engine State Machine

The runtime transitions through explicit lifecycle states to ensure thread safety, complete buffer allocation, and secure weight validation before any forward pass can occur.

```text
 ┌─────────────────┐
 │  UNINITIALIZED  │
 └────────┬────────┘
          │ configure(EngineConfig)
          ▼
 ┌─────────────────┐
 │   CONFIGURED    │
 └────────┬────────┘
          │ initialize() -> Load plugin, verify SHA-256, pin memory
          ▼
 ┌─────────────────┐
 │      READY      │◄─────────────────────────────┐
 └────────┬────────┘                              │
          │ forward() / forward_async()           │ Inference complete
          ▼                                       │
 ┌─────────────────┐                              │
 │   EXECUTING     │──────────────────────────────┘
 └────────┬────────┘
          │ shutdown() / Error caught
          ▼
 ┌─────────────────┐
 │   TERMINATED    │
 └─────────────────┘
```

### State Definitions

| State | Allowed Transitions | Invariants & Guarantees |
| :--- | :--- | :--- |
| `UNINITIALIZED` | `CONFIGURED` | No memory allocated; no shared libraries loaded. |
| `CONFIGURED` | `READY`, `TERMINATED` | Parameters validated; paths resolved; plugin loaded via `dlopen`. |
| `READY` | `EXECUTING`, `TERMINATED` | Hardware contexts bound; DMA-BUF descriptors mapped; scratchpads locked. |
| `EXECUTING` | `READY`, `TERMINATED` | Active compute pass; tensors locked against concurrent host mutation. |
| `TERMINATED` | `UNINITIALIZED` | Resources unmapped via RAII; hardware queues flushed; buffers unlocked. |

---

## 2. Decoupled Pipeline Architecture

The engine is structured into five isolated layers:

```text
+-----------------------------------------------------------------------------+
| 1. High-Level Client API (C++20 std::span, xinfer::Tensor, Concepts)         |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| 2. Memory Domain Arbiter (Host, Pinned, DMA-BUF, Unified Memory Mapping)    |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| 3. Model Verification & Artifact Cache (xinfer::ModelHub & SHA-256 Engine)   |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| 4. Hardware Abstraction Layer (IInferencePlugin Interface Contract)         |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| 5. Target Execution Drivers (OpenVINO NPU, TensorRT CUDA, RKNN DRM IOCTL)   |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Fast-Path Forward Execution Sequence

During steady-state operation (`READY` $\to$ `EXECUTING` $\to$ `READY`), dynamic memory allocations are strictly prohibited. The forward execution follows a fixed microsecond call path:

```cpp
void InferenceEngine::forward() {
    // 1. Enforce atomic state transition
    State expected = State::READY;
    if (!state_.compare_exchange_strong(expected, State::EXECUTING, 
                                        std::memory_order_acquire)) {
        throw InferenceException(ErrorCode::ERR_ENGINE_BUSY, "Engine currently executing");
    }

    // 2. Hardware Timer Start
    auto start_time = std::chrono::steady_clock::now();

    // 3. Invoke Hardware-Bound Dispatcher (Virtual Call through C++ ABI boundary)
    active_plugin_->execute_synchronous(execution_context_);

    // 4. Record Execution Telemetry
    auto end_time = std::chrono::steady_clock::now();
    last_latency_us_.store(
        std::chrono::duration_cast<std::chrono::duration<double, std::micro>>(
            end_time - start_time
        ).count(),
        std::memory_order_relaxed
    );

    // 5. Release execution lock
    state_.store(State::READY, std::memory_order_release);
}
```

---

## 4. Error Trapping and Fault Isolation

If a hardware accelerator crashes (e.g., PCIe timeout, NPU thermal trip, or driver bus-off error), `xinfer-essential` protects the host daemon process:

1. **Structured Exception Translation:** C-style driver error codes (`cudaError_t`, `rknn_status`, `ze_result_t`) are intercepted at the plugin boundary and rethrown as standard C++20 `xinfer::InferenceException` objects.
2. **Deterministic Context Cleanup:** Dynamic scratchpad buffers and mapped DMA addresses are released immediately to prevent driver memory leaks.
3. **Graceful Degraded Fallback:** If configured, the engine dynamically activates the embedded AVX-512/Neon reference CPU backend without terminating the process.

