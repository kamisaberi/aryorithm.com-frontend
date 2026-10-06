# Command: `nexus-ctl threat drop`

Manually broadcasts an emergency IP drop rule across the entire fleet via the **Sub-50ms Collective Defense Bus**, programming the target address directly into all 5,000 edge kernel `blocked_ip_map` tables.

---

## 1. Syntax

```bash
nexus-ctl threat drop <TARGET_IP> [OPTIONS]
```

### Options

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `<TARGET_IP>` | IPv4 String | **Required** | The target IPv4 address to block fleet-wide. |
| `--ttl INT` | Integer | `3600` | Ephemeral Time-To-Live in seconds (e.g., 3600 = 1h). |
| `--rule-id INT` | Integer | `9001` | Unique security rule identifier. |
| `--mitre-id STR` | String | `T0855` | Associated MITRE ATT&CK technique ID. |
| `--reason STR` | String | `"Manual"` | Operator justification for audit trail logging. |

---

## 2. Execution Example

```bash
nexus-ctl threat drop 198.51.100.42 \
    --ttl 7200 \
    --mitre-id T0855 \
    --reason "Coordinated Modbus brute-force sweep on Substation Alpha"
```

### Terminal Output:
```text
[*] Initiating Collective Defense Broadcast...
[+] Target Address      : 198.51.100.42 (Network Byte Order: 0x2A6433C6)
[+] Duration (TTL)      : 7200 seconds (2 Hours)
[+] MITRE Technique     : T0855 (Unauthorized Command Message)
[+] Justification       : Coordinated Modbus brute-force sweep on Substation Alpha

--------------------------------------------------------------------------------
[+] DISPATCH SUMMARY:
    Dispatched Nodes    : 4,992 Active Appliances
    Propagation Latency : 31.4 milliseconds (< 50ms SLA Bound)
    Enforcement State   : IN_KERNEL_XDP_DROP ACTIVE FLEET-WIDE
================================================================================
```

---

## 3. Global Unblocking (`threat unblock`)

To remove a false-positive block fleet-wide:

```bash
nexus-ctl threat unblock 198.51.100.42 --reason "Authorized testing completed"
```

