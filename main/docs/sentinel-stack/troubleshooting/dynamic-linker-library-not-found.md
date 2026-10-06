# Resolving Dynamic Linker Errors: `cannot open shared object file`

When executing installed binaries (`sentinel`, `sentinel-nexus`, or `nexus-ctl`), the dynamic linker may fail to locate newly compiled shared libraries in `/usr/local/lib`.

---

## 1. Symptom

```text
sentinel: error while loading shared libraries: libxinfer.so.1: cannot open shared object file: No such file or directory
nexus-ctl: error while loading shared libraries: libblackbox.so.1: cannot open shared object file: No such file or directory
```

---

## 2. Root Cause Analysis

By default, some minimal Linux distributions do not include `/usr/local/lib` in the trusted dynamic linker search path evaluated by `/etc/ld.so.cache`.

---

## 3. Remediation

### Step 1: Register Custom Linker Configuration
Ensure `/etc/ld.so.conf.d/sentinel.conf` contains the standard installation directories:

```bash
cat << 'EOF' | sudo tee /etc/ld.so.conf.d/sentinel.conf
/usr/local/lib
/usr/local/lib/sentinel-plugins
/usr/local/lib/matrix-deps
EOF
```

### Step 2: Rebuild Dynamic Linker Cache
Run `ldconfig` with root privileges:

```bash
sudo ldconfig
```

### Step 3: Verify Symbol Resolution
Confirm that the dynamic linker resolves all required libraries:

```bash
ldd /usr/local/bin/sentinel
# All dependencies should report absolute paths (e.g. => /usr/local/lib/libxinfer.so.1)
```

