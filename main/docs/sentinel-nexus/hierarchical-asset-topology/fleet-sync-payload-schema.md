# Fleet Sync Payload Schema (`POST /api/v1/fleet/sync`)

Every 5 seconds, the `SaaSConnector` subsystem on `sentinel-nexus` serializes the active 4-tier asset tree into a nested JSON structure and transmits it to the central cloud platform (`app.aryorithm.com`).

---

## 1. JSON Payload Specification

```json
{
  "tenant_id": "tenant-municipal-utility-bavaria",
  "nexus_id": "nexus-central-munich",
  "sync_timestamp_ns": 1791172800184000000,
  "nodes": [
    {
      "node_id": "edge-substation-alpha",
      "hostname": "substation-01.internal",
      "ip_address": "10.240.0.101",
      "agent_version": "2.4.0",
      "status": "ONLINE",
      "tpm_tier": "TIER1_PHYSICAL_TPM",
      "cpu_usage_pct": 4.2,
      "memory_used_mb": 1420,
      "total_drops_today": 1420,
      "last_latency_us": 0.82,
      "sensors": [
        {
          "sensor_id": "modbus-10.240.0.101-502-u1",
          "protocol": "MODBUS_TCP",
          "ip_address": "10.240.0.101",
          "port": 502,
          "status": "ONLINE",
          "anomalies_detected": 0
        },
        {
          "sensor_id": "s7-10.240.0.102-102-r0-s2",
          "protocol": "S7COMM",
          "ip_address": "10.240.0.102",
          "port": 102,
          "status": "ONLINE",
          "anomalies_detected": 1
        }
      ]
    }
  ]
}
```

---

## 2. Invariants

* **Compression:** Large fleet sync payloads ($> 500\text{ nodes}$) are compressed with `gzip` on transmission (`Content-Encoding: gzip`).
* **Non-Blocking Egress:** The sync payload is generated from read-only `NodeRegistry` snapshots, ensuring edge packet drops and local telemetry processing continue uninterrupted.

