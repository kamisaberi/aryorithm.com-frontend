# Tier 6 Assertion Check: `sentinel-nexus` & `nexus-ctl`

Verifies that the central command daemon and operations CLI execute, bind network listener ports, and authenticate commands.

---

## 1. Automated Assertion Commands

```bash
# 1. Verify CLI executable
test -x /usr/local/bin/nexus-ctl || exit 1

# 2. Verify CLI version execution
/usr/local/bin/nexus-ctl --version | grep -q "nexus-ctl version 2.4.0" || exit 1

# 3. Verify service daemon binary
test -x /usr/local/bin/sentinel-nexus || exit 1

# 4. Verify systemd service status
systemctl is-active --quiet sentinel-nexus.service || exit 1

# 5. Verify network listener ports (50051 gRPC, 9443 REST, 9444 SSE)
ss -tulpn | grep -q ":50051" || exit 1
ss -tulpn | grep -q ":9443" || exit 1
ss -tulpn | grep -q ":9444" || exit 1
```

---

## 2. Diagnostic Remediation

If port 50051 or 9443 is not listening:
* Check systemd service logs: `journalctl -u sentinel-nexus -n 50 --no-pager`.

