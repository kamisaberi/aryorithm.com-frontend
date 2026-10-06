# Detailed Latency Budget: The Sub-50ms Fanout Timeline

The table below breaks down the microsecond and millisecond timing budget of a real-world collective defense propagation across Europe:

---

## 1. Latency Breakdown Table

| Step | Action & Subsystem | Duration | Cumulative Time | Location |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Attacking packet arrives at NIC MAC/PHY layer | $0.00\,\mu\text{s}$ | $0.00\,\mu\text{s}$ | Substation A |
| **2** | eBPF driver hook parses packet and scores anomaly | $0.72\,\mu\text{s}$ | $0.72\,\mu\text{s}$ | Substation A |
| **3** | eBPF executes `XDP_DROP` in driver space | $0.12\,\mu\text{s}$ | **$0.84\,\mu\text{s}$** | Substation A |
| **4** | Substation A `NexusUplink` serializes `ThreatIoC` | $42.0\,\mu\text{s}$ | $42.8\,\mu\text{s}$ | Substation A |
| **5** | Network transit from Substation A to Nexus Hub | $14.2\,\text{ms}$ | $14.24\,\text{ms}$ | WAN Fiber |
| **6** | Nexus Hub parses gRPC, deduplicates in memory | $1.8\,\text{ms}$ | $16.04\,\text{ms}$ | Nexus Server |
| **7** | `IocBroadcaster` fans out rule over 4,999 gRPC streams | $2.1\,\text{ms}$ | $18.14\,\text{ms}$ | Nexus Server |
| **8** | Network transit from Nexus Hub to Substation B | $15.4\,\text{ms}$ | $33.54\,\text{ms}$ | WAN Fiber |
| **9** | Substation B `KernelDropInjector` executes BPF syscall | $0.18\,\mu\text{s}$ | **$33.54\,\text{ms}$** | Substation B |

$$\text{Total Fleet Synchronization Time} = 33.54\,\text{milliseconds} \quad (\ll 50\,\text{ms SLA Bound})$$

---

## 2. Visualization of the Fanout Budget

```text
 0 ms      10 ms     20 ms     30 ms     40 ms     50 ms
 ├─────────┼─────────┼─────────┼─────────┼─────────┤
 [0.84µs Drop]
           [==== WAN Ingress ====]
                                 [Fanout]
                                        [==== WAN Egress ====]
                                                             [Kernel Injection: 0.18µs]
                                                             ▲
                                                 TOTAL: 33.54 ms
```

