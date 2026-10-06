# Empirical Bare-Metal Benchmark Results

This document presents empirical latency and throughput metrics measured across production edge appliances, industrial embedded SoCs, and enterprise server hardware running `xinfer-essential`.

---

## 1. Test Workload Specifications

* **Workload A (NetFlow Autoencoder):** 32-dimensional dense tabular vector ($N=1$). Evaluates sub-microsecond threat scoring SLA.
* **Workload B (SCADA Modbus Guard):** 16-dimensional tabular industrial register vector ($N=1$).
* **Workload C (YOLOv8s Industrial Vision):** $640 \times 640 \times 3$ image input ($N=1$). Full inference plus tensor decoding.

---

## 2. Bare-Metal Hardware Results Matrix

All benchmarks reflect $1{,}000{,}000$ iterations after a $10{,}000$-pass warm-up. Memory allocation was configured for zero-copy pinned RAM.

| Target Platform | Accelerator Used | Precision | Workload | Latency p50 | Latency p99 | Latency p99.9 | Sustained EPS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Intel Core Ultra 7 165H** | NPU.3720 (Level Zero) | INT8 | Workload A | **$8.4\,\mu\text{s}$** | **$11.2\,\mu\text{s}$** | $14.1\,\mu\text{s}$ | 119,000 |
| **Intel Core Ultra 7 165H** | NPU.3720 (Level Zero) | FP16 | Workload A | **$11.4\,\mu\text{s}$** | **$14.8\,\mu\text{s}$** | $18.2\,\mu\text{s}$ | 87,700 |
| **NVIDIA Jetson AGX Orin 64GB**| TensorRT (Tensor Cores)| INT8 | Workload A | **$3.8\,\mu\text{s}$** | **$4.9\,\mu\text{s}$** | $6.2\,\mu\text{s}$ | 263,000 |
| **NVIDIA Jetson AGX Orin 64GB**| TensorRT (Tensor Cores)| FP16 | Workload C | **$6.2\,\text{ms}$** | **$7.1\,\text{ms}$** | $8.4\,\text{ms}$ | 161 FPS |
| **Rockchip RK3588 (Firefly)**| RKNPU2 (1 Core) | INT8 | Workload A | **$8.9\,\mu\text{s}$** | **$12.1\,\mu\text{s}$** | $15.5\,\mu\text{s}$ | 112,000 |
| **Rockchip RK3588 (Firefly)**| RKNPU2 (3 Cores) | INT8 | Workload C | **$12.3\,\text{ms}$** | **$14.1\,\text{ms}$** | $16.8\,\text{ms}$ | 81 FPS |
| **Intel Xeon Platinum 8480+** | Reference SIMD (AVX-512)| FP32 | Workload A | **$0.92\,\mu\text{s}$** | **$1.15\,\mu\text{s}$** | $1.42\,\mu\text{s}$ | 1,086,000 |
| **Intel Xeon Platinum 8480+** | Reference SIMD (AVX-512)| FP32 | Workload B | **$0.51\,\mu\text{s}$** | **$0.72\,\mu\text{s}$** | $0.88\,\mu\text{s}$ | 1,960,000 |
| **Raspberry Pi 5 + Hailo-8 M.2**| HailoRT (`/dev/hailo0`)| INT8 | Workload A | **$7.5\,\mu\text{s}$** | **$9.8\,\mu\text{s}$** | $12.4\,\mu\text{s}$ | 133,000 |
| **Raspberry Pi 5 + Hailo-8 M.2**| HailoRT (`/dev/hailo0`)| INT8 | Workload C | **$5.4\,\text{ms}$** | **$6.1\,\text{ms}$** | $7.2\,\text{ms}$ | 185 FPS |
| **AMD Kria KV260 SOM** | Vitis AI (DPUCZDX8G) | INT8 | Workload A | **$9.5\,\mu\text{s}$** | **$11.9\,\mu\text{s}$** | $13.2\,\mu\text{s}$ | 105,000 |
| **Google Coral M.2 Accelerator**| `libedgetpu1` (Apex) | INT8 | Workload A | **$28.0\,\mu\text{s}$** | **$34.2\,\mu\text{s}$** | $42.0\,\mu\text{s}$ | 35,700 |

---

## 3. Microsecond Jitter Analysis

Jitter standard deviation ($\sigma$) measures the deterministic behavior of the execution pipeline over continuous runtime. In cyber-physical systems, low jitter is critical to preventing packet queue buffer overflows.

$$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (t_i - \mu)^2}$$

* **xInfer on Intel Core Ultra NPU:** $\sigma = 0.42\,\mu\text{s}$ (Extremely flat distribution; zero paging traps).
* **xInfer on Xeon AVX-512:** $\sigma = 0.08\,\mu\text{s}$ (Deterministic cache residency).

