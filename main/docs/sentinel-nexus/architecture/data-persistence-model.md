# Data Persistence Model: `StateDatabase` & `TimeSeriesEngine`

While `sentinel-nexus` executes primarily out of RAM, it maintains continuous state persistence across process restarts using an append-only JSON journal (`StateDatabase`) and an in-memory ring-buffer time-series database (`TimeSeriesEngine`).

---

## 1. Atomic Journaling (`nexus_state.json`)

To prevent file corruption during sudden power outages:
1. State is serialized to a temporary staging file: `data/nexus_state.json.tmp`.
2. The file is flushed to physical storage using `fsync()`.
3. An atomic POSIX `rename()` replaces the active database (`data/nexus_state.json`).

```text
 [ State Change Event ] ──► Write to nexus_state.json.tmp ──► fsync() ──► rename()
                                                                               │
                                                                               ▼
                                                             [ Active nexus_state.json ]
```

---

## 2. In-Memory Time-Series Engine (`TimeSeriesEngine.cpp`)

Metrics displayed on the Web Command Center (e.g., 24-hour fleet drop trends, latency distributions) are maintained in circular memory rings:

```cpp
#include <array>
#include <atomic>
#include <cstdint>

namespace sentinel::nexus {

struct MetricSample {
    uint64_t timestamp_sec;
    uint64_t total_drops;
    double fleet_latency_us;
    uint32_t active_nodes;
};

class TimeSeriesEngine {
public:
    static constexpr size_t RING_SIZE = 86400; // 24 hours at 1Hz resolution

    void record_sample(const MetricSample& sample) noexcept {
        size_t idx = cursor_.fetch_add(1, std::memory_order_relaxed) % RING_SIZE;
        samples_[idx] = sample;
    }

    std::vector<MetricSample> get_history(size_t seconds) const {
        // Extracts contiguous history window without heap reallocation
        std::vector<MetricSample> history;
        history.reserve(seconds);
        // ...
        return history;
    }

private:
    std::array<MetricSample, RING_SIZE> samples_{};
    std::atomic<size_t> cursor_{0};
};

} // namespace sentinel::nexus
```

