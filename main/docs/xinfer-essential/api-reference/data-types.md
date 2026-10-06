# Data Types, Precision & Enums

Defined in header `<xinfer/data_types.hpp>`  
Namespace: `xinfer`

This header defines the core enumerations and string conversion routines used across `xinfer-essential`.

---

## 1. Enums

### `BackendType`
Specifies the hardware target backend:
```cpp
enum class BackendType : uint32_t {
    AUTO = 0,
    CPU_REFERENCE,
    TENSORRT,
    OPENVINO,
    RKNN,
    QUALCOMM_QNN,
    AMD_VITIS_AI,
    APPLE_COREML,
    AMD_RYZEN_AI,
    MEDIATEK_NEUROPILOT,
    HAILO_HAILORT,
    AMBARELLA_CVFLOW,
    SAMSUNG_ENN,
    GOOGLE_CORAL,
    INTEL_FPGA_AI_SUITE,
    MICROCHIP_VECTORBLOX,
    LATTICE_SENSAI,
    CUSTOM = 255
};
```

### `Precision`
Specifies the floating-point or integer compute precision:
```cpp
enum class Precision : uint8_t {
    FP32,
    FP16,
    BF16,
    INT8,
    INT4,
    BINARY
};
```

### `MemoryType`
Specifies the underlying memory domain:
```cpp
enum class MemoryType : uint8_t {
    HOST,
    HOST_PINNED,
    DEVICE,
    DMA_BUF,
    UNIFIED
};
```

### `DataType`
Specifies tensor element types:
```cpp
enum class DataType : uint8_t {
    FLOAT32,
    FLOAT16,
    BFLOAT16,
    INT8,
    UINT8,
    INT16,
    INT32,
    INT64,
    BOOL,
    CUSTOM
};
```

---

## 2. Utility Functions

```cpp
[[nodiscard]] constexpr std::string_view to_string(BackendType backend) noexcept;
[[nodiscard]] constexpr std::string_view to_string(Precision precision) noexcept;
[[nodiscard]] constexpr std::string_view to_string(MemoryType memory_type) noexcept;
[[nodiscard]] constexpr std::string_view to_string(DataType data_type) noexcept;
[[nodiscard]] constexpr size_t get_element_size(DataType data_type) noexcept;
```

