# The C++20 `IInferencePlugin` ABI Contract

All hardware acceleration backends in `xinfer-essential` must implement the pure virtual interface `IInferencePlugin`. This contract provides a consistent lifecycle API for configuration, model compilation, execution context allocation, and synchronous/asynchronous execution.

---

## 1. Interface Definition (`<xinfer/plugin_interface.hpp>`)

```cpp
#pragma once

#include <xinfer/data_types.hpp>
#include <xinfer/execution_context.hpp>
#include <xinfer/tensor.hpp>
#include <functional>
#include <span>
#include <string_view>
#include <memory>

namespace xinfer {

// Configuration parameters passed to the plugin during initialization
struct PluginConfig {
    int device_id{0};
    Precision precision{Precision::FP16};
    bool enable_zero_copy{true};
    std::string_view custom_options{};
};

// Callback type for asynchronous non-blocking inference passes
using CompletionCallback = std::function<void(ErrorCode, double latency_us)>;

class IInferencePlugin {
public:
    virtual ~IInferencePlugin() = default;

    // Backend Identification
    [[nodiscard]] virtual BackendType get_backend_type() const noexcept = 0;
    [[nodiscard]] virtual std::string_view get_backend_name() const noexcept = 0;

    // Lifecycle Routines
    virtual void initialize(const PluginConfig& config) = 0;
    virtual void load_model(std::span<const uint8_t> model_binary, 
                            std::string_view model_format) = 0;
    
    // Execution Context Management (Thread-Local Allocations)
    virtual void allocate_execution_context(ExecutionContext& ctx) = 0;
    virtual void release_execution_context(ExecutionContext& ctx) noexcept = 0;

    // Fast-Path Compute Execution
    virtual void execute_synchronous(ExecutionContext& ctx) = 0;
    virtual void execute_asynchronous(ExecutionContext& ctx, 
                                      CompletionCallback callback) = 0;

    // Hardware Synchronization & Teardown
    virtual void synchronize_device() = 0;
    virtual void teardown() noexcept = 0;
};

} // namespace xinfer
```

---

## 2. Factory Function Signatures (`extern "C"`)

Every compiled plugin shared library must export three extern "C" symbols with default visibility:

```cpp
extern "C" {
    // Instantiates the backend plugin instance on the heap
    XINFER_API xinfer::IInferencePlugin* create_xinfer_plugin();

    // Releases the plugin instance and frees internal resources
    XINFER_API void destroy_xinfer_plugin(xinfer::IInferencePlugin* plugin);

    // Returns the engine ABI version string for compatibility checks
    XINFER_API const char* get_plugin_abi_version();
}
```

---

## 3. The `ExecutionContext` Contract

The `ExecutionContext` object represents the execution state of an inference worker thread. It isolates thread-specific scratchpads, device queue handles (such as `cudaStream_t` or OpenCL command queues), and input/output tensor views.

### Context Guarantees

* **Thread-Confinement:** An `ExecutionContext` instance is executed by only one thread at a time. Plugins do not need internal mutexes inside `execute_synchronous()` when operating on `ExecutionContext` data.
* **Deterministic Lifetime:** `allocate_execution_context()` is invoked once during worker thread setup; `execute_synchronous()` performs zero dynamic heap allocations.

