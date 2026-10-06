# Verifying the Installed Stack (`sudo make verify`)

After running `install.sh`, execute the automated verification test suite to ensure that all shared libraries, in-kernel BPF filters, executables, and network listeners are healthy.

---

## 1. Running the Verification Suite

Run the smoke test harness:

```bash
sudo make verify
# Or execute directly:
sudo ./scripts/05_verify_installation.sh
```

---

## 2. Expected Verification Output

```text
================================================================================
                 SENTINEL-STACK POST-BUILD QUALITY GATE
================================================================================
 [PASS] Tier 1: /usr/local/lib/libxinfer.so found in ldconfig cache.
 [PASS] Tier 2: /usr/local/lib/libblackbox.so found in ldconfig cache.
 [PASS] Tier 2: /usr/local/lib/bpf/xdp_filter.o valid BPF ELF bytecode.
 [PASS] Tier 3: /usr/local/bin/sentinel binary executable (v2.4.0 verified).
 [PASS] Tier 4: /usr/local/bin/forge-cli functional in /opt/sentinel-stack/venv.
 [PASS] Tier 5: /usr/local/bin/sentinel_lab research testbed executable.
 [PASS] Tier 6: /usr/local/bin/sentinel-nexus command daemon active.
 [PASS] Tier 6: /usr/local/bin/nexus-ctl operations CLI functional.

------------------------------ NETWORK SERVICES --------------------------------
 [PASS] gRPC Fleet Service      : Listening on 0.0.0.0:50051 (mTLS Active)
 [PASS] Web Command Center      : Listening on 0.0.0.0:9443 (HTTPS)
 [PASS] Real-Time SSE Stream    : Listening on 0.0.0.0:9444 (HTTP/1.1)

================================================================================
Status: ALL QUALITY GATES PASSED (11/11). System is operational.
================================================================================
```

