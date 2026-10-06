# Command: `nexus-ctl fleet list`

Queries the centralized `NodeRegistry` on `sentinel-nexus`, displaying real-time operational status, CPU utilization, drop counters, and sub-microsecond mitigation SLAs across all managed edge appliances.

---

## 1. Syntax

```bash
nexus-ctl fleet list [OPTIONS]
```

### Options

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--status [ALL\|ONLINE\|DEGRADED\|OFFLINE]` | String | `ALL` | Filters nodes by active health state. |
| `--tpm-tier [1\|2\|3]` | Integer | All | Filters by hardware root-of-trust level. |
| `--limit INT` | Integer | `50` | Maximum number of appliances to display. |
| `--json` | Flag | `false` | Emits raw JSON array for shell scripting. |

---

## 2. Standard Table Output

```bash
nexus-ctl fleet list --status ONLINE
```

### Output:
```text
====================================================================================================
                              SENTINEL-NEXUS ACTIVE MANAGED FLEET
====================================================================================================
NODE UUID                  HOSTNAME               IP ADDRESS     STATUS   TPM    DROPS   SLA (p99)
edge-substation-alpha      substation-01.internal 10.240.0.101   ONLINE   TIER1  14,209  0.82 µs
edge-substation-bravo      substation-02.internal 10.240.0.102   ONLINE   TIER1   8,412  0.81 µs
edge-water-treatment-01    water-munich.internal  10.240.0.103   ONLINE   TIER1   1,094  0.84 µs
edge-medical-clinic-04     radiology-04.internal  10.240.0.104   ONLINE   TIER2     142  0.83 µs
----------------------------------------------------------------------------------------------------
Total Nodes Displayed: 4 | Fleet Average Latency: 0.825 µs | Fleet SLA Status: COMPLIANT (< 1.0 µs)
====================================================================================================
```

---

## 3. JSON Output for Automated Tooling

```bash
nexus-ctl fleet list --json | jq '.[0] | {uuid: .node_uuid, ip: .ip_address, latency: .last_latency_us}'
```

### JSON Record:
```json
{
  "uuid": "edge-substation-alpha",
  "ip": "10.240.0.101",
  "latency": 0.82
}
```

