# Writing, Compiling & Testing a Custom Plugin

This guide demonstrates how to build a custom acceleration plugin for `xinfer-essential` from scratch. In this example, we implement a reference mathematical coprocessor plugin named `libxinfer_custom_dsp.so`.

---

## 1. Directory Structure

Organize the plugin source tree as follows:

```text
xinfer-plugin-custom-dsp/
├── CMakeLists.txt
├── include/
│   └── custom_dsp_plugin.hpp
└── src/
    └── custom_dsp_plugin.cpp
```

---

## 2. Header Implementation (`custom_dsp_plugin.hpp`)

```cpp
#pragma once

#include <xinfer/plugin_interface.hpp>
#include <vector>

class CustomDspPlugin final : public xinfer::IInferencePlugin {
public:
    CustomDspPlugin() = default;
    ~CustomDspPlugin() override = default;

    [[nodiscard]] xinfer::BackendType get_backend_type() const noexcept override {
        return xinfer::BackendType::CUSTOM;
    }

    [[nodiscard]] std::string_view get_backend_name() const noexcept override {
        return "Custom_Hardware_DSP";
    }

    void initialize(const xinfer::PluginConfig& config) override;
    void load_model(std::span<const uint8_t> model_binary, 
                    std::string_view model_format) override;
    
    void allocate_execution_context(xinfer::ExecutionContext& ctx) override;
    void release_execution_context(xinfer::ExecutionContext& ctx) noexcept override;

    void execute_synchronous(xinfer::ExecutionContext& ctx) override;
    void execute_asynchronous(xinfer::ExecutionContext& ctx, 
                              xinfer::CompletionCallback callback) override;

    void synchronize_device() override;
    void teardown() noexcept override;

private:
    bool is_initialized_{false};
    std::vector<uint8_t> cached_weights_;
};
```

---

## 3. Source Implementation (`custom_dsp_plugin.cpp`)

```cpp
#include "custom_dsp_plugin.hpp"
#include <chrono>
#include <cstring>
#include <iostream>

void CustomDspPlugin::initialize(const xinfer::PluginConfig& config) {
    // Initialize DSP driver or memory mapped IO registers here
    is_initialized_ = true;
}

void CustomDspPlugin::load_model(std::span<const uint8_t> model_binary, 
                                 std::string_view model_format) {
    if (!is_initialized_) {
        throw xinfer::InferenceException(
            xinfer::ErrorCode::ERR_ENGINE_NOT_INITIALIZED,
            "Plugin not initialized"
        );
    }
    // Cache model weights in aligned memory
    cached_weights_.assign(model_binary.begin(), model_binary.end());
}

void CustomDspPlugin::allocate_execution_context(xinfer::ExecutionContext& ctx) {
    // Pre-allocate scratchpads or hardware channel descriptors for this thread
}

void CustomDspPlugin::release_execution_context(xinfer::ExecutionContext& ctx) noexcept {
    // Release thread hardware channels
}

void CustomDspPlugin::execute_synchronous(xinfer::ExecutionContext& ctx) {
    auto input_tensor = ctx.get_input_tensor(0);
    auto output_tensor = ctx.get_output_tensor(0);

    const float* in_ptr = input_tensor->data<float>();
    float* out_ptr = output_tensor->data<float>();
    size_t count = input_tensor->element_count();

    // Fast-path hardware compute loop (e.g., vectorized ReLU / forward transform)
    for (size_t i = 0; i < count; ++i) {
        out_ptr[i] = in_ptr[i] > 0.0f ? in_ptr[i] : 0.0f;
    }
}

void CustomDspPlugin::execute_asynchronous(xinfer::ExecutionContext& ctx, 
                                           xinfer::CompletionCallback callback) {
    auto start = std::chrono::steady_clock::now();
    execute_synchronous(ctx);
    auto end = std::chrono::steady_clock::now();
    double latency = std::chrono::duration_cast<std::chrono::duration<double, std::micro>>(
        end - start
    ).count();
    
    if (callback) {
        callback(xinfer::ErrorCode::SUCCESS, latency);
    }
}

void CustomDspPlugin::synchronize_device() {
    // Flush hardware command queues
}

void CustomDspPlugin::teardown() noexcept {
    cached_weights_.clear();
    is_initialized_ = false;
}

// ================= Factory Exports =================
extern "C" {
    XINFER_API xinfer::IInferencePlugin* create_xinfer_plugin() {
        return new CustomDspPlugin();
    }

    XINFER_API void destroy_xinfer_plugin(xinfer::IInferencePlugin* plugin) {
        delete plugin;
    }

    XINFER_API const char* get_plugin_abi_version() {
        return XINFER_ABI_VERSION_STRING;
    }
}
```

---

## 4. CMake Build Configuration (`CMakeLists.txt`)

```cmake
cmake_minimum_required(VERSION 3.24)
project(xinfer_custom_dsp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enforce strict hidden visibility
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)

find_package(xinfer REQUIRED CONFIG)

add_library(xinfer_custom_dsp SHARED
    src/custom_dsp_plugin.cpp
)

target_include_directories(xinfer_custom_dsp PRIVATE include)

target_link_libraries(xinfer_custom_dsp
    PRIVATE
        xinfer::xinfer_headers
)

# Set output library prefix and name
set_target_properties(xinfer_custom_dsp PROPERTIES
    PREFIX "lib"
    OUTPUT_NAME "xinfer_custom_dsp"
)

install(TARGETS xinfer_custom_dsp DESTINATION /usr/local/lib/xinfer-plugins)
```

---

## 5. Verification & Symbol Audit

Compile and verify that internal symbols are hidden:

```bash
mkdir build && cd build
cmake .. && make
nm -D --defined-only libxinfer_custom_dsp.so
```

### Expected Symbol Output

```text
0000000000001200 T create_xinfer_plugin
0000000000001220 T destroy_xinfer_plugin
0000000000001240 T get_plugin_abi_version
```

