# Diagnosing Systemd Service Launch Failures (`status=203/EXEC`, `status=1`)

If `sentinel-nexus.service` or `sentinel.service` fails to start during Phase 4, inspect the systemd exit code to pinpoint the root cause.

---

## 1. `status=203/EXEC` (Executable Not Found or Permissions Denied)

### Symptom:
```text
● sentinel.service - Aryorithm Blackbox-Sentinel Cyber-Physical Edge XDR Appliance
     Loaded: loaded (/etc/systemd/system/sentinel.service; enabled)
     Active: failed (Result: exit-code)
    Process: 18402 ExecStart=/usr/local/bin/sentinel (code=exited, status=203/EXEC)
```

### Cause:
The binary `/usr/local/bin/sentinel` does not exist, was not granted executable permissions, or is missing the execute bit (`chmod +x`).

### Remediation:
```bash
test -f /usr/local/bin/sentinel && sudo chmod +x /usr/local/bin/sentinel
```

---

## 2. `status=1/FAILURE` (Configuration File Missing or Invalid)

### Symptom:
```text
Process: 18402 ExecStart=/usr/local/bin/sentinel (code=exited, status=1/FAILURE)
```

### Remediation:
Inspect detailed failure messages using `journalctl`:

```bash
sudo journalctl -u sentinel -xe --no-pager
```

Check for missing runtime configuration files:
* If the error reports `Failed to open /etc/sentinel/sentinel.yaml`:
  ```bash
  sudo mkdir -p /etc/sentinel
  sudo cp /opt/sentinel-stack/src/sentinel/configs/sentinel.yaml /etc/sentinel/sentinel.yaml
  ```
* Validate YAML syntax:
  ```bash
  sentinel --validate-config /etc/sentinel/sentinel.yaml
  ```

---

## 3. `status=217/USER` or Permission Denied on `/dev/tpmrm0`

Ensure the service user has permission to access the TPM 2.0 Resource Manager:

```bash
sudo usermod -aG tss root
sudo chmod 660 /dev/tpmrm0
```

