# Inline Industrial Control SCADA Modbus Anomaly Inspection

This tutorial demonstrates how to inspect industrial Modbus TCP traffic (port 502) in real time using the `modbus-apdu-vectorizer` plugin and a specialized cyber-physical anomaly model to detect unauthorized PLC register writes and set-point manipulation attacks (e.g., Stuxnet, Triton).

---

## 1. Threat Scenario: Stuxnet-Style Coil / Register Manipulation

Attackers often target Programmable Logic Controllers (PLCs) by issuing legitimate Modbus Function Code `16` (`Write Multiple Registers`) commands with out-of-bounds process set-points. Standard firewalls pass these packets because the TCP connection is legitimate. 

An inline `xinfer` model evaluates the semantic validity of the write payload before the command reaches the physical actuator.

---

## 2. Complete C++20 Implementation (`scada_guard.cpp`)

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/plugins/modbus_vectorizer.hpp>
#include <iostream>
#include <array>
#include <vector>

int main() {
    std::cout << "[+] Initializing Industrial SCADA Modbus Defense Hook...\n";

    // 1. Configure the anomaly detection engine
    xinfer::EngineConfig config;
    config.model_path = "/opt/models/scada_modbus_guard.onnx";
    config.backend = xinfer::BackendType::AUTO;
    config.precision = xinfer::Precision::FP32;

    xinfer::InferenceEngine engine(config);
    engine.initialize();

    // 2. Simulated Malicious Modbus Frame: Function Code 16 (Write Multiple Registers)
    // Writing dangerous set-point values to critical centrifuge speed registers
    std::vector<uint8_t> malicious_modbus_frame = {
        0x01, 0x2A,             // Transaction ID: 298
        0x00, 0x00,             // Protocol ID: 0 (Modbus TCP)
        0x00, 0x0B,             // Length: 11 bytes following
        0x01,                   // Unit Identifier: 1
        0x10,                   // Function Code: 16 (Write Multiple Registers)
        0x00, 0x01,             // Starting Address: Register 1
        0x00, 0x02,             // Quantity: 2 registers
        0x04,                   // Byte Count: 4 bytes
        0xFF, 0xFF, 0xFF, 0xFF  // Out-of-bounds speed values (65535, 65535)
    };

    // 3. Vectorize Modbus Frame using standard plugin
    std::array<float, 16> vector_features{};
    xinfer::plugins::vectorize_modbus_apdu(
        malicious_modbus_frame.data(),
        malicious_modbus_frame.size(),
        vector_features
    );

    // 4. Ingest normalized 16-dim vector into tensor
    auto input_tensor = engine.get_input_tensor(0);
    std::memcpy(input_tensor->data<float>(), vector_features.data(), 16 * sizeof(float));

    // 5. Execute synchronous inference
    engine.forward();

    // 6. Evaluate SCADA safety score
    auto output_tensor = engine.get_output_tensor(0);
    float anomaly_prob = *output_tensor->data<float>();

    std::cout << "[+] Modbus Frame Vectorized: Function Code " 
              << static_cast<int>(malicious_modbus_frame[7]) << "\n"
              << "[+] Anomaly Probability   : " << anomaly_prob << "\n"
              << "[+] Inference Latency     : " << engine.last_inference_microseconds() << " us\n";

    if (anomaly_prob > 0.85f) {
        std::cout << "[!] PHYSICAL SAFETY BREACH DETECTED: Illegal Register Set-Point! "
                  << "Dropping packet at kernel bridge.\n";
    } else {
        std::cout << "[+] Modbus Command Validated -> Forwarding to PLC.\n";
    }

    return 0;
}
```

---

## 3. Compilation & Execution

```bash
clang++-16 -std=c++20 scada_guard.cpp -o scada_guard \
    -I/usr/local/include \
    -L/usr/local/lib \
    -lxinfer -lxinfer_plugin_modbus \
    -Wl,-rpath,/usr/local/lib

./scada_guard
```

### Expected Output

```text
[+] Initializing Industrial SCADA Modbus Defense Hook...
[+] Bound Backend: Intel_OpenVINO_NPU
[+] Modbus Frame Vectorized: Function Code 16
[+] Anomaly Probability   : 0.96421
[+] Inference Latency     : 9.8 us
[!] PHYSICAL SAFETY BREACH DETECTED: Illegal Register Set-Point! Dropping packet at kernel bridge.
```
```

---

