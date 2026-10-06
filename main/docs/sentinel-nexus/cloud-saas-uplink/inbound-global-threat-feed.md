# Inbound Global Consortium Threat Feed

Subscribers to the Aryorithm Global Defense Consortium opt-in to receive anonymized zero-day threat indicators discovered across other enterprise tenant enclaves.

---

## 1. Global Feed Ingestion & eBPF Verification

```text
 Aryorithm Global Threat Cloud (app.aryorithm.com)
                       │
                       ▼ GET /api/v1/threats/global-feed (Polled every 60s)
 ┌─────────────────────────────────────────────────────────────┐
 │ SaaSConnector::poll_global_threat_feed()                    │
 ├─────────────────────────────────────────────────────────────┤
 │ Ingests verified zero-day IoC records:                      │
 │  • Target IPv4 / Subnet CIDR                                │
 │  • Verified Attestation: Discovered on TIER 1 Hardware      │
 │  • MITRE ATT&CK Technique ID & Threat Signature             │
 └─────────────────────┬───────────────────────────────────────┘
                       │
                       ▼ Direct Local In-Kernel Injection
 ┌─────────────────────────────────────────────────────────────┐
 │ Injected into local Nexus Collective Defense Bus (< 50ms)   │
 │ -> Programmed into all 5,000 edge eBPF blocked_ip_map tables│
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Inbound IoC Schema (`GlobalThreatFeed.json`)

```json
{
  "feed_timestamp_ns": 1791172800184000000,
  "new_indicators": [
    {
      "indicator_id": "ioc-global-8412",
      "target_ipv4_net_order": 3221225542,
      "target_ip_str": "192.0.2.70",
      "ttl_seconds": 86400,
      "severity": "CRITICAL",
      "threat_name": "TRITON_SIS_OVERRIDE_SCANNER",
      "mitre_id": "T0843",
      "consensus_confidence": 0.998
    }
  ]
}
```

