# `RollbackGuard`: Automated SLA Latency Watchdog

Edge cyber-physical security requires deterministic execution. If an updated candidate model introduces complex operator paths that push inference latency beyond **$1{,}000\,\mu\text{s}$ ($1.0\,\text{ms}$)**, it breaches line-rate mitigation SLAs.

`RollbackGuard` (`src/nexus/RollbackGuard.cpp`) continuously monitors heartbeat telemetry from Canary appliances, triggering an **instant, automated rollback** upon SLA violations.

---

## 1. Watchdog Enforcement Loop

```text
 [ Canary Edge Appliances (5% Cohort) ]
                   │
                   ▼ Telemetry Heartbeat Stream (Every 5 seconds)
 ┌─────────────────────────────────────────────────────────────┐
 │ RollbackGuard::evaluate_heartbeat()                         │
 │  - Reads: current_drop_latency_us                           │
 └─────────────────┬───────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼ Latency <= 1000 µs  ▼ Latency > 1000 µs (SLA Breach!)
 ┌───────────────┐     ┌───────────────────────────────────────┐
 │ Nominal State │     │ EMERGENCY ROLLBACK TRIGGERED          │
 │ Canary Retained     │ • Dispatches AbortRollout command     │
 └───────────────┘     │ • Pushes network_threat_v1.onnx to 5% │
                       │ • Restores Sub-Microsecond Mitigation │
                       └───────────────────────────────────────┘
```

---

## 2. In-Engine Watchdog Implementation (`RollbackGuard.cpp`)

```cpp
#include <sentinel_nexus/RollbackGuard.hpp>

namespace sentinel::nexus {

constexpr double MAX_PERMITTED_LATENCY_US = 1000.0; // 1.0 ms SLA Ceiling

void RollbackGuard::evaluate_telemetry(const std::string& uuid, double reported_latency_us) {
    if (orchestrator_.current_stage() != DeploymentStage::CANARY_5_PCT) {
        return; // Watchdog active during Canary phase
    }

    if (reported_latency_us > MAX_PERMITTED_LATENCY_US) {
        consecutive_violations_++;

        if (consecutive_violations_ >= 3) { // 3 consecutive heartbeat breaches
            XINFER_LOG_CRITICAL(
                "RollbackGuard: Node {} reported {}µs latency (Breaches 1000µs SLA). TRIGGERING AUTOMATED ROLLBACK!",
                uuid, reported_latency_us
            );
            execute_emergency_rollback("LATENCY_SLA_BREACH");
        }
    } else {
        consecutive_violations_ = 0; // Reset consecutive counter on healthy tick
    }
}

void RollbackGuard::execute_emergency_rollback(std::string_view reason) {
    orchestrator_.transition_to(DeploymentStage::ROLLED_BACK);
    // Broadcast fallback rule: Command Canary cohort to hot-reload previous baseline model
    broadcaster_.broadcast_model_rollback(previous_verified_model_version_);
}

} // namespace sentinel::nexus
```

