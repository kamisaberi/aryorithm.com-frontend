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

