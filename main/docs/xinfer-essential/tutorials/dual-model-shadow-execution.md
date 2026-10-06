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
