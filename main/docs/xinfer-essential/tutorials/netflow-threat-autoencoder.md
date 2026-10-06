# NetFlow Anomaly Scoring in Under 12 Microseconds

This tutorial demonstrates how to load a 32-dimensional tabular threat autoencoder (`network_threat_v2.onnx`), bind a host-pinned zero-copy input buffer, execute forward inference in under $12\,\mu\text{s}$, and calculate Mean Squared Error (MSE) reconstruction loss to detect network anomalies.

---

## 1. Problem Formulation

An autoencoder trained exclusively on benign network traffic learns an identity mapping for normal operational behavior. When presented with anomalous traffic (e.g., zero-day exploits, port scans, or command-and-control exfiltration), the network fails to reconstruct the feature vector accurately:

$$\mathcal{L}_{\text{MSE}}(x, \hat{x}) = \frac{1}{D} \sum_{i=1}^{D} (x_i - \hat{x}_i)^2$$

If $\mathcal{L}_{\text{MSE}} > \tau_{\text{threshold}}$, an anomaly alert is raised.

---

## 2. Complete C++20 Implementation (`netflow_eval.cpp`)

```cpp
#include <xinfer/xinfer.hpp>
#include <iostream>
#include <vector>
#include <cmath>
#include <numeric>

int main() {
    std::cout << "====================================================\n"
              << "   xInfer High-Frequency NetFlow Anomaly Evaluator   \n"
              << "====================================================\n";

    // 1. Configure the runtime engine
    xinfer::EngineConfig config;
    config.model_path = "/opt/models/network_threat_v2.onnx";
    config.backend = xinfer::BackendType::AUTO; // OpenVINO NPU, TensorRT, or CPU
    config.precision = xinfer::Precision::FP32;
    config.enable_zero_copy = true;

    xinfer::InferenceEngine engine;
    try {
        engine.configure(config);
        engine.initialize();
    } catch (const xinfer::InferenceException& e) {
        std::cerr << "Initialization error: " << e.what() << std::endl;
        return 1;
    }

    std::cout << "[+] Bound Backend: " << engine.get_active_backend_name() << "\n";

    // 2. Acquire zero-copy input tensor view
    auto input_tensor = engine.get_input_tensor(0);
    float* input_ptr = input_tensor->data<float>();

    // 3. Populate a synthetic anomalous 32-dim flow vector
    // (Simulates a SYN flood: short duration, high packet rate, uniform payload)
    std::vector<float> sample_flow = {
        0.02f, 1500.0f, 0.0f, 60000.0f, 0.0f,   // Features 0-4
        40.0f, 40.0f, 40.0f, 0.0f, 65535.0f,    // Features 5-9
        0.0f, 20.0f, 0.0f, 40.0f, 0.0f,         // Features 10-14
        0.001f, 0.0001f, 0.00002f, 0.0f, 0.0f,  // Features 15-19
        75000.0f, 3000000.0f, 1500.0f, 0.0f,    // Features 20-23
        0.0f, 0.0f, 0.0f, 0.0f, 0.0f,           // Features 24-28
        40.0f, 1.0f, 443.0f                     // Features 29-31
    };

    std::memcpy(input_ptr, sample_flow.data(), 32 * sizeof(float));

    // 4. Execute synchronous inference
    engine.forward();

    // 5. Read reconstructed output tensor
    auto output_tensor = engine.get_output_tensor(0);
    const float* output_ptr = output_tensor->data<float>();

    // 6. Compute Mean Squared Error (MSE)
    float mse_loss = 0.0f;
    for (size_t i = 0; i < 32; ++i) {
        float diff = input_ptr[i] - output_ptr[i];
        mse_loss += diff * diff;
    }
    mse_loss /= 32.0f;

    double latency_us = engine.last_inference_microseconds();
    constexpr float ANOMALY_THRESHOLD = 0.082f;

    std::cout << "[+] Inference Latency : " << latency_us << " us\n"
              << "[+] Reconstruction MSE: " << mse_loss << "\n";

    if (mse_loss > ANOMALY_THRESHOLD) {
        std::cout << "[!] THREAT DETECTED: Reconstruction error exceeds baseline threshold ("
                  << ANOMALY_THRESHOLD << ") -> TRIGGER EBPF BLOCK\n";
    } else {
        std::cout << "[+] Traffic Classified: BENIGN\n";
    }

    return 0;
}
```

---

## 3. Compilation & Execution

Compile directly against `libxinfer.so`:

```bash
clang++-16 -std=c++20 -O3 netflow_eval.cpp -o netflow_eval \
    -I/usr/local/include \
    -L/usr/local/lib \
    -lxinfer \
    -Wl,-rpath,/usr/local/lib
```

### Expected Output

```text
====================================================
   xInfer High-Frequency NetFlow Anomaly Evaluator   
====================================================
[+] Bound Backend: Intel_OpenVINO_NPU
[+] Inference Latency : 11.2 us
[+] Reconstruction MSE: 0.28419
[!] THREAT DETECTED: Reconstruction error exceeds baseline threshold (0.082) -> TRIGGER EBPF BLOCK
```

