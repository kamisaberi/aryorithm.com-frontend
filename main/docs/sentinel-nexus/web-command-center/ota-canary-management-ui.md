# Interactive OTA Canary Management & Staging UI

The **Model Rollout Panel** allows operators to stage, evaluate, advance, and roll back neural network weights across the fleet.

---

## 1. Rollout Management Console

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ NEURAL MODEL ROLLOUT CONTROLLER                                             │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ Candidate Version : network_threat_v2_canary.onnx                           │
 │ SHA-256 Checksum  : e9a2c31e847b2c94b13a7b41e2d9010000000000000000...       │
 │ Current Stage     : STAGE 2: CANARY_5_PCT (250 / 5,000 Appliances)          │
 │ Canary Health     : Latency p50: 0.82 µs | p99: 0.84 µs (0 SLA Breaches)   │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ PROGRESS: [████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 5% Cohort Active  │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ ACTIONS:                                                                    │
 │  [ PROMOTE TO FLEET-WIDE (100%) ]       [ EMERGENCY ABORT & ROLLBACK ]      │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Interactive Rollback Protection

* **1-Click Rollback:** Clicking **`[EMERGENCY ABORT & ROLLBACK]`** instantly triggers `RollbackGuard`, sending a rollback instruction across all active Canary appliances in $< 50\,\text{ms}$.
* **Health Safeguard:** If Canary nodes report latency exceeding $1{,}000\,\mu\text{s}$, the UI displays an alert banner, disables manual promotion buttons, and initiates an automatic rollback.

