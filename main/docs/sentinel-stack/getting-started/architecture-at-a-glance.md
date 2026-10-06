# Architecture at a Glance

The diagram below details the filesystem layout, compilation dependencies, and daemonization hooks provisioned by `sentinel-stack`.

---

```text
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │ HOST OPERATING SYSTEM: Ubuntu 24.04 / 26.04 LTS                                          │
 │                                                                                          │
 │  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ SYSTEM-WIDE COMPILATION & RUNTIME LAYOUT                                           │  │
 │  │                                                                                    │  │
 │  │  • /usr/local/include/xinfer/       : C++20 Header API (InferenceEngine, Tensor)   │  │
 │  │  • /usr/local/include/blackbox/     : C++20 Header API (XdpManager, RingBuffer)    │  │
 │  │  • /usr/local/lib/libxinfer.so      : Tier 1 Zero-Copy Inference Core               │  │
 │  │  • /usr/local/lib/libblackbox.so    : Tier 2 Active In-Kernel Mitigation Core       │  │
 │  │  • /usr/local/lib/bpf/xdp_filter.o  : In-Kernel eBPF Driver Packet Filter           │  │
 │  │  • /usr/local/bin/sentinel          : Tier 3 Commercial XDR Edge Appliance Daemon   │  │
 │  │  • /usr/local/bin/forge-cli         : Tier 4 Continual AI Active Learning CLI       │  │
 │  │  • /usr/local/bin/sentinel_lab      : Tier 5 Academic Research & Benchmark Testbed  │  │
 │  │  • /usr/local/bin/sentinel-nexus    : Tier 6 Central Fleet Command Hub Daemon       │  │
 │  │  • /usr/local/bin/nexus-ctl         : Operations & Administration CLI               │  │
 │  └───────────────────────────────────┬────────────────────────────────────────────────┘  │
 │                                      │                                                   │
 │  ┌───────────────────────────────────┴────────────────────────────────────────────────┐  │
 │  │ SYSTEMD REAL-TIME SERVICES (SCHED_RR Priority 98, Nice -20)                        │  │
 │  │  • sentinel-nexus.service   ──► Central Hub (Ports 50051, 9443, 9444)              │  │
 │  │  • sentinel.service         ──► Local Edge Defense Node (<0.84µs In-Kernel Drops)  │  │
 │  └───────────────────────────────────┬────────────────────────────────────────────────┘  │
 │                                      │                                                   │
 │  ┌───────────────────────────────────┴────────────────────────────────────────────────┐  │
 │  │ CYBER-RANGE DIGITAL TWIN BRIDGE (sentinel-matrix)                                  │  │
 │  │ Auto-harvests binaries & ldd dependencies into:                                    │  │
 │  │ sentinel-matrix/shared/{bin, lib, models, certs}/                                 │  │
 │  └────────────────────────────────────────────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
```

