# False-Positive Surge Protection & Drop Burst Aborts

A candidate model that passes the Golden Attacks Safety Gate may still trigger false positives on unexpected ambient traffic, leading to unauthorized drops on legitimate plant communication flows.

`sentinel-nexus` monitors collective drop volume to detect and abort **False-Positive Surges**.

---

## 1. Statistical Surge Detection Formula

`sentinel-nexus` maintains an Exponentially Weighted Moving Average (EWMA) of drop rates across the fleet:

$$\mu_{\text{baseline}}(t) = \alpha \cdot \text{Drops}_{\text{current}} + (1 - \alpha) \cdot \mu_{\text{baseline}}(t - 1), \quad \alpha = 0.05$$

$$\text{Surge Ratio} = \frac{\text{Drops}_{\text{Canary Cohort}}}{\mu_{\text{baseline}}}$$

```text
 Drop Rate (Drops/Sec)
  1000 ──┐                                                     ┌── FALSE POSITIVE SURGE!
         │                                                     │   Surge Ratio > 5.0x
   500 ──┼─────────────────────────────────────────────────────┼──────────────────────
         │                                                     │   Auto-Rollback Triggered
   100 ──┼─── Baseline EWMA μ = 85 drops/sec ──────────────────┘
     0 ──┴────────────────────────────────────────────────────────────────────────────► Time
```

---

## 2. Automated Circuit Interruption

If the active drop rate on Canary appliances spikes by more than **$5\times$ ($500\%$)** relative to the moving baseline:
1. `sentinel-nexus` aborts the Canary rollout immediately.
2. An automated instruction reverts Canary nodes to the previous baseline model within $50\,\text{ms}$.
3. The offending candidate weights are quarantined for active learning investigation.

