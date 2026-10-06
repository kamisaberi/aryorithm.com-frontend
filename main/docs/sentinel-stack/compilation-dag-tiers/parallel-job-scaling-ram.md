# Parallel Compilation Scaling & RAM Sizing (`make -j`)

Compiling deep C++20 template metaprogramming libraries (such as gRPC stubs, OpenVINO tensor headers, and eBPF wrappers) consumes significant memory during compiler optimization passes. Executing `make -j$(nproc)` on memory-constrained systems causes internal compiler Out-of-Memory (OOM) fatal crashes (`signal 9: Killed`).

---

## 1. Dynamic Parallelism Sizing Algorithm

Phase 0 (`00_check_system.sh`) evaluates total system RAM and dynamically scales compiler parallelism:

$$\text{Jobs} = \min\left(\text{CPU Cores},\, \max\left(1,\, \left\lfloor \frac{\text{RAM}_{\text{Total GB}}}{2.5} \right\rfloor\right)\right)$$

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ RAM-Aware Parallelism Allocation Rule                       │
 ├─────────────────────────────────────────────────────────────┤
 │ • RAM < 8 GB   ──► Cap to -j2 (Prevents compiler OOM crash) │
 │ • RAM < 16 GB  ──► Cap to -j4                               │
 │ • RAM >= 32 GB ──► Full Parallelism: -j$(nproc)             │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Implementation in `00_check_system.sh`

```bash
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
CPU_CORES=$(nproc)

if [ "${TOTAL_RAM_GB}" -lt 8 ]; then
    export PARALLEL_JOBS=2
elif [ "${TOTAL_RAM_GB}" -lt 16 ]; then
    export PARALLEL_JOBS=$((CPU_CORES > 4 ? 4 : CPU_CORES))
else
    export PARALLEL_JOBS="${CPU_CORES}"
fi

echo "export PARALLEL_JOBS=${PARALLEL_JOBS}" > /opt/sentinel-stack/.build_env
```

