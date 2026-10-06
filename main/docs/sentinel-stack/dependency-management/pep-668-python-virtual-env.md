# PEP 668 Compliance: Isolated `/opt/sentinel-stack/venv`

Modern Linux distributions enforce **Python Enhancement Proposal 668 (PEP 668)**, which prevents `pip` from installing packages into the system-wide global Python environment (`externally-managed-environment`).

`sentinel-stack` provides strict PEP 668 compliance by isolating the machine learning runtime at **`/opt/sentinel-stack/venv`**.

---

## 1. Why Avoid `--break-system-packages`?

Passing `--break-system-packages` to global `pip` overrides OS safety guards, overwriting system Python modules used by essential utilities (`software-properties-common`, `cloud-init`, and `gdb`). This can destabilize the host operating system.

---

## 2. Virtual Environment Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ HOST OPERATING SYSTEM (/usr/lib/python3.12/)                │
 │  - System APT packages untouched and protected              │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Complete Isolation Boundary
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ ISOLATED RUNTIME: /opt/sentinel-stack/venv/                 │
 │  - Python 3.12 Standalone Virtual Environment               │
 │  - torch (CPU / CUDA optimized wheels)                      │
 │  - onnx (Opset 17 compiler) & onnxruntime                   │
 │  - numpy, pyyaml, requests                                  │
 └──────────────────────────────┬──────────────────────────────┘
                                │ System Symlink
                                ▼
 [ /usr/local/bin/forge-cli ] ──► Executes via /opt/sentinel-stack/venv/bin/python3
```

---

## 3. Global Executable Wrappers

To allow non-root users and systemd units to call `forge-cli` without activating the virtual environment first, `sentinel-stack` links a shebang wrapper to `/usr/local/bin/forge-cli`:

```bash
#!/usr/bin/env bash
# /usr/local/bin/forge-cli
exec /opt/sentinel-stack/venv/bin/python3 -m forge.cli "$@"
```

