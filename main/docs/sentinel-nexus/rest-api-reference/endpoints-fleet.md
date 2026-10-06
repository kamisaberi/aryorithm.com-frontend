# Fleet Management Endpoints (`/api/v1/fleet/*`)

These endpoints provide real-time inspection, health monitoring, and grouping across all managed edge appliances (`blackbox-sentinel`).

---

## 1. List Managed Nodes: `GET /api/v1/fleet/nodes`

Returns the active fleet inventory with real-time operational health and drop counters.

### Query Parameters
* `status` (optional, string): Filter by state (`ONLINE`, `DEGRADED`, `OFFLINE`, `UNREACHABLE`).
* `tier` (optional, integer): Filter by TPM root-of-trust tier (`1`, `2`, `3`).

### Request:
```bash
curl -k -H "Authorization: Bearer $TOKEN" \
    https://localhost:9443/api/v1/fleet/nodes?status=ONLINE
```

### Response (`200 OK`):
```json
{
  "total_nodes": 1,
  "online_count": 1,
  "nodes": [
    {
      "node_uuid": "edge-substation-alpha",
      "hostname": "substation-01.internal",
      "ip_address": "10.240.0.101",
      "status": "ONLINE",
      "tpm_tier": 1,
      "tpm_manufacturer": "IFX",
      "agent_version": "2.4.0",
      "active_model": "network_threat_v1.onnx",
      "total_drops_today": 14209,
      "last_latency_us": 0.82,
      "last_heartbeat_ns": 1791172800184000000,
      "sensors_count": 2
    }
  ]
}
```

---

## 2. Inspect Node Details: `GET /api/v1/fleet/nodes/{uuid}`

Returns detailed telemetry and the attached sensor inventory for a specific appliance.

### Response (`200 OK`):
```json
{
  "node_uuid": "edge-substation-alpha",
  "hostname": "substation-01.internal",
  "hardware": {
    "cpu_cores": 16,
    "ram_total_mb": 16384,
    "ram_used_mb": 1420,
    "npu_temp_celsius": 44.2
  },
  "kernel_mitigation": {
    "interface": "eth0",
    "xdp_mode": "DRIVER",
    "active_blocked_ips": 4,
    "mitigation_sla_p99_us": 0.84
  },
  "sensors": [
    {
      "sensor_id": "modbus-10.240.0.101-502-u1",
      "protocol": "MODBUS_TCP",
      "status": "ONLINE"
    }
  ]
}
```

---

## 3. Query Node Groups: `GET /api/v1/fleet/groups`

Returns fleet groupings categorized by geographical location, facility type, or tenant.

