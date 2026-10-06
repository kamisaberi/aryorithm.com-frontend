# Verification Suite Overview & Smoke-Testing Matrix

Phase 5 of the installer executes `scripts/05_verify_installation.sh`, an automated quality gate that runs 11 non-destructive smoke-test assertions across all six compiled runtime tiers.

---

## 1. Post-Build Smoke-Testing Matrix

| Assertion ID | Evaluation Target | Tier | Validation Method | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **AST-01** | `libxinfer.so` | Tier 1 | `ldconfig -p \| grep libxinfer` | Registered in system linker cache |
| **AST-02** | `libblackbox.so` | Tier 2 | `ldconfig -p \| grep libblackbox` | Registered in system linker cache |
| **AST-03** | `xdp_filter.o` | Tier 2 | `llvm-objdump -h /usr/local/lib/bpf/xdp_filter.o` | Valid BPF ELF bytecode |
| **AST-04** | `sentinel` | Tier 3 | `/usr/local/bin/sentinel --version` | Returns version string `2.4.0` |
| **AST-05** | Dissector Plugins| Tier 3 | `ls -1 /usr/local/lib/sentinel-plugins/*.so` | $\ge 25$ plugins discoverable |
| **AST-06** | `forge-cli` | Tier 4 | `/usr/local/bin/forge-cli --version` | Wrapper functional in `/opt/sentinel-stack/venv` |
| **AST-07** | PyTorch Runtime | Tier 4 | `python3 -c "import torch; torch.randn(1, 32)"` | Allocates tensor without errors |
| **AST-08** | `sentinel_lab` | Tier 5 | `/usr/local/bin/sentinel_lab --help` | Research testbed binary executable |
| **AST-09** | `sentinel-nexus` | Tier 6 | `systemctl is-active sentinel-nexus.service` | Active and running under systemd |
| **AST-10** | `nexus-ctl` | Tier 6 | `/usr/local/bin/nexus-ctl --version` | Operations CLI tool functional |
| **AST-11** | Service Ports | Tier 6 | `ss -tulpn \| grep -E '50051\|9443\|9444'` | All three listener sockets active |

---

## 2. Invocation

Run the verification harness at any time:

```bash
sudo make verify
# Or run the script directly:
sudo /opt/sentinel-stack/scripts/05_verify_installation.sh
```

---

## 3. Exit Code Semantics

* `0`: **All 11 quality gates passed.** System is operational.
* `1`: **One or more assertions failed.** Details are logged to `/var/log/sentinel_install.log`.

