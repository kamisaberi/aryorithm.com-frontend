# Persistent Real-Time Telemetry Stream (`GET /api/v1/telemetry/stream`)

`sentinel-nexus` exposes a persistent **Server-Sent Events (SSE)** endpoint on port **9444** (and proxied via port 9443). It streams fleet telemetry, threat mitigations, and Canary health events at up to $100\text{ Hz}$.

---

## 1. Stream Endpoint Specification

* **Route:** `GET /api/v1/telemetry/stream` (Port 9444 or 9443)
* **Headers:**
  * `Accept: text/event-stream`
  * `Authorization: Bearer <TOKEN>`
* **Response Header:** `Content-Type: text/event-stream; charset=utf-8`

---

## 2. Stream Event Types

### Event: `fleet_tick`
Pushed every second with aggregated fleet-wide metrics:
```text
event: fleet_tick
data: {"timestamp_ns":1791172800184000000,"online_nodes":4992,"drops_today":1420891,"fleet_sla_us":0.82,"active_rules":12}
```

### Event: `threat_drop`
Pushed instantly when an edge appliance mitigates an active attack:
```text
event: threat_drop
data: {"incident_id":"inc-1802","appliance":"edge-substation-alpha","src_ip":"198.51.100.42","mitre_id":"T0855","action":"XDP_DROP","latency_us":0.81}
```

### Event: `collective_defense_sync`
Pushed when a rule is broadcast across the fleet bus:
```text
event: collective_defense_sync
data: {"rule_id":9042,"target_ip":"198.51.100.42","ttl_seconds":3600,"dispatched_nodes":4991,"latency_ms":31.4}
```

### Event: `canary_rollback`
Pushed if `RollbackGuard` aborts a candidate model rollout:
```text
event: canary_rollback
data: {"reason":"LATENCY_SLA_BREACH","observed_latency_us":1420.5,"reverted_to":"network_threat_v1.onnx"}
```

---

## 3. Client Consumption Example (Python)

```python
import sseclient
import requests

url = "http://127.0.0.1:9444/stream"
headers = {"Accept": "text/event-stream"}
response = requests.get(url, headers=headers, stream=True)
client = sseclient.SSEClient(response)

for event in client.events():
    print(f"[{event.event}] -> {event.data}")
```

