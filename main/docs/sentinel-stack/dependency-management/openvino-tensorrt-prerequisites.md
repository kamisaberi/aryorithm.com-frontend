# Hardware Acceleration Discovery: Intel OpenVINO & NVIDIA CUDA

`sentinel-stack` probes the host for hardware AI accelerators (Intel NPUs, NVIDIA GPUs) during Phase 1, configuring compilation feature flags dynamically.

---

## 1. Accelerator Discovery Matrix

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Hardware Accelerator Discovery Prober                       │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ Probes for Intel Hardware                     ▼ Probes for NVIDIA Hardware
 ┌─────────────────────────────┐         ┌─────────────────────────────┐
 │ Level Zero / NPU Character  │         │ CUDA Driver & Toolkits      │
 │ /dev/accel/accel0 exists?   │         │ nvidia-smi / /usr/local/cuda│
 └──────────────┬──────────────┘         └──────────────┬──────────────┘
                │ FOUND                                 │ FOUND
                ▼                                       ▼
  -DXINFER_ENABLE_OPENVINO=ON             -DXINFER_ENABLE_TENSORRT=ON
  -DENABLE_OPENVINO=ON                    -DXINFER_ENABLE_CUDA=ON
```

---

## 2. Intel OpenVINO Toolchain Integration

When an Intel Core Ultra NPU or Arc GPU is detected:
* Installs `intel-openvino-runtime-ubuntu24` or links to `/opt/intel/openvino`.
* Binds Level Zero compute loaders (`libze_loader.so`).

---

## 3. NVIDIA CUDA Toolchain Integration

When an NVIDIA GPU (RTX A4000, Jetson Orin) is detected:
* Probes for `nvcc` and CUDA Runtime `>= 12.0`.
* Configures CMake to locate `libnvinfer.so` and `libcudart.so`.
* If CUDA drivers are absent, falls back to CPU SIMD mode without interrupting compilation.

