# Benchmarking Methodology & Microsecond Profiling Standards

Accurately evaluating microsecond and sub-microsecond AI inference runtimes requires hardware-level timing rigor. Standard operating system utilities and unpinned user-space timers introduce measurement jitter due to CPU frequency transitions, kernel context switching, and timer syscall overhead.

`xinfer-essential` adheres to strict hardware profiling methodologies to ensure deterministic reproducibility.

---

## 1. Hardware Timer Principles: Invariant TSC vs. `CLOCK_MONOTONIC_RAW`

Standard `std::chrono::high_resolution_clock` implementations often invoke the `clock_gettime(CLOCK_REALTIME)` system call, which is subject to NTP clock adjustments and user-to-kernel context shifts ($\sim 15 - 30\,\text{ns}$ overhead).

For microsecond profiling, `xinfer-essential` utilizes:
* **x86_64:** Invariant Time-Stamp Counter (TSC) with serializing instruction fencing (`__rdtscp` or `mfence` + `__rdtsc`).
* **AArch64 (ARM64):** The direct physical cycle counter register (`CNTVCT_EL0`).
* **POSIX Fallback:** `clock_gettime(CLOCK_MONOTONIC_RAW)` bypassing NTP slew.

```cpp
#include <cstdint>

namespace xinfer::bench {

#if defined(__x86_64__)
[[nodiscard]] inline uint64_t rdtsc_start() noexcept {
    uint32_t cycles_high, cycles_low;
    // Instruction serialization barrier
    asm volatile(
        "cpuid\n\t"
        "rdtsc\n\t"
        "mov %%edx, %0\n\t"
        "mov %%eax, %1\n\t"
        : "=r"(cycles_high), "=r"(cycles_low)::"%rax", "%rbx", "%rcx", "%rdx"
    );
    return (static_cast<uint64_t>(cycles_high) << 32) | cycles_low;
}

[[nodiscard]] inline uint64_t rdtsc_end() noexcept {
    uint32_t cycles_high, cycles_low;
    asm volatile(
        "rdtscp\n\t"
        "mov %%edx, %0\n\t"
        "mov %%eax, %1\n\t"
        "cpuid\n\t"
        : "=r"(cycles_high), "=r"(cycles_low)::"%rax", "%rbx", "%rcx", "%rdx"
    );
    return (static_cast<uint64_t>(cycles_high) << 32) | cycles_low;
}
#elif defined(__aarch64__)
[[nodiscard]] inline uint64_t rdtsc_start() noexcept {
    uint64_t val;
    asm volatile("isb; mrs %0, cntvct_el0" : "=r"(val));
    return val;
}
[[nodiscard]] inline uint64_t rdtsc_end() noexcept {
    uint64_t val;
    asm volatile("mrs %0, cntvct_el0; isb" : "=r"(val));
    return val;
}
#endif

} // namespace xinfer::bench
```

---

## 2. Test Harness Rigor & Environmental Controls

To isolate pure compute latency from operating system interference, benchmark environments must enforce the following invariants:

1. **CPU Frequency Pinning:** Dynamic scaling governors (e.g., `powersave` or `ondemand`) are disabled. CPU frequency is locked to maximum base clocks using the `performance` governor.
2. **CPU Core Shielding (`isolcpus`):** Inference benchmarks are assigned dedicated isolated cores excluded from the general Linux CFS (Completely Fair Scheduler) task pool.
3. **Hardware Warmup Iterations:** Models run a minimum of $10{,}000$ discard passes to stabilize CPU/NPU caches, pre-heat Level 2/3 branch predictors, and warm device context queues.
4. **Statistical Sample Size:** Latency metrics are recorded across $N = 1{,}000{,}000$ consecutive inferences to evaluate high-percentile tail distributions ($p50$, $p90$, $p99$, $p99.9$, and maximum outlier jitter).

### Operating System Isolation Command Checklist

```bash
# 1. Set performance governor across all cores
sudo cpupower frequency-set -g performance

# 2. Disable CPU dynamic frequency boosting (eliminates thermal throttling jitter)
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo # Intel
echo 0 | sudo tee /sys/devices/system/cpu/cpufreq/boost         # AMD

# 3. Pin benchmark executable to shielded core 2
sudo taskset -c 2 ./xinfer_benchmark_harness
```

