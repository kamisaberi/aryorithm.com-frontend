# Tier 4 Build Mechanics: `xinfer-forge` (`forge-cli`)

`xinfer-forge` is the continual active learning daemon. To comply with PEP 668, it is installed inside `/opt/sentinel-stack/venv` and symlinked to `/usr/local/bin/forge-cli`.

---

## 1. Installation Commands

```bash
cd /opt/sentinel-stack/src/forge

# Install package into the isolated virtual environment
/opt/sentinel-stack/venv/bin/pip install .

# Create global binary symlink
ln -sf /opt/sentinel-stack/venv/bin/forge-cli /usr/local/bin/forge-cli
chmod +x /usr/local/bin/forge-cli
```

---

## 2. Verification Assertion

Verify that `forge-cli` executes properly using the virtual environment's Python interpreter:

```bash
forge-cli --version
# Expected Output: xinfer-forge version 2.4.0 (Aryorithm Continual AI Engine)
```

