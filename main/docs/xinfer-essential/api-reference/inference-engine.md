# Class `xinfer::InferenceEngine`

Defined in header `<xinfer/inference_engine.hpp>`  
Namespace: `xinfer`

`InferenceEngine` is the central orchestrator responsible for loading models, dispatching computation to hardware accelerator plugins, and managing input/output tensor views.

---

## 1. Class Synopsis

```cpp
namespace xinfer {

class XINFER_API InferenceEngine {
public:
    InferenceEngine();
    explicit InferenceEngine(const EngineConfig& config);
    ~InferenceEngine();

    // Non-copyable, movable
    InferenceEngine(const InferenceEngine&) = delete;
    InferenceEngine& operator=(const InferenceEngine&) = delete;
    InferenceEngine(InferenceEngine&&) noexcept;
    InferenceEngine& operator=(InferenceEngine&&) noexcept;

    // Initialization & Lifecycle
    void configure(const EngineConfig& config);
    void initialize();
    void shutdown() noexcept;

    // Fast-Path Compute Execution
    void forward();
    void forward_async(std::function<void(ErrorCode, double)> callback);
    void synchronize();

    // Tensor Management
    [[nodiscard]] std::shared_ptr<Tensor> get_input_tensor(std::string_view name);
    [[nodiscard]] std::shared_ptr<Tensor> get_input_tensor(size_t index);
    [[nodiscard]] std::shared_ptr<const Tensor> get_output_tensor(std::string_view name) const;
    [[nodiscard]] std::shared_ptr<const Tensor> get_output_tensor(size_t index) const;
    void bind_input(std::string_view name, std::shared_ptr<Tensor> tensor);

    // Introspection & Diagnostics
    [[nodiscard]] double last_inference_microseconds() const noexcept;
    [[nodiscard]] std::string_view get_active_backend_name() const noexcept;
    [[nodiscard]] size_t get_input_count() const noexcept;
    [[nodiscard]] size_t get_output_count() const noexcept;
    [[nodiscard]] TensorDescriptor get_input_descriptor(size_t index) const;
    [[nodiscard]] TensorDescriptor get_output_descriptor(size_t index) const;

    // Multi-Threaded Execution
    [[nodiscard]] std::unique_ptr<ExecutionContext> create_execution_context();

private:
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

} // namespace xinfer
```

---

## 2. Member Functions

### `configure`
```cpp
void configure(const EngineConfig& config);
```
Sets the engine operational parameters. Must be invoked before `initialize()`. Throws `InferenceException` if the configuration parameters are invalid.

---

### `initialize`
```cpp
void initialize();
```
Dispatches to `PluginManager` to load the appropriate hardware backend, validates the model SHA-256 hash via `ModelHub`, pins memory scratchpads, and compiles the hardware execution graph.

---

### `forward`
```cpp
void forward();
```
Executes a synchronous forward inference pass using the currently bound input tensors. This method blocks until hardware computation completes. Guarantees zero heap allocation in steady state.

---

### `get_input_tensor`
```cpp
std::shared_ptr<Tensor> get_input_tensor(std::string_view name);
std::shared_ptr<Tensor> get_input_tensor(size_t index);
```
Acquires a handle to an input tensor buffer by port name or ordinal index. The underlying memory is pre-allocated and pinned.

---

### `bind_input`
```cpp
void bind_input(std::string_view name, std::shared_ptr<Tensor> tensor);
```
Binds an externally created tensor (e.g., a Linux kernel DMA-BUF descriptor or host-pinned buffer) to the target input port. Enables direct zero-copy data ingestion.

---

### `create_execution_context`
```cpp
std::unique_ptr<ExecutionContext> create_execution_context();
```
Creates an independent, thread-confined execution context sharing the engine's immutable model weights. Used for multi-threaded inference scaling.

