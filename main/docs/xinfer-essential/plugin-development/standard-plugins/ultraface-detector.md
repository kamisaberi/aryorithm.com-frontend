# UltraFace Landmark Detector Plugin (`libxinfer_plugin_ultraface.so`)

The UltraFace Detector plugin wraps lightweight edge face-detection models. It handles anchor grid generation, bounding box regression un-scaling, and 5-point facial landmark decoding (eyes, nose, mouth corners) in real-time camera pipelines.

---

## 1. Feature Map Anchors Generation

The plugin initializes multi-scale anchor boxes across standard feature map strides (strides: 8, 16, 32, 64) during model initialization:

```cpp
#include <vector>
#include <cmath>

namespace xinfer::plugins {

struct AnchorBox {
    float cx, cy, w, h;
};

std::vector<AnchorBox> generate_ultraface_anchors(
    int image_w = 320, 
    int image_h = 240
) {
    const std::vector<int> strides = {8, 16, 32, 64};
    const std::vector<std::vector<float>> min_boxes = {
        {10.0f, 16.0f, 24.0f},
        {32.0f, 48.0f},
        {64.0f, 96.0f},
        {128.0f, 192.0f, 256.0f}
    };

    std::vector<AnchorBox> anchors;
    for (size_t s = 0; s < strides.size(); ++s) {
        int stride = strides[s];
        int feature_w = std::ceil(static_cast<float>(image_w) / stride);
        int feature_h = std::ceil(static_cast<float>(image_h) / stride);

        for (int y = 0; y < feature_h; ++y) {
            for (int x = 0; x < feature_w; ++x) {
                for (float box_size : min_boxes[s]) {
                    anchors.push_back({
                        .cx = (x + 0.5f) * stride / image_w,
                        .cy = (y + 0.5f) * stride / image_h,
                        .w  = box_size / image_w,
                        .h  = box_size / image_h
                    });
                }
            }
        }
    }
    return anchors;
}

} // namespace xinfer::plugins
```

---

## 2. Regression Decoding & Landmark Unpacking

```cpp
struct FaceDetection {
    float x1, y1, x2, y2;
    float score;
    struct { float x, y; } landmarks[5]; // Left eye, right eye, nose, left mouth, right mouth
};

void decode_ultraface(
    const float* confidences, 
    const float* regressions, 
    const float* landmarks,
    const std::vector<AnchorBox>& anchors,
    std::vector<FaceDetection>& detections,
    float threshold = 0.70f
) {
    const float center_variance = 0.1f;
    const float size_variance = 0.2f;

    for (size_t i = 0; i < anchors.size(); ++i) {
        float score = confidences[i * 2 + 1];
        if (score > threshold) {
            float cx = regressions[i * 4 + 0] * center_variance * anchors[i].w + anchors[i].cx;
            float cy = regressions[i * 4 + 1] * center_variance * anchors[i].h + anchors[i].cy;
            float w  = std::exp(regressions[i * 4 + 2] * size_variance) * anchors[i].w;
            float h  = std::exp(regressions[i * 4 + 3] * size_variance) * anchors[i].h;

            FaceDetection det;
            det.x1 = cx - w * 0.5f;
            det.y1 = cy - h * 0.5f;
            det.x2 = cx + w * 0.5f;
            det.y2 = cy + h * 0.5f;
            det.score = score;

            // Unpack 5 landmarks
            for (int l = 0; l < 5; ++l) {
                det.landmarks[l].x = landmarks[i * 10 + l * 2] * center_variance * anchors[i].w + anchors[i].cx;
                det.landmarks[l].y = landmarks[i * 10 + l * 2 + 1] * center_variance * anchors[i].h + anchors[i].cy;
            }

            detections.push_back(det);
        }
    }
}
```

---

## 3. Typical Latency & Constraints

* **Decoding Latency:** $< 45\,\mu\text{s}$ (320x240 frame resolution, 4420 anchors).
* **Anchor Storage:** Static, evaluated once during initialization.

