# 5-Minute "Hello World" Quickstart

This walkthrough guides you through setting up a minimal C++20 program that loads an ONNX classification model, allocates a zero-copy input buffer, and executes a forward inference pass.

---

## 1. Minimal Program Code

Create a file named `hello_xinfer.cpp`:

```cpp
#include <xinfer/xinfer.hpp>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::cout << "[xInfer] Initializing Core Engine..." << std::endl;

    // Step 1: Define engine configuration
    xinfer::EngineConfig config;
    config.model_path = "models/minimal_classifier.onnx";
    config.backend = xinfer::BackendType::AUTO;       // Selects best available hardware
    config.precision = xinfer::Precision::FP32;
    config.enable_zero_copy = true;                   // Use direct host-pinned allocation
    config.device_id = 0;

    // Step 2: Initialize inference engine
    xinfer::InferenceEngine engine;
    try {
        engine.configure(config);
        engine.initialize();
    } catch (const xinfer::InferenceException& ex) {
        std::cerr << "[xInfer FATAL] Initialization failed: " << ex.what() << std::endl;
        return 1;
    }

    // Step 3: Print operational backend details
    std::cout << "[xInfer] Active Accelerator: " << engine.get_active_backend_name() << std::endl;
    std::cout << "[xInfer] Model Inputs Count: " << engine.get_input_count() << std::endl;

    // Step 4: Map input tensor
    // Assume input shape: [1, 8] float vector
    auto input_view = engine.get_input_tensor(0);
    float* raw_input_ptr = input_view->data<float>();

    // Fill sample values directly into mapped memory (Zero-Copy)
    for (size_t i = 0; i < 8; ++i) {
        raw_input_ptr[i] = static_cast<float>(i) * 1.25f;
    }

    // Step 5: Execute forward inference
    try {
        engine.forward();
    } catch (const xinfer::InferenceException& ex) {
        std::cerr << "[xInfer FATAL] Execution failure: " << ex.what() << std::endl;
        return 1;
    }

    // Step 6: Read inference results
    auto output_view = engine.get_output_tensor(0);
    const float* predictions = output_view->data<float>();
    size_t num_classes = output_view->element_count();

    std::cout << "[xInfer] Inference executed successfully!" << std::endl;
    std::cout << "[xInfer] Execution Duration: " 
              << engine.last_inference_microseconds() << " microseconds" << std::endl;
    
    for (size_t i = 0; i < num_classes; ++i) {
        std::cout << "  Class [" << i << "]: " << predictions[i] << std::endl;
    }

    // Step 7: Clean teardown (RAII managed)
    engine.shutdown();
    std::cout << "[xInfer] Teardown complete." << std::endl;

    return 0;
}
```

---

## 2. Compilation

Compile directly using `clang++-16` or `g++-12`:

```bash
clang++-16 -std=c++20 hello_xinfer.cpp -o hello_xinfer \
    -I/usr/local/include \
    -L/usr/local/lib \
    -lxinfer \
    -Wl,-rpath,/usr/local/lib
```

---

## 3. Execution

Ensure a valid model exists at `models/minimal_classifier.onnx`, then execute the binary:

```bash
./hello_xinfer
```

### Expected Terminal Output

```text
[xInfer] Initializing Core Engine...
[xInfer] Active Accelerator: Intel_OpenVINO_NPU
[xInfer] Model Inputs Count: 1
[xInfer] Inference executed successfully!
[xInfer] Execution Duration: 14.2 microseconds
  Class [0]: 0.001241
  Class [1]: 0.998759
[xInfer] Teardown complete.
```
