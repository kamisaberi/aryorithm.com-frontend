# Global Threat Cache Indexing & MITRE ATT&CK Taxonomy

`sentinel-nexus` indexes incoming XAI feature attributions alongside the **MITRE ATT&CK for Enterprise and ICS** taxonomies, correlating raw network deviations with adversarial tactics, techniques, and procedures (TTPs).

---

## 1. Indexing Taxonomy Pipeline

```text
 Ingress XAI Record: Top Attribution = "MODBUS_REGISTER_SETPOINT_40001"
                           │
                           ▼ Rule Mapping Table
 ┌─────────────────────────────────────────────────────────────┐
 │ MITRE ATT&CK for ICS Taxonomy Alignment                     │
 ├─────────────────────────────────────────────────────────────┤
 │ Tactic    : TA0108 (Impair Process Control)                 │
 │ Technique : T0855 (Unauthorized Command Message)            │
 │ Severity  : CRITICAL (Level 4)                              │
 └─────────────────────────┬───────────────────────────────────┘
                           │
                           ▼ Update In-Memory Index
 ┌─────────────────────────────────────────────────────────────┐
 │ Global Threat Cache (Thread-Safe Bitmap Postings)           │
 │  • Index by MITRE ID   : "T0855" -> [Inc-1802, Inc-1805]    │
 │  • Index by Attacker IP: 198.51.100.42 -> [Inc-1802]        │
 │  • Index by Asset ID   : "plc-m340" -> [Inc-1802]           │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. In-Memory Threat Cache (`GlobalThreatCache.hpp`)

```cpp
#pragma once

#include <shared_mutex>
#include <unordered_map>
#include <string>
#include <vector>

namespace sentinel::nexus {

struct IndexedThreatEvent {
    std::string incident_id;
    uint32_t src_ip;
    std::string mitre_technique_id;
    double anomaly_score;
    std::string top_feature;
    uint64_t timestamp_ns;
};

class GlobalThreatCache {
public:
    void insert_event(const IndexedThreatEvent& event) {
        std::unique_lock lock(mutex_);
        events_[event.incident_id] = event;
        mitre_index_[event.mitre_technique_id].push_back(event.incident_id);
    }

    std::vector<IndexedThreatEvent> get_by_mitre(const std::string& mitre_id) const {
        std::shared_lock lock(mutex_);
        std::vector<IndexedThreatEvent> results;
        auto it = mitre_index_.find(mitre_id);
        if (it != mitre_index_.end()) {
            for (const auto& id : it->second) {
                results.push_back(events_.at(id));
            }
        }
        return results;
    }

private:
    mutable std::shared_mutex mutex_;
    std::unordered_map<std::string, IndexedThreatEvent> events_;
    std::unordered_map<std::string, std::vector<std::string>> mitre_index_;
};

} // namespace sentinel::nexus
```

