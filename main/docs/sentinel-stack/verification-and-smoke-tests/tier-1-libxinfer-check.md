# Tier 1 Assertion Check: `libxinfer.so`

Verifies that the foundational AI inference engine is compiled, installed in `/usr/local/lib/`, indexed in `/etc/ld.so.cache`, and exports public API symbols.

---

## 1. Automated Assertion Commands

```bash
# 1. Verify file existence
test -f /usr/local/lib/libxinfer.so || exit 1

# 2. Verify dynamic linker registration
ldconfig -p | grep -q libxinfer.so || exit 1

# 3. Verify public API symbol export
nm -D --defined-only /usr/local/lib/libxinfer.so | grep -q "_ZN6xinfer15InferenceEngine7forwardEv" || exit 1

# 4. Verify C++20 header accessibility
test -f /usr/local/include/xinfer/xinfer.hpp || exit 1
```

---

## 2. Diagnostic Remediation

If `libxinfer.so` is missing from `ldconfig`:
1. Ensure `/usr/local/lib` is registered in `/etc/ld.so.conf.d/sentinel.conf`.
2. Refresh the linker cache:
   ```bash
   sudo ldconfig
   ```

