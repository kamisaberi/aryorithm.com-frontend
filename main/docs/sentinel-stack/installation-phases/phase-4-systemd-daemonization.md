# Phase 4: Systemd Service Daemonization (`04_setup_systemd.sh`)

Phase 4 generates, installs, and starts production Linux systemd service units for `sentinel-nexus` and `blackbox-sentinel`, configuring **Real-Time Round-Robin scheduling (`SCHED_RR`)** and fine-grained POSIX capabilities.

---

## 1. Script Implementation (`scripts/04_setup_systemd.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[Phase 4] Deploying hardened real-time systemd service units..."

# 1. Create System Configuration Directories
mkdir -p /etc/sentinel/certs
mkdir -p /etc/sentinel-nexus/certs
mkdir -p /var/lib/sentinel-nexus/{data,models,forge_datasets}
mkdir -p /var/log/sentinel

# 2. Deploy Nexus Hub Service Unit
cat << 'EOF' > /etc/systemd/system/sentinel-nexus.service
[Unit]
Description=Aryorithm Sentinel-Nexus Central Fleet Command Plane
After=network-online.target local-fs.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/sentinel-nexus --config /etc/sentinel-nexus/nexus.yaml
Restart=always
RestartSec=3s
LimitNOFILE=1048576
LimitMEMLOCK=infinity
CPUSchedulingPolicy=rr
CPUSchedulingPriority=80
Nice=-10

[Install]
WantedBy=multi-user.target
EOF

# 3. Deploy Edge Sentinel Appliance Service Unit
cat << 'EOF' > /etc/systemd/system/sentinel.service
[Unit]
Description=Aryorithm Blackbox-Sentinel Cyber-Physical Edge XDR Appliance
After=network-online.target local-fs.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/sentinel --config /etc/sentinel/sentinel.yaml
Restart=always
RestartSec=3s
LimitNOFILE=1048576
LimitMEMLOCK=infinity
CPUSchedulingPolicy=rr
CPUSchedulingPriority=98
Nice=-20
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_BPF CAP_SYS_RESOURCE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW CAP_BPF CAP_SYS_RESOURCE

[Install]
WantedBy=multi-user.target
EOF

# 4. Reload and Enable Services
systemctl daemon-reload
systemctl enable sentinel-nexus.service
systemctl enable sentinel.service

echo "[+] Phase 4 Complete: Systemd services configured and registered."
```

