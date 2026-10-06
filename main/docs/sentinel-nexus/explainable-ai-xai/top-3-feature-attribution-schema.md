# Top-3 Feature Attribution Schema Specification

Every mitigation event reported to `sentinel-nexus` contains a structured **Top-3 Feature Attribution** payload describing the primary mathematical drivers of the anomaly.

---

## 1. JSON Schema Definition

```json
{
  "incident_id": "inc-1802-8f1c2a04",
  "appliance_uuid": "edge-substation-alpha",
  "timestamp_ns": 1791172800184000000,
  "mitre_technique_id": "T0855",
  "anomaly_score": 0.2842,
  "anomaly_threshold": 0.0820,
  "top_attributions": [
    {
      "rank": 1,
      "feature_index": 0,
      "feature_name": "MODBUS_REGISTER_SETPOINT_40001",
      "contribution_percentage": 64.2,
      "observed_value": 9850.0,
      "baseline_value": 2100.0,
      "residual_delta": "+7750.0 PSI",
      "semantic_description": "Safety-critical gas relief valve setpoint exceeded maximum physical limit (4500 PSI)."
    },
    {
      "rank": 2,
      "feature_index": 20,
      "feature_name": "FLOW_PACKETS_PER_SECOND",
      "contribution_percentage": 23.8,
      "observed_value": 82000.0,
      "baseline_value": 150.0,
      "residual_delta": "+81850.0 pps",
      "semantic_description": "Severe packet transmission rate burst indicative of automated command flooding."
    },
    {
      "rank": 3,
      "feature_index": 16,
      "feature_name": "INTER_ARRIVAL_TIME_MEAN",
      "contribution_percentage": 12.0,
      "observed_value": 0.000012,
      "baseline_value": 0.012500,
      "residual_delta": "-0.012488 s",
      "semantic_description": "Loss of normal cyclic polling jitter; automated script injection profile detected."
    }
  ]
}
```

---

## 2. Field Specifications

| Property | Type | Description |
| :--- | :--- | :--- |
| `rank` | `uint32_t` | Contribution ranking: `1` (Highest driver) to `3`. |
| `feature_index` | `uint32_t` | Tensor dimension index ($0$ through $31$). |
| `contribution_percentage`| `double` | Mathematical percentage of the total residual error: $\frac{e_j}{\sum e_k} \times 100$. |
| `observed_value` | `double` | Unscaled physical value observed on the wire. |
| `baseline_value` | `double` | Unscaled value predicted by the autoencoder baseline. |
| `residual_delta` | `string` | Formatted physical delta with dimensional engineering units. |

