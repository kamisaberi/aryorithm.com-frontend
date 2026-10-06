# Tier 4 Assertion Check: `xinfer-forge` (`forge-cli`)

Verifies that the isolated Python virtual environment (`/opt/sentinel-stack/venv`) executes properly and that `forge-cli` runs without PEP 668 restrictions.

---

## 1. Automated Assertion Commands

```bash
# 1. Verify global wrapper symlink
test -x /usr/local/bin/forge-cli || exit 1

# 2. Verify CLI version execution
/usr/local/bin/forge-cli --version | grep -q "version 2.4.0" || exit 1

# 3. Test PyTorch tensor allocation inside the virtualenv
/opt/sentinel-stack/venv/bin/python3 -c "
import torch
x = torch.randn(1, 32)
assert x.shape == (1, 32)
" || exit 1

# 4. Test ONNX exporter import
/opt/sentinel-stack/venv/bin/python3 -c "import onnx; import onnxruntime" || exit 1
```

---

## 2. Diagnostic Remediation

If the virtual environment is corrupted:
* Re-provision `/opt/sentinel-stack/venv` via `scripts/01_install_dependencies.sh`.

