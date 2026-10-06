# Active Learning: Uncertainty Sampling ($0.40 - 0.60$)

In cyber-physical networks, training on redundant telemetry consumes compute resources without improving model accuracy. The `DatasetCurator` enforces **Uncertainty Sampling** to select the highest-entropy feature vectors.

---

## 1. Information Entropy Gating Formulation

Let $f(x; \theta) \in [0.0, 1.0]$ represent the model's predicted anomaly probability for flow $x$.

The binary classification entropy $\mathcal{H}(x)$ is maximized when the model is most uncertain ($f(x) \approx 0.50$):

$$\mathcal{H}(x) = -f(x)\log_2 f(x) - (1 - f(x))\log_2(1 - f(x))$$

```text
 Entropy H(x)
  1.00 ──┐                     .-.
         │                   /     \
  0.97 ──┼──────────────────/───────\──────────────────────── Threshold H >= 0.971
         │                 /         \
  0.50 ──┼────────        /           \        ────────
         │        \      /             \      /
  0.00 ──┴─────────┴────┴───────────────┴────┴─────────► Prediction Score f(x)
        0.00         0.40      0.50      0.60         1.00
       [BENIGN]        [UNCERTAIN BOUNDARY]         [ATTACK]
        Discard              CURATE                  Discard
```

---

## 2. Ingestion Filter Rules

| Score Range | Classification Status | Curator Action | Rationale |
| :--- | :--- | :--- | :--- |
| **$[0.00, 0.40)$** | Confident Benign | **Discard** | Redundant normal baseline; adds no informational value. |
| **$[0.40, 0.60]$** | **Uncertain Boundary** | **Curate into Queue** | Model decision boundary is ambiguous; high information gain. |
| **$(0.60, 1.00]$** | Confident Anomaly | **Discard from Training** | Already detected and dropped by in-kernel eBPF filter. |

