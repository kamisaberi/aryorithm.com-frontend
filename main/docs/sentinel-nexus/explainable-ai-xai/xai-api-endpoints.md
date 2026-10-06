# Auditor REST Endpoints: Querying Explainable Telemetry

Compliance officers and security analysts query physical feature deviations via the `sentinel-nexus` REST API on port **9443**.

---

## 1. Endpoint: `GET /api/v1/threats/xai`

Returns a paginated list of historical threat mitigations with full top-3 feature attributions.

### Query Parameters
* `limit` (optional, integer, default: 50): Number of records to return.
* `mitre_id` (optional, string): Filter by MITRE technique (e.g. `T0855`).
* `since_ns` (optional, integer): Monotonic epoch timestamp filter.

### Request:
```bash
curl -k -H "Authorization: Bearer $JWT" \
    https://localhost:9443/api/v1/threats/xai?limit=1&mitre_id=T0855
```

### Response (`200 OK`):
```json
{
  "total_records": 1,
  "incidents": [
    {
      "incident_id": "inc-1802-8f1c2a04",
      "timestamp_ns": 1791172800184000000,
      "source_ip": "198.51.100.42",
      "destination_ip": "10.240.0.101",
      "mitre_technique_id": "T0855",
      "mitigation_action": "XDP_DROP",
      "mitigation_latency_us": 0.82,
      "top_attributions": [
        {
          "rank": 1,
          "feature_name": "MODBUS_REGISTER_SETPOINT_40001",
          "contribution_percentage": 64.2,
          "observed": 9850.0,
          "baseline": 2100.0,
          "unit": "PSI"
        },
        {
          "rank": 2,
          "feature_name": "FLOW_PACKETS_PER_SECOND",
          "contribution_percentage": 23.8,
          "observed": 82000.0,
          "baseline": 150.0,
          "unit": "pps"
        },
        {
          "rank": 3,
          "feature_name": "INTER_ARRIVAL_TIME_MEAN",
          "contribution_percentage": 12.0,
          "observed": 0.000012,
          "baseline": 0.012500,
          "unit": "s"
        }
      ]
    }
  ]
}
```

---

## 2. Endpoint: `GET /api/v1/threats/xai/{incident_id}`

Retrieves the raw high-resolution residual vector for a single incident.

