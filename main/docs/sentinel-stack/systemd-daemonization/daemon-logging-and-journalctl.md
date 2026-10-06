# Centralized Daemon Logging & `journalctl` Filtering

`sentinel-stack` integrates service logging directly with the systemd journal (`systemd-journald`), providing centralized log rotation, structured filtering, and rate limiting.

---

## 1. Querying Real-Time Service Logs

### 1. Follow Live Logs Across Both Daemons:
```bash
journalctl -u sentinel -u sentinel-nexus -f
```

### 2. Filter for Active In-Kernel Drops:
```bash
journalctl -u sentinel -g "XDP_DROP" -n 50 --no-pager
```

### 3. Filter by Log Priority (Errors and Critical Only):
```bash
journalctl -u sentinel-nexus -p err..emerg -n 25
```

---

## 2. Automated Log Rotation (`/etc/logrotate.d/sentinel`)

For secondary log files stored in `/var/log/sentinel/`, `sentinel-stack` deploys a logrotate manifest:

```text
/var/log/sentinel/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload sentinel > /dev/null 2>&1 || true
    endscript
}
```

