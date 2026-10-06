---

### File: `sentinel-nexus/docs/getting-started/verifying-services.md`

```markdown
# Verifying Services & Port Status

Confirm that all three network services exposed by `sentinel-nexus` are bound and accepting traffic.

---

## 1. Network Port Verification

Run `ss` or `netstat` to verify listener bindings:

```bash
sudo ss -tulpn | grep -E '50051|9443|9444'
```

### Expected Output
```text
tcp   LISTEN 0      4096   0.0.0.0:50051   0.0.0.0:*   users:(("sentinel-nexus",pid=12040,fd=14))
tcp   LISTEN 0      128    0.0.0.0:9443    0.0.0.0:*   users:(("sentinel-nexus",pid=12040,fd=18))
tcp   LISTEN 0      128    0.0.0.0:9444    0.0.0.0:*   users:(("sentinel-nexus",pid=12040,fd=22))
```

---

## 2. Verifying the REST API & Web Command Center (Port 9443)

Query the health endpoint:

```bash
curl -k -s https://localhost:9443/api/v1/health | jq .
```

### Response:
```json
{
  "status": "HEALTHY",
  "version": "2.4.0",
  "active_appliances": 1,
  "collective_defense_bus": "ARMED",
  "active_model_sha256": "e9a2c31e847b2c94b13a7b41e2d9010000000000000000000000000000000000"
}
```

---

## 3. Testing the Real-Time SSE Stream (Port 9444)

Listen to the continuous Server-Sent Events stream:

```bash
curl -N http://localhost:9444/stream
```

### Stream Output:
```text
event: fleet_tick
data: {"timestamp_ns":1791172800184000000,"online_nodes":1,"total_drops_today":1420,"fleet_sla_us":0.82}
```
```

