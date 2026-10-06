# Linux Systemd Service Architecture & Lifecycle Management

In mission-critical industrial, healthcare, and defense deployments, the daemons comprising the Aryorithm ecosystem (`sentinel-nexus` and `sentinel`) must run continuously as hardened background system services managed by the Linux system and service manager (`systemd`).

---

## 1. Systemd Service Hierarchy & Dependencies

```text
 [ Network & Filesystem Targets (network-online.target, local-fs.target) ]
                                    │
                                    ▼ Requires BPF Virtual Filesystem Mounted
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ /sys/fs/bpf (Mounted via bpffs during Phase 0)                          │
 └──────────────────────────────────┬──────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼ Starts Central Hub First                              ▼ Starts Edge Defense Node
 ┌─────────────────────────────┐                         ┌─────────────────────────────┐
 │ sentinel-nexus.service      │                         │ sentinel.service            │
 │ • Fleet Hub (Port 50051)    │◄────────────────────────┤ • Edge XDR Daemon           │
 │ • Web Console (Port 9443)   │   gRPC Connection       │ • In-Kernel eBPF XDP Drops  │
 │ • WorkingDir: /var/lib/...  │                         │ • Real-Time SCHED_RR Pri 98 │
 └─────────────────────────────┘                         └─────────────────────────────┘
```

---

## 2. Process Lifecycle & Auto-Restart Invariants

* **Crash Recovery Circuit:** Configured with `Restart=always` and `RestartSec=3s`. If an unhandled fatal condition occurs, systemd relaunches the process automatically within 3 seconds.
* **Rapid Restart Throttling:** Includes `StartLimitIntervalSec=60s` and `StartLimitBurst=5` to prevent tight crash-loop spinning if configuration files are missing.
* **Graceful Teardown Signaling:** Dispatches `SIGTERM` on shutdown, triggering internal signal traps that execute instant **0ms graceful deregistration** before process termination.

