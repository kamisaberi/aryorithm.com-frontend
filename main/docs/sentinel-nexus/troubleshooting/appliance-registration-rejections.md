# Debugging Appliance Registration & Enrollment Rejections

When an edge appliance (`blackbox-sentinel`) fails to register with `sentinel-nexus`, the enrollment handshake is rejected at either the TLS connection level or the cryptographic TPM quote verification stage.

---

## 1. Handshake Failure Modes & Root Causes

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Error Trace: gRPC UNAUTHENTICATED (16)                      │
 ├─────────────────────────────────────────────────────────────┤
 │ • Cause 1: Client certificate not signed by trusted Nexus CA│
 │ • Cause 2: Appliance system clock skewed > 300 seconds      │
 │ • Cause 3: Appliance revoked in data/nexus_state.json        │
 └─────────────────────────────────────────────────────────────┘
 ┌─────────────────────────────────────────────────────────────┐
 │ Error Trace: CompleteEnrollment Failed (TPM_REJECTED)       │
 ├─────────────────────────────────────────────────────────────┤
 │ • Cause 1: PCR 0 firmware digest does not match golden image│
 │ • Cause 2: Replay attack detected (Challenge nonce mismatch)│
 │ • Cause 3: Non-monotonic TPM hardware counter regression    │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Diagnostic Procedure

### Step 1: Inspect Nexus Enrollment Logs
Filter the service journal for enrollment traces:

```bash
sudo journalctl -u sentinel-nexus -n 50 --no-pager | grep -i enrollment
```

### Step 2: Validate System Clock Synchronization
Mutual TLS certificate validity and nonce challenge windows depend on synchronized clocks. Check NTP synchronization on both host and edge nodes:

```bash
chronyc tracking
```

Ensure the clock offset is within **$\pm 50\,\text{ms}$**.

### Step 3: Verify the Golden PCR 0 Measurement
If an edge node recently received a motherboard BIOS update, its PCR 0 measurement will shift, triggering quote rejections. 

Update the baseline in `/etc/sentinel-nexus/nexus.yaml`:

```yaml
enrollment:
  trusted_pcr0_baselines:
    - "e9a2c31e847b2c94b13a7b41e2d9010000000000000000000000000000000000" # Old BIOS
    - "8a2f3c1e42c994b13a7b41e2d901000000000000000000000000000000000000" # Updated BIOS
```

Reload Nexus configuration with `sudo systemctl reload sentinel-nexus`.

