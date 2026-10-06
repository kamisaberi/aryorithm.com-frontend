# Resolving Python PEP 668 `externally-managed-environment` Errors

On modern Linux operating systems (Ubuntu 24.04 LTS, Ubuntu 26.04 Devel, Debian 12), attempting to install Python packages globally via `pip` fails with a system protection block.

---

## 1. Symptom

```text
error: externally-managed-environment

× This environment is externally managed
╰─> To install Python packages system-wide, try apt install
    python3-xyz, where xyz is the package you are trying to
    install.
```

---

## 2. Why `--break-system-packages` Must Be Avoided

Passing `--break-system-packages` forces `pip` to overwrite files managed by APT, which can break system Python packages used by `cloud-init`, `netplan`, or `gdb`.

---

## 3. The `sentinel-stack` Architectural Solution

`sentinel-stack` never modifies global Python site-packages. All Python runtime dependencies (PyTorch, ONNX, NumPy) are isolated within **`/opt/sentinel-stack/venv`**.

If you encounter this error while testing `xinfer-forge` manually, ensure you execute commands using the virtual environment's pip binary:

```bash
# Correct invocation:
sudo /opt/sentinel-stack/venv/bin/pip install <package_name>

# Running forge-cli directly:
/usr/local/bin/forge-cli --help
```

