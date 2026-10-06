# Class `xinfer::InferenceException` & Error Handling

Defined in header `<xinfer/exception.hpp>`  
Namespace: `xinfer`

`xinfer-essential` handles errors through standard C++20 exceptions derived from `std::exception` alongside structured error codes.

---

## 1. Class Synopsis

```cpp
namespace xinfer {

enum class ErrorCode : int32_t {
    SUCCESS = 0,
    ERR_ENGINE_NOT_INITIALIZED = -1,
    ERR_ENGINE_BUSY = -2,
    ERR_DEVICE_NOT_FOUND = -3,
    ERR_OUT_OF_MEMORY = -4,
    ERR_MEMORY_PIN_FAILED = -5,
    ERR_FILE_NOT_FOUND = -6,
    ERR_INTEGRITY_CHECK_FAILED = -7,
    ERR_PLUGIN_LOAD_FAILED = -8,
    ERR_ABI_MISMATCH = -9,
    ERR_MODEL_DESERIALIZATION_FAILED = -10,
    ERR_INCOMPATIBLE_MEMORY_DOMAINS = -11,
    ERR_TIMEOUT = -12,
    ERR_REMOTE_SYNC_FAILED = -13,
    ERR_INTERNAL_EXCEPTION = -99
};

class XINFER_API InferenceException : public std::exception {
public:
    explicit InferenceException(ErrorCode code, std::string message, int system_code = 0) noexcept;
    ~InferenceException() override = default;

    [[nodiscard]] const char* what() const noexcept override;
    [[nodiscard]] ErrorCode error_code() const noexcept;
    [[nodiscard]] int system_code() const noexcept;

private:
    ErrorCode code_;
    std::string message_;
    int system_code_{0};
};

} // namespace xinfer
```

---

## 2. Idiomatic Error Handling Example

```cpp
#include <xinfer/xinfer.hpp>
#include <iostream>

int main() {
    try {
        xinfer::EngineConfig config;
        config.model_path = "/opt/models/network_threat_v2.onnx";
        config.expected_sha256 = "e9a2c31e...";

        xinfer::InferenceEngine engine(config);
        engine.initialize();
        engine.forward();

    } catch (const xinfer::InferenceException& ex) {
        std::cerr << "[xInfer Exception Caught]\n"
                  << "  Code       : " << static_cast<int>(ex.error_code()) << "\n"
                  << "  Description: " << ex.what() << "\n"
                  << "  System Code: " << ex.system_code() << std::endl;
        return 1;
    } catch (const std::exception& ex) {
        std::cerr << "Standard Exception: " << ex.what() << std::endl;
        return 2;
    }

    return 0;
}
```
