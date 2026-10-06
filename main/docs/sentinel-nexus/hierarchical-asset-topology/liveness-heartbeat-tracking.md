# Liveness Heartbeat Tracking & Timeout Engine

`sentinel-nexus` tracks appliance liveness using non-blocking monotonic timestamp comparisons across the in-memory `NodeRegistry`.

---

## 1. Heartbeat Window Timeline

```text
 t = 0s         t = 5s         t = 10s        t = 15s (Timeout Threshold)
 ├── Heartbeat ──┼── Heartbeat ──┼── Missed ────┼── DEADLINE EXPIRED
 [   ONLINE   ]  [   ONLINE   ]  [   GRACE   ]  [ TRANSITION: UNREACHABLE ]
```

* **Heartbeat Period:** Edge nodes report every $5.0\text{ seconds}$.
* **Grace Period Window:** $15.0\text{ seconds}$ (3 consecutive missed heartbeats).
* **State Transition:** If $t_{\text{current}} - t_{\text{last\_heartbeat}} > 15.0\,\text{s}$, the node status changes from `ONLINE` to `UNREACHABLE`.

---

## 2. In-Engine Liveness Sweeper (`LivenessTracker.cpp`)

```cpp
#include <sentinel_nexus/NodeRegistry.hpp>
#include <chrono>

namespace sentinel::nexus {

constexpr uint64_t LIVENESS_TIMEOUT_NS = 15'000'000'000ULL; // 15 Seconds

void sweep_appliance_liveness(NodeRegistry& registry) {
    uint64_t now_ns = get_monotonic_ns();
    auto all_nodes = registry.get_all_nodes();

    for (const auto& node : all_nodes) {
        if (node.is_online) {
            uint64_t delta = now_ns - node.last_heartbeat_ns;
            
            if (delta > LIVENESS_TIMEOUT_NS) {
                XINFER_LOG_WARN("LivenessTracker: Node {} missed heartbeats (delta: {}ms). Marking UNREACHABLE.",
                    node.uuid, delta / 1'000'000);
                registry.mark_node_unreachable(node.uuid);
            }
        }
    }
}

} // namespace sentinel::nexus
```

