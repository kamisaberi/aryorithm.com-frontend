# High-Availability Clustering & Failover Topology

In mission-critical infrastructure, a single point of failure in the fleet command plane is unacceptable. `sentinel-nexus` supports **Active-Standby High-Availability (HA) Clustering** managed via a Virtual IP (VIP) and state replication.

---

## 1. Active-Standby Failover Architecture

```text
                           [ Virtual IP (VIP): 10.240.0.10 ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼ (Active Node)                                 ▼ (Standby Node)
 ┌───────────────────────────────┐               ┌───────────────────────────────┐
 │ sentinel-nexus Primary        │               │ sentinel-nexus Secondary      │
 │ • State: LEADER (Active)      │               │ • State: FOLLOWER (Warm)      │
 │ • Holds VIP (10.240.0.10)     │               │ • Monitors Primary Heartbeat  │
 └───────────────┬───────────────┘               └───────────────▲───────────────┘
                 │                                               │
                 └──────── Synchronous State Journaling ─────────┘
                   (nexus_state.json synced over private link)
```

---

## 2. Failover Protocol Sequence

1. **Health Monitoring:** The secondary Nexus instance polls the primary instance over a dedicated heartbeat link every $500\,\text{ms}$.
2. **Failure Detection:** If the primary instance fails to respond for $1{,}500\,\text{ms}$ (3 missed heartbeats):
   * The secondary instance promotes itself to **`LEADER`**.
   * The secondary instance issues an **Arp Gratuitous** broadcast claiming the Virtual IP (`10.240.0.10`).
3. **Seamless Appliance Reconnection:** All 5,000 edge appliances (`blackbox-sentinel`) reconnect to the VIP within $2.0\text{ seconds}$ without configuration changes.

