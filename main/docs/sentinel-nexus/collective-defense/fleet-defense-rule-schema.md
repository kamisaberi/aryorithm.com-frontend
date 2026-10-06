# Fleet Defense Rule Protobuf Specification & Ephemeral TTLs

Fleet defense rules are serialized using Protocol Buffers v3 and streamed over HTTP/2 connections.

---

## 1. Protobuf Definition (`sentinel_nexus.proto`)

```protobuf
syntax = "proto3";
package sentinel.nexus;

message FleetDefenseRule {
    // Unique rule identifier assigned by Nexus
    uint32 rule_id = 1;

    // Target IPv4 address in network byte order (Big-Endian)
    uint32 target_ipv4_net_order = 2;

    // Ephemeral Time-To-Live in seconds (e.g. 60s, 3600s)
    uint64 ttl_seconds = 3;

    // Monotonic timestamp when rule was broadcast
    int64 broadcast_timestamp_ns = 4;

    // Originating node identifier (Used for loop suppression)
    string originator_uuid = 5;

    // Exploit classification (e.g. "MODBUS_REGISTER_OVERRIDE")
    string threat_classification = 6;

    // MITRE ATT&CK Technique ID (e.g. "T0855")
    string mitre_technique_id = 7;

    // Severity level: 1 = Low, 2 = Medium, 3 = High, 4 = Critical
    uint32 severity = 8;
}
```

---

## 2. Ephemeral TTL Management

Every rule includes an explicit `ttl_seconds` field:
* **Short-Lived Probes (Scans / Brute-force):** $\text{TTL} = 60\,\text{seconds}$.
* **Active SCADA Sabotage Attempts:** $\text{TTL} = 3{,}600\,\text{seconds}$ ($1\,\text{hour}$).
* **Persistent Exploits:** $\text{TTL} = 86{,}400\,\text{seconds}$ ($24\,\text{hours}$).

Edge appliances ingest this duration directly into their in-kernel monotonic timers, allowing stale block rules to expire automatically without requiring deletion broadcasts.

