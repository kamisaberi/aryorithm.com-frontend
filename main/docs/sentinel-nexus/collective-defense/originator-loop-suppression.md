# Originator Loopback Suppression & Broadcast Deduplication

When Appliance $A$ detects and mitigates an attack locally, sending the resulting `FleetDefenseRule` back to Appliance $A$ wastes bandwidth and risks resetting local drop counter statistics in its BPF map.

`sentinel-nexus` implements **Originator Loopback Suppression** and **Sliding-Window Deduplication**.

---

## 1. Suppression Mechanics

```text
 [ Appliance A (UUID: edge-alpha) ] ──► Emits ThreatIoC (Originator: "edge-alpha")
                                                 │
                                                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Sentinel-Nexus Collective Defense Broadcaster               │
 ├─────────────────────────────────────────────────────────────┤
 │ For each active appliance in NodeRegistry:                  │
 │   IF target_uuid == rule.originator_uuid:                   │
 │       SKIP (Originator already has active drop in kernel!)  │
 │   ELSE:                                                     │
 │       DISPATCH FleetDefenseRule over gRPC Stream            │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. In-Memory Deduplication Window

If an adversary launches a coordinated flood targeting 10 appliances simultaneously, all 10 nodes may report identical attacking IP addresses to Nexus within milliseconds.

To prevent broadcast storms, `IocBroadcaster` maintains a thread-safe sliding window filter:

```cpp
#include <unordered_map>
#include <shared_mutex>
#include <cstdint>

class IocDeduplicator {
public:
    bool is_duplicate_or_update(uint32_t ip, uint64_t ttl_sec) {
        std::unique_lock lock(mutex_);
        uint64_t now_sec = get_epoch_seconds();

        auto it = seen_iocs_.find(ip);
        if (it != seen_iocs_.end() && it->second > now_sec) {
            // Already broadcast recently: suppress duplicate broadcast
            return true;
        }

        // Record new active suppression window
        seen_iocs_[ip] = now_sec + ttl_sec;
        return false;
    }

private:
    std::shared_mutex mutex_;
    std::unordered_map<uint32_t, uint64_t> seen_iocs_;
};
```

