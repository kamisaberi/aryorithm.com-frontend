# Production Unit Configuration: `sentinel.service`

The `sentinel.service` unit manages the Tier 3 edge appliance daemon (`sentinel`), enforcing in-kernel eBPF packet mitigation directly on network device driver rings.

---

## 1. Unit File Definition (`/etc/systemd/system/sentinel.service`)

```ini
[Unit]
Description=Aryorithm Blackbox-Sentinel Cyber-Physical Edge XDR Appliance
Documentation=https://docs.aryorithm.com/sentinel/
After=network-online.target local-fs.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root

# Binary Invocation & Active Config
ExecStart=/usr/local/bin/sentinel --config /etc/sentinel/sentinel.yaml
ExecReload=/bin/kill -HUP $MAINPID

# Process Lifecycle
Restart=always
RestartSec=3s
KillMode=mixed
TimeoutStopSec=5s

# Unrestricted Locked Physical Memory for AF_XDP & eBPF Maps
LimitMEMLOCK=infinity
LimitNOFILE=1048576
LimitNPROC=65536

# Maximum Real-Time Priority Scheduling
CPUSchedulingPolicy=rr
CPUSchedulingPriority=98
Nice=-20
OOMScoreAdjust=-1000

# Linux Capabilities Granular Delegation
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_BPF CAP_SYS_RESOURCE CAP_SYS_PTRACE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW CAP_BPF CAP_SYS_RESOURCE CAP_SYS_PTRACE

# Sandboxing
ProtectHome=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

---

## 2. Managing the Edge Service

```bash
# Start edge defense engine
sudo systemctl enable --now sentinel.service

# Inspect active status and in-kernel eBPF attachment
sudo systemctl status sentinel.service
```