### File: `xinfer-essential/docs/tutorials/thermal-overheating-detector.md`

```markdown
# Real-Time Industrial Equipment Thermal Overheating Monitoring

This tutorial demonstrates how to ingest raw 16-bit radiometric thermal camera data (from FLIR Lepton or SEEK Thermal sensors), normalize pixel matrices into temperature-scaled tensors, and evaluate equipment thermal profiles to detect impending equipment failures and thermal runaway.

---

## 1. Processing Chain

```text
[ 16-Bit Centi-Kelvin Sensor Frame (160x120 raw uint16_t) ]
                            │
                            ▼
+─────────────────────────────────────────────────────────────+
| libxinfer_plugin_thermal.so (Radiometric Normalizer)         |
|   - Dead-pixel interpolation & noise reduction              |
|   - Converts centi-Kelvin to Celsius                        |
|   - Maps range [0.0°C, 150.0°C] into normalized [0.0, 1.0]  |
+─────────────────────────────────────────────────────────────+
                            │
                            ▼
+─────────────────────────────────────────────────────────────+
| xinfer::InferenceEngine (Thermal Profiling Autoencoder)     |
|   - Evaluates normal operational heat dissipation patterns  |
+─────────────────────────────────────────────────────────────+
                            │
                            ▼
[ Max Hotspot Detection & Impending Bearing Failure Warning ]
```

---

## 2. Complete C++20 Implementation (`thermal_guard.cpp`)

```cpp
#include <xinfer/xinfer.hpp>
#include <xinfer/plugins/thermal_normalizer.hpp>
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "[+] Initializing Industrial Thermal Anomaly Monitor...\n";

    // 1. Configure the engine
    xinfer::EngineConfig config;
    config.model_path = "/opt/models/thermal_autoencoder.onnx";
    config.backend = xinfer::BackendType::AUTO;
    config.precision = xinfer::Precision::FP32;

    xinfer::InferenceEngine engine(config);
    engine.initialize();

    // 2. Synthesize 160x120 16-bit centi-Kelvin thermal frame
    // Normal ambient: ~25°C = 298.15K = 29815 centi-Kelvin
    // Hotspot simulated at center: ~95°C = 368.15K = 36815 centi-Kelvin
    constexpr size_t WIDTH = 160;
    constexpr size_t HEIGHT = 120;
    constexpr size_t NUM_PIXELS = WIDTH * HEIGHT;

    std::vector<uint16_t> raw_thermal_frame(NUM_PIXELS, 29815);

    // Inject overheating motor bearing hotspot at center
    for (size_t y = 50; y < 70; ++y) {
        for (size_t x = 70; x < 90; ++x) {
            raw_thermal_frame[y * WIDTH + x] = 36815;
        }
    }

    // 3. Normalize radiometric data using thermal plugin
    xinfer::plugins::ThermalCalibration calib{
        .scale = 0.01f,
        .offset_celsius = -273.15f,
        .min_temp_range = 0.0f,
        .max_temp_range = 150.0f
    };

    auto input_tensor = engine.get_input_tensor(0);
    xinfer::plugins::normalize_radiometric_matrix(
        raw_thermal_frame,
        input_tensor->as_span<float>(),
        calib
    );

    // 4. Run inference
    engine.forward();

    // 5. Evaluate thermal status
    auto output_tensor = engine.get_output_tensor(0);
    const float* reconstructed = output_tensor->data<float>();
    const float* original = input_tensor->data<float>();

    float max_error = 0.0f;
    for (size_t i = 0; i < NUM_PIXELS; ++i) {
        float err = std::abs(original[i] - reconstructed[i]);
        if (err > max_error) {
            max_error = err;
        }
    }

    std::cout << "[+] Frame Dimensions   : " << WIDTH << "x" << HEIGHT << "\n"
              << "[+] Max Thermal Anomaly: " << max_error << "\n"
              << "[+] Ingestion Latency  : " << engine.last_inference_microseconds() << " us\n";

    if (max_error > 0.35f) {
        std::cout << "[!] CRITICAL WARNING: Thermal Runaway Detected on Motor Bearing #4! "
                  << "Initiating emergency cooling cycle.\n";
    } else {
        std::cout << "[+] Equipment Thermal Gradient Normal.\n";
    }

    return 0;
}
```

---

## 3. Compilation & Execution

```bash
clang++-16 -std=c++20 thermal_guard.cpp -o thermal_guard \
    -I/usr/local/include \
    -L/usr/local/lib \
    -lxinfer -lxinfer_plugin_thermal \
    -Wl,-rpath,/usr/local/lib

