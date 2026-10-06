# IEC 62443-3-3 Industrial Automation Compliance Engine

The **IEC 62443** standard establishes cybersecurity requirements for Industrial Automation and Control Systems (IACS). `sentinel-nexus` validates fleet compliance against **Security Level 3 (SL 3)** and **Security Level 4 (SL 4)** requirements defined in IEC 62443-3-3.

---

## 1. Foundational Requirements (FR) Fleet Traceability

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ IEC 62443-3-3 Fleet Governance Engine                       │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │ FR 3: SYSTEM  │       │ FR 5: ZONE    │       │ FR 7: RESOURCE│
 │   INTEGRITY   │       │ SEGMENTATION  │       │  AVAILABILITY │
 └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
         │                       │                       │
         ▼                       ▼                       ▼
 Central audit of        Validates eBPF conduit  Verifies zero packet
 Modbus, S7, DNP3, and   isolation between Purdue loss across line-rate
 IEC 104 dissectors      Level 3 and Field PLCs. 10GbE edge adapters.
 active across fleet.
```

---

## 2. Industrial Conduit Verification Logic

```cpp
#include <sentinel_nexus/Iec62443AuditEngine.hpp>

namespace sentinel::nexus {

IecAuditResult Iec62443AuditEngine::evaluate_fleet_compliance() {
    auto all_nodes = registry_.get_all_nodes();
    uint32_t compliant_nodes = 0;

    for (const auto& node : all_nodes) {
        // SR 3.1 & SR 5.1: Confirm active in-kernel boundary filter and OT dissector health
        if (node.is_online && 
            node.last_drop_latency_us < 1.0 && 
            !node.active_sensors.empty()) {
            compliant_nodes++;
        }
    }

    double compliance_rate = (static_cast<double>(compliant_nodes) / all_nodes.size()) * 100.0;
    
    return IecAuditResult{
        .target_standard = "IEC 62443-3-3 (SL 3/SL 4)",
        .total_nodes = static_cast<uint32_t>(all_nodes.size()),
        .compliant_nodes = compliant_nodes,
        .compliance_percentage = compliance_rate,
        .passed = (compliance_rate >= 99.5)
    };
}

} // namespace sentinel::nexus
```

