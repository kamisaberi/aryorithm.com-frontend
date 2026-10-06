# Struct `xinfer::EngineConfig`

Defined in header `<xinfer/engine_config.hpp>`  
Namespace: `xinfer`

`EngineConfig` defines the initialization parameters passed to `InferenceEngine`.

---

## 1. Structure Definition

```cpp
namespace xinfer {

struct EngineConfig {
    // Model Target
    std::filesystem::path model_path{};
    std::string expected_sha256{};

    // Accelerator Target
    BackendType backend{BackendType::AUTO};
    Precision precision{Precision::FP16};
    int32_t device_id{0};

    // Low-Level Optimization Controls
    bool enable_zero_copy{true};
    bool enable_offline_mode{false};
    size_t num_worker_threads{1};

    // Paths & Custom Options
    std::filesystem::path plugin_search_path{"/usr/local/lib/xinfer-plugins"};
    std::string custom_options{};

    // Serialization
    [[nodiscard]] std::string to_json() const;
    static EngineConfig from_json(std::string_view json_str);
};

} // namespace xinfer
```

---

## 2. Field Specifications

| Field | Default Value | Description |
| :--- | :--- | :--- |
| `model_path` | `""` | Absolute or relative path to the local model artifact. |
| `expected_sha256` | `""` | Expected 64-character hex SHA-256 digest. If empty, hash checks are skipped. |
| `backend` | `BackendType::AUTO` | Target hardware architecture. `AUTO` selects the fastest available backend. |
| `precision` | `Precision::FP16` | Compute precision. Supported options: `FP32`, `FP16`, `BF16`, `INT8`. |
| `device_id` | `0` | Physical device ordinal (e.g., GPU 0 or NPU core 0). |
| `enable_zero_copy` | `true` | Bypasses intermediate copies using DMA-BUF and pinned allocations. |
| `enable_offline_mode`| `false`| Disables network resolution; operates exclusively on local files. |
| `num_worker_threads` | `1` | Pre-allocates execution contexts for parallel workers. |

