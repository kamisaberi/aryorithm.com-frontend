# Hardened Systemd Service Deployment

In production environments, `sentinel-nexus` runs as an automated, hardened systemd service configured for maximum file descriptors and process resilience.

---

## 1. Systemd Service Unit (`/etc/systemd/system/sentinel-nexus.service`)

```ini
[Unit]
Description=Aryorithm Sentinel-Nexus Fleet Command Plane & Collective Defense Grid
Documentation=https://docs.aryorithm.com/nexus/
After=network-online.target local-fs.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root

# Executable & Configuration
ExecStart=/usr/local/bin/sentinel-nexus --config /etc/sentinel-nexus/nexus.yaml
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=3s

# High-Concurrency Network Tuning (Supporting 5,000 Appliances)
LimitNOFILE=1048576
LimitNPROC=65536
LimitMEMLOCK=infinity

# CPU Scheduling & Priority
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

## 2. Activation Commands

```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel-nexus
sudo systemctl start sentinel-nexus
sudo systemctl status sentinel-nexus
```

