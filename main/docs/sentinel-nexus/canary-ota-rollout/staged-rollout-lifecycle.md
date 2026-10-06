# Staged Rollout Lifecycle: Shadow Mode to Fleet-Wide Promotion

Deploying deep neural network weights directly to 5,000 active edge defense appliances presents operational risks. An unexpected regression can induce false-positive drops on critical control flows or increase inference latency beyond the sub-microsecond line-rate budget.

`sentinel-nexus` manages model deployments through a **three-stage rollout lifecycle** guarded by automated safety checks.

---

## 1. Rollout State Machine

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ STAGE 0: CANDIDATE STAGED (POST /api/v1/ota/stage)          │
 │  - Validates SHA-256 manifest and ONNX Opset 17 schema       │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Promote to Shadow
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ STAGE 1: SHADOW EVALUATION MODE (48-Hour Evaluation Window) │
 │  - Deployed in parallel with production baseline on fleet   │
 │  - Evaluates live traffic; zero active kernel drop authority│
 │  - Pass Requirement: Prediction Divergence <= 2.5%          │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Promote to Canary
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ STAGE 2: CANARY FLEET ENFORCEMENT (5% Cohort Active)        │
 │  - Hash-selected non-critical appliances enforce drops      │
 │  - Monitored continuously by RollbackGuard SLA watchdog     │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ SLA Breach (> 1000µs) or FP Surge             ▼ Passes Canary (24 Hours)
 ┌─────────────────────────────┐         ┌─────────────────────────────┐
 │ STAGE: ROLLED_BACK          │         │ STAGE 3: FLEET-WIDE PROMOTION│
 │ • Instant downgrade to v1   │         │ • 100% of Fleet Promoted    │
 │ • Invalidate Canary cohort  │         │ • Zero-downtime hot reload  │
 └─────────────────────────────┘         └─────────────────────────────┘
```

---

## 2. Transition Gate Criteria

| Transition Stage | Target Cohort | Enforcement Power | Promotion Requirements | Rollback Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **`SHADOW_MODE`** | 100% of Fleet | **Passive (0% Drops)** | Runtime divergence $\le 2.5\%$ for 48 hours. | Model crash or NPU driver fault. |
| **`CANARY_5_PCT`** | 5% of Fleet ($250$ Nodes) | **Active ($< 0.84\,\mu\text{s}$ Drops)**| Zero false-positive surges for 24 hours. | Mitigation latency $> 1{,}000\,\mu\text{s}$ or drops spike $> 5\times$. |
| **`FLEET_WIDE`** | 100% of Fleet ($5{,}000$ Nodes)| **Active ($< 0.84\,\mu\text{s}$ Drops)**| Full deployment across all operational clusters. | Collective Defense SLA breach. |

