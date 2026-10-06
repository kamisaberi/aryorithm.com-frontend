# Production Unit Configuration: `sentinel-nexus.service`

The `sentinel-nexus.service` unit manages the Tier 6 central fleet command hub, binding gRPC port **50051**, HTTPS port **9443**, and SSE port **9444**.

---

## 1. Unit File Definition (`/etc/systemd/system/sentinel-nexus.service`)

```ini
[Unit]
Description=Aryorithm Sentinel-Nexus Central Fleet Command Plane & Collective Defense Grid
Documentation=https://docs.aryorithm.com/nexus/
After=network-online.target local-fs.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root

# Binary Invocation & Configuration Manifest
ExecStart=/usr/local/bin/sentinel-nexus --config /etc/sentinel-nexus/nexus.yaml
ExecReload=/bin/kill -HUP $MAINPID

# Process Lifecycle
Restart=always
RestartSec=3s
KillMode=mixed
TimeoutStopSec=10s

# Resource Limits for High-Density Fleet Management (5,000 Nodes)
LimitNOFILE=1048576
LimitNPROC=65536
LimitMEMLOCK=infinity

# Scheduler & Priority Tuning
CPUSchedulingPolicy=rr
CPUSchedulingPriority=80
Nice=-10
OOMScoreAdjust=-500

# Security Hardening Sandbox
ProtectHome=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

---

## 2. Managing the Service

```bash
# Enable on system boot and start immediately
sudo systemctl enable --now sentinel-nexus.service

# Query real-time execution status
sudo systemctl status sentinel-nexus.service

# Reload configuration without restarting process
sudo systemctl reload sentinel-nexus.service
```

