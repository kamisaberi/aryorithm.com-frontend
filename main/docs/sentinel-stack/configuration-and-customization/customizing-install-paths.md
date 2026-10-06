# Customizing System Installation Prefixes (`/usr/local` vs. `/opt`)

While `sentinel-stack` defaults to standard FHS paths (`/usr/local/bin`, `/usr/local/lib`), enterprise distributions or immutable root environments often require relocating the stack into a self-contained directory (e.g., `/opt/aryorithm/`).

---

## 1. Modifying the Installation Prefix

Edit `configs/stack.yaml`:

```yaml
global:
  install_prefix: "/opt/aryorithm"
```

---

## 2. Architectural Adjustments Executed Automatically

When `install_prefix` is modified, the installer updates several system configurations:

1. **CMake Target Flags:** Passes `-DCMAKE_INSTALL_PREFIX=/opt/aryorithm` across all six tiers.
2. **Dynamic Linker Cache:** Registers `/etc/ld.so.conf.d/aryorithm.conf` containing:
   ```text
   /opt/aryorithm/lib
   /opt/aryorithm/lib/sentinel-plugins
   ```
3. **Environment `PATH` Profile:** Installs `/etc/profile.d/aryorithm.sh` to add the custom binary path to all user and service shells:
   ```bash
   export PATH="/opt/aryorithm/bin:${PATH}"
   ```
4. **Systemd Service Paths:** Updates `ExecStart` directives to reference `/opt/aryorithm/bin/sentinel-nexus` and `/opt/aryorithm/bin/sentinel`.

