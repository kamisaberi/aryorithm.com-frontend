# NVDEC Video Unpacker Plugin (`libxinfer_plugin_nvdec.so`)

The NVDEC Video Unpacker plugin leverages NVIDIA’s dedicated silicon hardware video decoder (NVDEC) to ingest compressed H.264, HEVC (H.265), and AV1 RTSP video streams, outputting decoded frames directly into CUDA device memory without host CPU involvement.

---

## 1. Zero-Copy Hardware Pipeline

```text
[ RTSP Camera H.264/HEVC Bitstream ]
                  │
                  ▼
+─────────────────────────────────────────────────────────────+
| Dedicated NVDEC Hardware ASIC on GPU                        |
|   - Bitstream Parsing & Entropy Decoding                    |
|   - Motion Compensation & Inverse Transform                 |
+─────────────────────────────────────────────────────────────+
                  │
                  ▼ Direct Hardware DMA
+─────────────────────────────────────────────────────────────+
| CUDA Device Memory (NV12 / YUV420 Surface)                  |
|   - Color Space Conversion via CUDA Kernel (NV12 -> RGB Planar)
|   - Normalization & Resizing (e.g. 1920x1080 -> 640x640x3)  |
+─────────────────────────────────────────────────────────────+
                  │
                  ▼ Pointer Aliased directly to Inference Input
[ TensorRT Engine Execution Context (xinfer::InferenceEngine) ]
```

---

## 2. Interface Definition

```cpp
#pragma once

#include <cstdint>
#include <xinfer/tensor.hpp>

namespace xinfer::plugins {

enum class VideoCodec {
    H264,
    HEVC,
    AV1
};

struct NvdecConfig {
    VideoCodec codec{VideoCodec::H264};
    uint32_t target_width{640};
    uint32_t target_height{640};
    int32_t cuda_device_id{0};
};

class NvdecVideoUnpacker {
public:
    explicit NvdecVideoUnpacker(const NvdecConfig& config);
    ~NvdecVideoUnpacker();

    // Decodes compressed NAL packet directly to destination tensor in GPU VRAM
    bool decode_packet_to_tensor(
        const uint8_t* nal_data, 
        size_t nal_size_bytes, 
        std::shared_ptr<Tensor>& dest_tensor
    );
};

} // namespace xinfer::plugins
```

---

## 3. Performance Metrics

| Resolution | Input Codec | Decode Time (NVDEC) | CUDA Color Conversion | Total Frame-to-Tensor |
| :--- | :--- | :--- | :--- | :--- |
| **1080p (1920x1080)** | H.264 (Baseline) | $0.85\,\text{ms}$ | $0.12\,\text{ms}$ | **$< 0.98\,\text{ms}$** |
| **4K (3840x2160)**    | HEVC Main 10 | $1.95\,\text{ms}$ | $0.35\,\text{ms}$ | **$< 2.30\,\text{ms}$** |

