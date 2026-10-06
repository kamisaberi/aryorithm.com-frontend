# Plugin Lifecycle: Registration, Validation & Teardown

`xinfer-essential` enforces an explicit state machine for dynamic plugins to prevent resource leaks, unmapped physical memory descriptors, and segmentation faults during host shutdown.

---

## 1. Lifecycle State Machine

```text
 ┌─────────────────┐
 │   UNLOADED      │
 └────────┬────────┘
          │ dlopen() + Version Handshake (get_plugin_abi_version)
          ▼
 ┌─────────────────┐
 │   INSTANTIATED  │
 └────────┬────────┘
          │ initialize(PluginConfig) -> Verify hardware nodes
          ▼
 ┌─────────────────┐
 │   INITIALIZED   │
 └────────┬────────┘
          │ load_model() -> Compile execution engine & graph
          ▼
 ┌─────────────────┐
 │   MODEL_BOUND   │◄───────────────────────────┐
 └────────┬────────┘                            │
          │ allocate_execution_context()        │ Execution complete
          ▼                                     │
 ┌─────────────────┐                            │
 │   EXECUTING     │────────────────────────────┘
 └────────┬────────┘
          │ teardown() -> Release memory & contexts
          ▼
 ┌─────────────────┐
 │   TERMINATED    │
 └────────┬────────┘
          │ destroy_xinfer_plugin() + dlclose()
          ▼
 ┌─────────────────┐
 │   UNLOADED      │
 └─────────────────┘
```

---

## 2. Lifecycle Phase Descriptions

| State | Operation | Permitted Actions | Failure Mode Handling |
| :--- | :--- | :--- | :--- |
| **UNLOADED** | Dynamic Linker Load | Shared object mapped into process address space. | `dlopen` failure throws `ERR_PLUGIN_LOAD_FAILED`. |
| **INSTANTIATED** | ABI Verification | Invokes `get_plugin_abi_version()` to verify compatibility. | Mismatch triggers immediate `dlclose()`; throws `ERR_ABI_MISMATCH`. |
| **INITIALIZED** | Hardware Probe | Probes hardware paths (`/dev/rknpu`, Level Zero loader, CUDA driver). | Missing driver hardware throws `ERR_DEVICE_NOT_FOUND`. |
| **MODEL_BOUND** | Model Ingestion | Parses weights, compiles hardware execution graph, pins scratchpads. | Invalid weights throw `ERR_MODEL_DESERIALIZATION_FAILED`. |
| **EXECUTING** | Forward Compute | Passes data through `execute_synchronous` or `execute_asynchronous`. | Hardware timeout triggers driver reset and exception. |
| **TERMINATED** | Resource Release | Releases pinned memory blocks, flushes queues, destroys handles. | Executes safely within `noexcept` specifications. |

---

## 3. RAII Resource Safety: Guaranteed Teardown

`xinfer::PluginManager` encapsulates plugin handles within custom unique pointers, guaranteeing cleanup even when exceptions are raised during execution:

```cpp
struct PluginDeleter {
    using DestroyFn = void (*)(xinfer::IInferencePlugin*);
    DestroyFn destroy_fn{nullptr};
    void* dl_handle{nullptr};

    void operator()(xinfer::IInferencePlugin* plugin) const noexcept {
        if (plugin && destroy_fn) {
            plugin->teardown();
            destroy_fn(plugin);
        }
        if (dl_handle) {
            ::dlclose(dl_handle);
        }
    }
};

using ScopedPluginPtr = std::unique_ptr<xinfer::IInferencePlugin, PluginDeleter>;
```

If an inference pass throws an exception or a SIGTERM signal is received, the stack unwinds, `teardown()` is invoked, hardware memory is released, and `dlclose()` unmaps the binary from memory without leaking kernel file descriptors.
