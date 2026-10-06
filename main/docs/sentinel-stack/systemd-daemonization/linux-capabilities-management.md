# Granular Linux Capabilities Management

Running security daemons as unrestricted `root` violates the principle of least privilege. `sentinel-stack` restricts process execution using **Linux POSIX Capabilities**, granting only the exact kernel privileges required for packet filtering and hardware attestation.

---

## 1. Required Capabilities Matrix

| Capability Flag | Subsystem Function | Reason Required |
| :--- | :--- | :--- |
| **`CAP_NET_ADMIN`** | Tier 2 `libblackbox.so` | Attaching eBPF programs to XDP netdev driver hooks. |
| **`CAP_NET_RAW`** | Tier 5 `sentinel_lab` | Binding to `AF_PACKET` raw sockets for wire injection. |
| **`CAP_BPF`** | In-Kernel Fast Path | Loading BPF bytecode and managing kernel map descriptors. |
| **`CAP_SYS_RESOURCE`**| Memory Management | Locking physical pages (`mlock`) without `ulimit -l` ceiling. |
| **`CAP_SYS_PTRACE`** | Subsystem `11_rasp` | Inspecting process memory maps (`/proc/self/maps`). |

---

## 2. Ambient Capability Inheritance

In `sentinel.service`, capabilities are bound using both bounding sets and ambient capabilities:

```ini
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_BPF CAP_SYS_RESOURCE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW CAP_BPF CAP_SYS_RESOURCE
```

This configuration ensures that worker threads spawned by the C++ engine retain the necessary network and BPF privileges without granting full superuser permissions.

