# Mel-Spectrogram FFT Plugin (`libxinfer_plugin_melspec.so`)

The Mel-Spectrogram FFT plugin converts continuous 1D acoustic sensor signals (microphone arrays, piezoelectric vibration sensors) into 2D time-frequency spectrogram tensors for industrial predictive maintenance and acoustic anomaly detection.

---

## 1. Feature Extraction Pipeline

```text
[ Raw Audio Waveform (e.g. 16 kHz PCM) ]
                   │
                   ▼ Pre-Emphasis Filter: y[t] = x[t] - α x[t-1]
[ High-Frequency Boosted Signal ]
                   │
                   ▼ Windowing: Periodic Hann Window w[n] = 0.5 - 0.5*cos(2πn/N)
[ STFT Frame Segments ]
                   │
                   ▼ Real-to-Complex FFT (Cooley-Tukey / KissFFT)
[ Linear Power Spectrum (|X(f)|²) ]
                   │
                   ▼ Triangular Mel Filterbank Dot-Product (e.g. 64 Mel Bins)
[ 2D Mel-Spectrogram Tensor [1, 1, 64, T] ]
```

---

## 2. Configuration & Interface

```cpp
#pragma once

#include <vector>
#include <span>
#include <cmath>

namespace xinfer::plugins {

struct MelConfig {
    int32_t sample_rate{16000};
    int32_t n_fft{512};
    int32_t hop_length{160};     // 10ms hop
    int32_t win_length{400};     // 25ms window
    int32_t n_mels{64};
    float f_min{50.0f};
    float f_max{8000.0f};
};

class MelSpectrogramExtractor {
public:
    explicit MelSpectrogramExtractor(const MelConfig& config);
    ~MelSpectrogramExtractor() = default;

    // Ingests raw audio samples, outputs [1, 1, n_mels, time_steps] tensor
    void transform(
        std::span<const float> audio_samples, 
        std::vector<float>& out_spectrogram,
        size_t& out_time_steps
    );

private:
    MelConfig config_;
    std::vector<float> window_;
    std::vector<std::vector<float>> mel_filters_;
};

} // namespace xinfer::plugins
```

---

## 3. Fast Invariants

* **Pre-Computed Filterbanks:** Triangular Mel-filter matrices are calculated during plugin construction.
* **Heap Stability:** Audio frame buffers reuse pre-allocated FFT arrays.
* **Latency Profile:** $< 380\,\mu\text{s}$ for a 1-second continuous audio segment (16,000 samples).

