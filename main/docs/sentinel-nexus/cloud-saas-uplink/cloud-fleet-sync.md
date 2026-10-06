# High-Frequency Fleet Synchronization (`POST /api/v1/fleet/sync`)

Every **5.0 seconds**, `SaaSConnector` serializes the active 4-tier asset hierarchy and telemetry summary, transmitting the nested payload to the cloud backend over a single non-blocking HTTP/2 request.

---

## 1. Transmission Payload Schema

```json
{
  "tenant_id": "tenant-municipal-utility-bavaria",
  "nexus_id": "nexus-central-munich",
  "sync_timestamp_ns": 1791172800184000000,
  "fleet_summary": {
    "total_nodes": 4992,
    "online_nodes": 4990,
    "degraded_nodes": 2,
    "total_drops_today": 1420891,
    "fleet_sla_median_us": 0.82
  },
  "nodes": [
    {
      "node_id": "edge-substation-alpha",
      "status": "ONLINE",
      "ip_address": "10.240.0.101",
      "tpm_tier": 1,
      "cpu_pct": 4.2,
      "npu_temp_c": 44.2,
      "drops_today": 1420,
      "sensors": [
        { "sensor_id": "modbus-10.240.0.101-502-u1", "status": "ONLINE" },
        { "sensor_id": "s7-10.240.0.102-102-r0-s2",   "status": "ONLINE" }
      ]
    }
  ]
}
```

---

## 2. In-Engine Sync Loop (`SaaSConnector.cpp`)

```cpp
void SaaSConnector::run_sync_loop() {
    while (is_running_.load(std::memory_order_relaxed)) {
        std::this_thread::sleep_for(std::chrono::seconds(5));

        if (!authenticate()) {
            continue;
        }

        // 1. Serialize active 4-tier tree snapshot
        std::string payload = build_fleet_sync_payload();

        // 2. Dispatch via non-blocking HTTPS POST
        HttpResponse resp = http_post_json("/api/v1/fleet/sync", payload, true);

        if (resp.status_code == 401) {
            // Token expired mid-run: invalidate token to force renewal next cycle
            std::lock_guard<std::recursive_mutex> lock(auth_mutex_);
            active_jwt_token_.clear();
        }
    }
}
```