./thermal_guard
```
```

---

### File: `xinfer-essential/docs/tutorials/dual-model-shadow-execution.md`

```markdown
# Running Production and Candidate Models in Parallel (Shadow Execution)

In critical production networks, deploying an unverified AI model directly into the active packet-dropping path presents operational risks. 

This tutorial demonstrates how to run a primary production model and a secondary candidate model (e.g., newly trained weights from `xinfer-forge`) in parallel. The primary model makes blocking mitigation decisions, while the candidate model executes asynchronously in **Shadow Mode** to validate accuracy without latency penalties.

---

## 1. Dual-Model Architecture

```text
[ Ingress Network Telemetry ]
              │
              ├───► [ Primary Engine (v1) ] ──► Fast-Path Mitigation (<12 µs)
              │
              └───► [ Asynchronous Shadow Queue ]
                            │
                            ▼
                    [ Shadow Engine (v2) ] ──► Metric Divergence Logging (0 ms Impact)
```

---

## 2. Complete C++20 Implementation (`shadow_runner.cpp`)

```cpp
#include <xinfer/xinfer.hpp>
#include <iostream>
#include <vector>
#include <future>
#include <cmath>

int main() {
    std::cout << "[+] Launching Dual-Model Shadow Execution Harness...\n";

    // 1. Initialize Active Production Model (Primary Mitigation Path)
    xinfer::EngineConfig prod_config;
    prod_config.model_path = "/opt/models/network_threat_v1.onnx";
    prod_config.backend = xinfer::BackendType::AUTO;
    prod_config.precision = xinfer::Precision::FP32;

    xinfer::InferenceEngine prod_engine(prod_config);
    prod_engine.initialize();

    // 2. Initialize Canary Candidate Model (Shadow Path)
    xinfer::EngineConfig shadow_config;
    shadow_config.model_path = "/opt/models/network_threat_v2_canary.onnx";
    shadow_config.backend = xinfer::BackendType::AUTO;
    shadow_config.precision = xinfer::Precision::FP32;

    xinfer::InferenceEngine shadow_engine(shadow_config);
    shadow_engine.initialize();

    std::cout << "[+] Production Engine: " << prod_engine.get_active_backend_name() << "\n"
              << "[+] Shadow Engine    : " << shadow_engine.get_active_backend_name() << "\n";

    // 3. Process Ingress Telemetry Frame
    std::vector<float> ingress_flow(32, 0.42f);

    // Primary Execution (Synchronous, fast path)
    auto prod_input = prod_engine.get_input_tensor(0);
    std::memcpy(prod_input->data<float>(), ingress_flow.data(), 32 * sizeof(float));
    prod_engine.forward();
    float prod_score = *prod_engine.get_output_tensor(0)->data<float>();

    // Shadow Execution (Dispatched to background task, non-blocking)
    auto shadow_future = std::async(std::launch::async, [&]() {
        auto shadow_input = shadow_engine.get_input_tensor(0);
        std::memcpy(shadow_input->data<float>(), ingress_flow.data(), 32 * sizeof(float));
        shadow_engine.forward();
        return *shadow_engine.get_output_tensor(0)->data<float>();
    });

    // Act on production score immediately without waiting for shadow evaluation
    std::cout << "[+] Primary Mitigation Decision: " 
              << (prod_score > 0.5f ? "DROP" : "PASS")
              << " (Score: " << prod_score << ") in " 
              << prod_engine.last_inference_microseconds() << " us\n";

    // Reconcile shadow score in background telemetry
    float shadow_score = shadow_future.get();
    float divergence = std::abs(prod_score - shadow_score);

    std::cout << "[+] Shadow Canary Evaluated     : Score " << shadow_score
              << " | Delta: " << divergence << "\n";

    if (divergence > 0.20f) {
        std::cout << "[*] TELEMETRY NOTE: Significant model prediction divergence detected! "
                  << "Staged for active learning review.\n";
    }

    return 0;
}
```

---

## 3. Operational Guarantees

* **Zero Fast-Path Degradation:** Production packet mitigation latency remains unaffected by the candidate model's compute time.
* **Deterministic Canary Testing:** Candidate models can be evaluated against live wire traffic for weeks before promoting weights to active mitigation status.
