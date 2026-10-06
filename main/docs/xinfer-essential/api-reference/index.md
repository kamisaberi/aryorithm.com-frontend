# API Reference Overview

The `xinfer-essential` C++20 API is designed for mission-critical, low-latency applications that require deterministic memory ownership and direct hardware dispatch.

---

## 1. Header Organization

To use `xinfer-essential`, include the primary umbrella header:

```cpp
#include <xinfer/xinfer.hpp>
```

Alternatively, include modular headers for granular compilation:

| Header File | Primary Declarations |
| :--- | :--- |
| `<xinfer/inference_engine.hpp>` | Class `xinfer::InferenceEngine`, `ExecutionContext` |
| `<xinfer/tensor.hpp>` | Class `xinfer::Tensor`, `TensorDescriptor` |
| `<xinfer/engine_config.hpp>` | Struct `xinfer::EngineConfig` |
| `<xinfer/data_types.hpp>` | Enums `BackendType`, `Precision`, `MemoryType`, `DataType` |
| `<xinfer/model_hub.hpp>` | Class `xinfer::ModelHub`, `ModelArtifact` |
| `<xinfer/plugin_manager.hpp>` | Class `xinfer::PluginManager`, `IInferencePlugin` |
| `<xinfer/exception.hpp>` | Class `xinfer::InferenceException`, enum `ErrorCode` |

---

## 2. API Design Principles

1. **Deterministic Memory Ownership:** Tensors wrap pre-allocated memory via non-owning `std::span` views or own cache-aligned buffers through RAII.
2. **Explicit Error Boundaries:** Fast-path forward calls avoid dynamic error allocation by using standard return flags or throwing typed `InferenceException` hierarchies when unrecoverable hardware faults occur.
3. **Thread Confinement:** Shared model parameters remain strictly immutable; dynamic state is isolated within thread-local execution contexts.
4. **Zero-Overhead Abstractions:** Member accessors, alignment checks, and stride conversions are marked `constexpr` and `noexcept`.

