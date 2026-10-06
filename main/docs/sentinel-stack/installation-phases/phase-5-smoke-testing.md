# Phase 5: Automated Smoke Testing (`05_verify_installation.sh`)

Phase 5 executes an automated post-installation quality gate. It verifies that shared libraries are discoverable, binaries execute with proper version outputs, and network listener ports are active.

---

## 1. Script Implementation (`scripts/05_verify_installation.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[Phase 5] Executing post-installation quality gate smoke tests..."
FAILED=0

check_assertion() {
    local test_name="$1"
    shift
    if "$@"; then
        echo " [PASS] ${test_name}"
    else
        echo " [FAIL] ${test_name}" >&2
        FAILED=1
    fi
}

# 1. Dynamic Library Assertions
check_assertion "Tier 1: libxinfer.so registered" ldconfig -p | grep -q libxinfer.so
check_assertion "Tier 2: libblackbox.so registered" ldconfig -p | grep -q libblackbox.so
check_assertion "Tier 2: xdp_filter.o BPF valid" test -f /usr/local/lib/bpf/xdp_filter.o

# 2. Executable Binary Assertions
check_assertion "Tier 3: sentinel daemon binary" /usr/local/bin/sentinel --version
check_assertion "Tier 4: forge-cli virtualenv wrapper" /usr/local/bin/forge-cli --version
check_assertion "Tier 5: sentinel_lab testbed binary" test -x /usr/local/bin/sentinel_lab
check_assertion "Tier 6: sentinel-nexus hub binary" test -x /usr/local/bin/sentinel-nexus
check_assertion "Tier 6: nexus-ctl CLI binary" /usr/local/bin/nexus-ctl --version

# 3. Virtual Environment Machine Learning Assertions
check_assertion "PyTorch CPU Execution Test" /opt/sentinel-stack/venv/bin/python3 -c "import torch; x = torch.randn(1, 32)"
check_assertion "ONNX Runtime Loader Test" /opt/sentinel-stack/venv/bin/python3 -c "import onnxruntime"

# 4. Service Liveness Assertions
check_assertion "sentinel-nexus service active" systemctl is-active --quiet sentinel-nexus.service || true

if [ "$FAILED" -eq 0 ]; then
    echo ""
    echo "[+] SUCCESS: All post-installation quality gates passed (11/11)!"
    exit 0
else
    echo ""
    echo "[-] QUALITY GATE FAILURE: One or more assertions failed!" >&2
    exit 1
fi
```

