# Clean Uninstallation & System Purge Guide

If an appliance is being decommissioned or repurposed, `sentinel-stack` provides a clean uninstallation target that stops all services, removes installed binaries, shared libraries, headers, and restores default OS dynamic linker states.

---

## 1. Execution Command

Execute the uninstaller:

```bash
cd /opt/sentinel-stack
sudo make uninstall
```

---

## 2. Uninstallation Actions Executed

```text
 1. SERVICE TERMINATION:
    • Stops sentinel-nexus.service and sentinel.service
    • Disables systemd service units and unlinks /etc/systemd/system/sentinel*
    • Runs systemctl daemon-reload
              │
              ▼
 2. BINARY & LIBRARY REMOVAL:
    • Removes /usr/local/bin/{sentinel, sentinel-nexus, nexus-ctl, sentinel_lab, forge-cli}
    • Removes /usr/local/lib/libxinfer* and libblackbox*
    • Removes /usr/local/lib/bpf/xdp_filter.o
    • Removes /usr/local/lib/sentinel-plugins/
    • Removes /usr/local/include/{xinfer, blackbox}
              │
              ▼
 3. RUNTIME & LINKER CLEANUP:
    • Removes /etc/ld.so.conf.d/sentinel.conf
    • Runs ldconfig to refresh system cache
    • Removes isolated virtual environment /opt/sentinel-stack/venv/
```

---

## 3. Preserving Configuration (Optional)

By default, `make uninstall` preserves configuration files in `/etc/sentinel/` and state databases in `/var/lib/sentinel-nexus/`. To purge all configuration and logs permanently:

```bash
sudo make purge-all
```

