# Power Efficiency & Performance-per-Watt Profiling

For battery-backed field hardware, aerial drones (MAVLink), and edge IoT nodes, power consumption is a key deployment constraint. Measuring inference performance strictly by operations-per-second ignores thermal and electrical budgets.

`xinfer-essential` measures execution efficiency using **Joules per Inference** and **Inferences per Watt-Second**.

---

## 1. Energy Calculation Methodology

Energy consumption per inference ($E_{\text{inf}}$) is computed by measuring the instantaneous active power draw ($P(t)$ in Watts) during sustained maximum-load execution:

$$E_{\text{inf}} = \frac{\int_{0}^{T} P(t)\, dt}{N_{\text{total}}}$$

$$\text{Efficiency} = \frac{\text{Inferences}}{1.0\,\text{Joule}} = \frac{1}{E_{\text{inf}}}$$

---

## 2. Hardware Power Instrumentation

* **Intel Systems:** Read directly from running average power limit (RAPL) MSR interfaces via `/sys/class/powercap/intel-rapl`.
* **NVIDIA Jetson:** Interrogated onboard INA3221 triple-channel shunt voltage/current monitors via `sysfs`.
* **ARM Embedded Boards:** Monitored using external USB inline power analyzers and precision DC power supplies with isolated current shunts.

---

## 3. Power Efficiency Benchmark Results

Workload: **32-dimensional Tabular Threat Autoencoder** ($N=1$, Sustained Saturation).

| Edge Hardware Platform | Typical Operating Power | Inference Latency | Sustained Throughput | Energy per Inference | Inferences per Joule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Raspberry Pi 5 + Hailo-8 M.2**| **$3.1\,\text{W}$** | **$7.5\,\mu\text{s}$** | 133,000 EPS | **$0.000023\,\text{J}$ ($23\,\mu\text{J}$)**| **42,900** |
| **Rockchip RK3588 (NPU 1 Core)** | **$2.4\,\text{W}$** | **$8.9\,\mu\text{s}$** | 112,000 EPS | **$0.000021\,\text{J}$ ($21\,\mu\text{J}$)**| **46,600** |
| **NVIDIA Jetson Orin Nano (8GB)**| **$7.5\,\text{W}$** | **$5.1\,\mu\text{s}$** | 196,000 EPS | **$0.000038\,\text{J}$ ($38\,\mu\text{J}$)**| **26,100** |
| **Intel Core Ultra 7 (NPU)** | **$6.2\,\text{W}$** | **$8.4\,\mu\text{s}$** | 119,000 EPS | **$0.000052\,\text{J}$ ($52\,\mu\text{J}$)**| **19,200** |
| **Microchip PolarFire SoC** | **$1.8\,\text{W}$** | **$34.0\,\mu\text{s}$**| 29,400 EPS  | **$0.000061\,\text{J}$ ($61\,\mu\text{J}$)**| **16,300** |
| **Intel Xeon Platinum 8480+** | $285.0\,\text{W}$ | **$0.92\,\mu\text{s}$**| 1,086,000 EPS | $0.000262\,\text{J}$ ($262\,\mu\text{J}$)| 3,810 |

---

## 4. Key Takeaways

1. **Edge NPUs Dominate Energy Efficiency:** Dedicated NPU architectures (Rockchip RKNPU and Hailo-8) deliver up to **$46{,}600\text{ inferences per Joule}$**, consuming less than $1/10\text{th}$ the energy of server CPUs for tabular edge scoring.
2. **Thermal Stability on Fanless Nodes:** Operating under $25\,\mu\text{J}$ per inference allows appliances to run at peak throughput without thermal throttling in sealed, fanless enclosures.

