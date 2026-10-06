# Threat Mitigation & XAI Endpoints (`/api/v1/threats/*`)

These endpoints provide programmatic access to the **Sub-50ms Collective Defense Bus**, active in-kernel drop tables, MITRE ATT&CK correlation heatmaps, and Explainable AI (XAI) feature attributions.

---

## 1. Broadcast Emergency Threat: `POST /api/v1/threats/broadcast`

Manually broadcasts an IP drop rule fleet-wide, programming all 5,000 edge kernel `blocked_ip_map` tables in under $50\,\text{ms}$.

### Request:
```bash
curl -k -X POST https://localhost:9443/api/v1/threats/broadcast \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "target_ip": "198.51.100.42",
      "ttl_seconds": 3600,
      "threat_name": "SCADA_MODBUS_INJECTION",
      "mitre_id": "T0855",
      "justification": "Emergency operator containment"
    }'
```

### Response (`200 OK`):
```json
{
  "status": "BROADCAST_SUCCESS",
  "rule_id": 9042,
  "dispatched_nodes": 4992,
  "propagation_latency_ms": 31.4,
  "action": "IN_KERNEL_XDP_DROP_ENFORCED"
}
```

---

## 2. Query MITRE ATT&CK Heatmap: `GET /api/v1/threats/mitre`

Returns aggregated tactical incident counts categorized by MITRE ATT&CK Enterprise and ICS IDs.

### Response (`200 OK`):
```json
{
  "tactics": [
    {
      "tactic_id": "TA0108",
      "tactic_name": "Impair Process Control",
      "techniques": [
        { "technique_id": "T0855", "incident_count": 1420, "severity": "CRITICAL" },
        { "technique_id": "T0831", "incident_count": 842,  "severity": "CRITICAL" }
      ]
    }
  ]
}
```

---

## 3. Query Top-3 Feature Attributions: `GET /api/v1/threats/xai`

Retrieves Microsecond Residual Decomposition (MRD) root-cause feature attributions for historical threat mitigations.

