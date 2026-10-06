# Monitoring Daemon Health & Socket Listeners (`sudo make status`)

The `make status` target checks service health, process CPU/RAM consumption, and active network socket listeners.

---

## 1. Execution Command

```bash
sudo make status
```

---

## 2. Output Breakdown

```text
================================================================================
                    ARYORITHM SENTINEL-STACK SERVICE HEALTH
================================================================================

------------------------------ SYSTEMD SERVICES --------------------------------
 ● sentinel-nexus.service - Aryorithm Sentinel-Nexus Central Command Plane
     Active: active (running) since Mon 2026-10-05 08:00:00 UTC; 4h 12min ago
   Main PID: 12040 (sentinel-nexus)
      Tasks: 18 (limit: 65536)
     Memory: 142.0M (limit: 2.0G)
        CPU: 4.2% (SCHED_RR Priority 80)

 ● sentinel.service - Aryorithm Blackbox-Sentinel Cyber-Physical Edge XDR
     Active: active (running) since Mon 2026-10-05 08:00:05 UTC; 4h 11min ago
   Main PID: 14022 (sentinel)
      Tasks: 24 (limit: 65536)
     Memory: 180.4M (limit: 2.0G)
        CPU: 2.1% (SCHED_RR Priority 98)

------------------------------ LISTENER SOCKETS --------------------------------
 [OK] TCP 0.0.0.0:50051   sentinel-nexus (gRPC Fleet Service)
 [OK] TCP 0.0.0.0:9443    sentinel-nexus (Web Command Center & REST API)
 [OK] TCP 0.0.0.0:9444    sentinel-nexus (Real-Time SSE Stream)
 [OK] TCP 0.0.0.0:8443    sentinel       (Local Edge Web Console)

------------------------------ IN-KERNEL eBPF HOOK -----------------------------
 [OK] Interface: eth0     Program ID: 142 (xdp_filter.o)  Mode: DRIVER (<0.84µs)
================================================================================
```

